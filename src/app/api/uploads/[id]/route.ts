import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { id } = await params
  const email = session.user.email

  const { data: upload, error } = await supabaseAdmin
    .from("uploads")
    .select("storage_path")
    .eq("id", id)
    .eq("user_email", email)
    .single()

  if (error || !upload) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Delete from storage (ignore errors — file may not exist)
  await supabaseAdmin.storage.from("uploads").remove([upload.storage_path])

  // Delete the row
  await supabaseAdmin.from("uploads").delete().eq("id", id)

  return NextResponse.json({ ok: true })
}
