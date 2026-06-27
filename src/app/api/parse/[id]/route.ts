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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { id } = await params
  const email = session.user.email

  const { data: upload, error } = await supabaseAdmin
    .from("uploads")
    .select("*")
    .eq("id", id)
    .eq("user_email", email)
    .single()

  if (error || !upload) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (upload.parse_status === "processing") return NextResponse.json({ error: "Already processing" }, { status: 409 })

  await supabaseAdmin.from("uploads").update({ parse_status: "processing" }).eq("id", id)

  try {
    // Download file from storage
    const { data: fileData, error: dlErr } = await supabaseAdmin.storage
      .from("uploads")
      .download(upload.storage_path)

    if (dlErr || !fileData) throw new Error("Failed to download file")

    const bytes = await fileData.arrayBuffer()
    const periodMonth = upload.period_month ?? firstOfMonth()

    if (upload.upload_type === "ibkr_screenshot") {
      const base64 = Buffer.from(bytes).toString("base64")
      const mediaType = upload.file_name.endsWith(".png") ? "image/png" : "image/jpeg"
      const result = await parseIBKRScreenshot(base64, mediaType)

      // Upsert net worth snapshot
      await supabaseAdmin.from("net_worth_snapshots").upsert({
        user_email: email,
        snapshot_month: periodMonth,
        investment_value: result.portfolio_value,
        cash_value: result.cash,
        source_upload_ids: [id],
      }, { onConflict: "user_email,snapshot_month", ignoreDuplicates: false })

      await supabaseAdmin.from("uploads").update({ parse_status: "done", parse_result: result }).eq("id", id)
      return NextResponse.json({ ok: true, result })
    }

    if (upload.upload_type === "bank_statement") {
      let parsed: Awaited<ReturnType<typeof parseBankStatementCSV>>

      const isCSV = upload.file_name.endsWith(".csv") || upload.file_name.endsWith(".xlsx") || upload.file_name.endsWith(".xls")
      if (isCSV) {
        const text = new TextDecoder().decode(bytes)
        parsed = await parseBankStatementCSV(text)
      } else {
        const base64 = Buffer.from(bytes).toString("base64")
        const mediaType = upload.file_name.endsWith(".png") ? "image/png" : "image/jpeg"
        parsed = await parseBankStatementImage(base64, mediaType)
      }

      // Categorise
      const expenseTransactions = parsed.transactions.filter(t => !t.is_income)
      const categories = await categoriseTransactions(expenseTransactions.map(t => ({ description: t.description, amount: t.amount })))

      const txRows = parsed.transactions.map((t, i) => ({
        user_email: email,
        month: periodMonth,
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: t.is_income ? "Income" : (categories[expenseTransactions.indexOf(t)] ?? "Other"),
        is_income: t.is_income,
        source_upload_id: id,
      }))

      if (txRows.length > 0) {
        await supabaseAdmin.from("transactions").insert(txRows)
      }

      // Update monthly spend summary
      const totalSpend = expenseTransactions.reduce((s, t) => s + t.amount, 0)
      await supabaseAdmin.from("spending_months").upsert({
        user_email: email,
        month: periodMonth,
        total_spend: totalSpend,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_email,month" })

      await supabaseAdmin.from("uploads").update({ parse_status: "done", parse_result: parsed }).eq("id", id)
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
