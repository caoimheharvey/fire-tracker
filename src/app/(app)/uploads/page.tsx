import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { UploadForm } from "@/components/upload-form"
import { ParseButton } from "@/components/parse-button"
import { DeleteUploadButton } from "@/components/delete-upload-button"

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  done: { bg: "rgba(16,185,129,0.12)", text: "#6ee7b7", label: "Parsed" },
  failed: { bg: "rgba(239,68,68,0.12)", text: "#fca5a5", label: "Failed" },
  processing: { bg: "rgba(245,158,11,0.12)", text: "#fcd34d", label: "Processing" },
  pending: { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.4)", label: "Pending" },
}

const TYPE_LABELS: Record<string, string> = {
  ibkr_screenshot: "IBKR",
  bank_statement: "Bank",
  other: "Other",
}

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Uploads</h1>
        <p className="text-sm text-white/40 mt-0.5">IBKR screenshots and bank statements. Upload monthly to keep data current.</p>
      </div>

      <UploadForm />

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Upload History</h2>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>

        {!uploads?.length ? (
          <div className="glass glow-card rounded-2xl p-8 text-center">
            <p className="text-sm text-white/30">No uploads yet. Start by uploading your IBKR screenshot or bank statement above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {uploads.map(u => {
              const status = STATUS_STYLES[u.parse_status] ?? STATUS_STYLES.pending
              return (
                <div key={u.id} className="glass glow-card rounded-xl px-4 py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-xs font-medium px-1.5 py-0.5 rounded-md flex-shrink-0"
                        style={{ background: "rgba(124,58,237,0.2)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.3)" }}
                      >
                        {TYPE_LABELS[u.upload_type] ?? u.upload_type}
                      </span>
                      <p className="text-sm text-white/75 truncate">{u.file_name}</p>
                    </div>
                    <p className="text-xs text-white/30">
                      {u.period_month ? u.period_month.slice(0, 7) : "no period"} · {new Date(u.created_at).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {u.parse_status === "failed" && u.parse_error && (
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: "#fca5a5" }}>
                        {u.parse_error}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: status.bg, color: status.text }}>
                      {status.label}
                    </span>
                    {(u.parse_status === "pending" || u.parse_status === "failed") && <ParseButton uploadId={u.id} />}
                    <DeleteUploadButton uploadId={u.id} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
