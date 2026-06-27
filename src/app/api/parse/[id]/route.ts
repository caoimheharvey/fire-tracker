import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  parseIBKRScreenshot,
  parseBankStatementCSV,
  parseBankStatementImage,
  categoriseTransactions,
} from "@/lib/anthropic"
import { NextRequest, NextResponse } from "next/server"
import { firstOfMonth } from "@/lib/utils"
import * as XLSX from "xlsx"

// Give Vercel 60s — Anthropic vision calls can be slow
export const maxDuration = 60

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set in environment variables" }, { status: 500 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set in environment variables" }, { status: 500 })
  }

  const { id } = await params
  const email = session.user.email

  const { data: upload, error } = await supabaseAdmin
    .from("uploads")
    .select("*")
    .eq("id", id)
    .eq("user_email", email)
    .single()

  if (error || !upload) return NextResponse.json({ error: "Upload not found" }, { status: 404 })
  if (upload.parse_status === "processing") return NextResponse.json({ error: "Already processing" }, { status: 409 })

  await supabaseAdmin.from("uploads").update({ parse_status: "processing", parse_error: null }).eq("id", id)

  try {
    const { data: fileData, error: dlErr } = await supabaseAdmin.storage
      .from("uploads")
      .download(upload.storage_path)

    if (dlErr || !fileData) {
      throw new Error(`Storage download failed: ${dlErr?.message ?? "file not found"}. Check the 'uploads' bucket exists in Supabase Storage.`)
    }

    const bytes = await fileData.arrayBuffer()
    const periodMonth = upload.period_month ?? firstOfMonth()
    const ext = upload.file_name.split(".").pop()?.toLowerCase() ?? ""

    // ── IBKR Screenshot ────────────────────────────────────────────────
    if (upload.upload_type === "ibkr_screenshot") {
      if (!["png", "jpg", "jpeg", "webp"].includes(ext)) {
        throw new Error(`IBKR screenshots must be image files (PNG, JPG, WEBP). Got: .${ext}`)
      }
      const base64 = Buffer.from(bytes).toString("base64")
      const mediaType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg"
      const result = await parseIBKRScreenshot(base64, mediaType)

      await supabaseAdmin.from("net_worth_snapshots").upsert({
        user_email: email,
        snapshot_month: periodMonth,
        investment_value: result.portfolio_value ?? 0,
        cash_value: result.cash ?? 0,
        source_upload_ids: [id],
      }, { onConflict: "user_email,snapshot_month" })

      await supabaseAdmin.from("uploads").update({ parse_status: "done", parse_result: result }).eq("id", id)
      return NextResponse.json({ ok: true, result })
    }

    // ── Bank Statement ─────────────────────────────────────────────────
    if (upload.upload_type === "bank_statement") {
      let parsed: Awaited<ReturnType<typeof parseBankStatementCSV>>

      if (["xlsx", "xls"].includes(ext)) {
        // Convert Excel → CSV string using xlsx library
        const workbook = XLSX.read(bytes, { type: "array" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const csv = XLSX.utils.sheet_to_csv(sheet)
        parsed = await parseBankStatementCSV(csv)

      } else if (ext === "csv") {
        const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
        parsed = await parseBankStatementCSV(text)

      } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
        const base64 = Buffer.from(bytes).toString("base64")
        const mediaType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg"
        parsed = await parseBankStatementImage(base64, mediaType)

      } else {
        throw new Error(`Unsupported file type: .${ext}. Use CSV, XLSX, or an image (PNG/JPG).`)
      }

      if (!parsed.transactions || parsed.transactions.length === 0) {
        throw new Error("No transactions found in file. Make sure the file contains transaction data.")
      }

      // Categorise expenses
      const expenses = parsed.transactions.filter(t => !t.is_income)
      const categories = expenses.length > 0
        ? await categoriseTransactions(expenses.map(t => ({ description: t.description, amount: t.amount })))
        : []

      let expenseIdx = 0
      const txRows = parsed.transactions.map(t => ({
        user_email: email,
        month: periodMonth,
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: t.is_income ? "Income" : (categories[expenseIdx++] ?? "Other"),
        is_income: t.is_income,
        source_upload_id: id,
      }))

      if (txRows.length > 0) {
        const { error: txErr } = await supabaseAdmin.from("transactions").insert(txRows)
        if (txErr) throw new Error(`Failed to save transactions: ${txErr.message}`)
      }

      const totalSpend = expenses.reduce((s, t) => s + t.amount, 0)
      await supabaseAdmin.from("spending_months").upsert({
        user_email: email,
        month: periodMonth,
        total_spend: totalSpend,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_email,month" })

      await supabaseAdmin.from("uploads").update({ parse_status: "done", parse_result: { transaction_count: txRows.length, period_start: parsed.period_start, period_end: parsed.period_end } }).eq("id", id)
      return NextResponse.json({ ok: true, transaction_count: txRows.length })
    }

    await supabaseAdmin.from("uploads").update({ parse_status: "done" }).eq("id", id)
    return NextResponse.json({ ok: true })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabaseAdmin.from("uploads").update({ parse_status: "failed", parse_error: msg }).eq("id", id)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
