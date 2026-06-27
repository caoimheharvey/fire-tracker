import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { data } = await supabaseAdmin
    .from("fire_config")
    .select("*")
    .eq("user_email", session.user.email)
    .single()

  return NextResponse.json(data ?? null)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from("fire_config")
    .upsert({ ...body, user_email: session.user.email, updated_at: new Date().toISOString() }, { onConflict: "user_email" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
