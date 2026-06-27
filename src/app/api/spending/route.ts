import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const url = new URL(req.url)
  const month = url.searchParams.get("month")

  const query = supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("user_email", session.user.email)
    .order("date", { ascending: false })
    .limit(500)

  if (month) query.eq("month", month)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
