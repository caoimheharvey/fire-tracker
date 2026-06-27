import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { sha256 } from "@/lib/utils"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const email = session.user.email
  const formData = await req.formData()
  const file = formData.get("file") as File
  const uploadType = formData.get("upload_type") as string
  const periodMonth = formData.get("period_month") as string // YYYY-MM-DD

  if (!file || !uploadType) {
    return NextResponse.json({ error: "Missing file or upload_type" }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const hash = await sha256(bytes)

  // Dedup check
  const { data: existing } = await supabaseAdmin
    .from("uploads")
    .select("id, parse_status")
    .eq("user_email", email)
    .eq("content_hash", hash)
    .single()

  if (existing) {
    return NextResponse.json({ duplicate: true, upload_id: existing.id, parse_status: existing.parse_status })
  }

  // Also check for same period_month + same type (warn, don't block)
  let periodConflict = false
  if (periodMonth) {
    const { data: sameMonth } = await supabaseAdmin
      .from("uploads")
      .select("id")
      .eq("user_email", email)
      .eq("upload_type", uploadType)
      .eq("period_month", periodMonth)
    periodConflict = (sameMonth?.length ?? 0) > 0
  }

  // Upload to Supabase Storage
  const storagePath = `${email}/${uploadType}/${periodMonth ?? "unknown"}/${Date.now()}-${file.name}`
  const { error: storageErr } = await supabaseAdmin.storage
    .from("uploads")
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (storageErr) {
    return NextResponse.json({ error: storageErr.message }, { status: 500 })
  }

  const { data: upload, error: dbErr } = await supabaseAdmin
    .from("uploads")
    .insert({
      user_email: email,
      upload_type: uploadType,
      file_name: file.name,
      storage_path: storagePath,
      content_hash: hash,
      period_month: periodMonth || null,
      parse_status: "pending",
    })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ upload_id: upload.id, period_conflict: periodConflict })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from("uploads")
    .select("*")
    .eq("user_email", session.user.email)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
