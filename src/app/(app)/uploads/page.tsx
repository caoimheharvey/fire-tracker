import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { UploadForm } from "@/components/upload-form"

export default async function UploadsPage() {
  const session = await auth()
  const email = session!.user!.email!

  const { data: uploads } = await supabaseAdmin
    .from("uploads")
    .select("*")
    .eq("user_email", email)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="p-8 space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold">Uploads</h1>
      <UploadForm />
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Upload History</h2>
        {!uploads?.length && (
          <p className="text-sm text-zinc-600">No uploads yet.</p>
        )}
        <div className="space-y-2">
          {uploads?.map(u => (
            <UploadRow key={u.id} upload={u} />
          ))}
        </div>
      </div>
    </div>
  )
}

function UploadRow({ upload }: { upload: Record<string, string> }) {
  const statusColor: Record<string, string> = {
    done: "text-zinc-400",
    failed: "text-red-400",
    processing: "text-amber-400",
    pending: "text-zinc-500",
  }
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-zinc-200">{upload.file_name}</p>
        <p className="text-xs text-zinc-500">{upload.upload_type} · {upload.period_month ?? "no period"} · {new Date(upload.created_at).toLocaleDateString()}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${statusColor[upload.parse_status] ?? "text-zinc-500"}`}>
          {upload.parse_status}
        </span>
        {upload.parse_status === "pending" && (
          <ParseButton uploadId={upload.id} />
        )}
      </div>
    </div>
  )
}

function ParseButton({ uploadId }: { uploadId: string }) {
  return (
    <form action={`/api/parse/${uploadId}`} method="POST">
      <button type="submit" className="rounded px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 transition-colors">
        Parse
      </button>
    </form>
  )
}
