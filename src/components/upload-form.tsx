"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

export function UploadForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: "success" | "warn" | "error" } | null>(null)
  const [uploadType, setUploadType] = useState("bank_statement")
  const [periodMonth, setPeriodMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  })
  const [autoParse, setAutoParse] = useState(true)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setMessage(null)

    const fd = new FormData()
    fd.append("file", file)
    fd.append("upload_type", uploadType)
    fd.append("period_month", periodMonth)

    try {
      const res = await fetch("/api/uploads", { method: "POST", body: fd })
      const data = await res.json()

      if (data.duplicate) {
        setMessage({ text: `Already uploaded — status: ${data.parse_status}. No duplicate created.`, type: "warn" })
        return
      }

      if (data.period_conflict) {
        setMessage({ text: `Note: another ${uploadType} exists for this month. Uploaded anyway — check for overlap.`, type: "warn" })
      } else if (autoParse) {
        setMessage({ text: "Uploaded. Parsing…", type: "success" })
      } else {
        setMessage({ text: "Uploaded successfully.", type: "success" })
      }

      if (autoParse && data.upload_id) {
        const parseRes = await fetch(`/api/parse/${data.upload_id}`, { method: "POST" })
        const parseData = await parseRes.json()
        if (parseData.ok) {
          setMessage({
            text: `Parsed.${parseData.transaction_count ? ` ${parseData.transaction_count} transactions extracted.` : " Net worth snapshot saved."}`,
            type: "success",
          })
        } else {
          setMessage({ text: `Parse failed: ${parseData.error}`, type: "error" })
        }
      }

      router.refresh()
      if (fileRef.current) fileRef.current.value = ""
      setSelectedFile(null)
    } catch (err) {
      setMessage({ text: `Failed: ${err instanceof Error ? err.message : "unknown error"}`, type: "error" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={submit} className="glass glow-card rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
      <h2 className="text-sm font-semibold text-white/70">New Upload</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-white/40">Type</label>
          <select
            value={uploadType}
            onChange={e => setUploadType(e.target.value)}
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
          >
            <option value="bank_statement">Bank Statement</option>
            <option value="ibkr_screenshot">IBKR Screenshot</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-white/40">Period</label>
          <input
            type="month"
            value={periodMonth.slice(0, 7)}
            onChange={e => setPeriodMonth(e.target.value + "-01")}
            className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-white/40">File</label>
        <div
          className="rounded-xl border border-dashed border-white/[0.12] p-4 text-center cursor-pointer hover:border-white/[0.2] hover:bg-white/[0.03] transition-all"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
            required
            className="hidden"
            onChange={e => setSelectedFile(e.target.files?.[0]?.name ?? null)}
          />
          {selectedFile ? (
            <p className="text-sm text-white/70 font-medium">{selectedFile}</p>
          ) : (
            <p className="text-sm text-white/40">Tap to select file</p>
          )}
          <p className="text-xs text-white/20 mt-1">CSV, Excel, PNG, JPG, WEBP</p>
        </div>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer group">
        <div
          className={`w-9 h-5 rounded-full relative transition-all duration-200 ${autoParse ? "" : "opacity-40"}`}
          style={{ background: autoParse ? "linear-gradient(135deg, #7c3aed, #3b82f6)" : "rgba(255,255,255,0.12)" }}
          onClick={() => setAutoParse(v => !v)}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm ${autoParse ? "left-4" : "left-0.5"}`}
          />
        </div>
        <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors">Auto-parse after upload</span>
      </label>

      {message && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: message.type === "error"
              ? "rgba(239,68,68,0.12)"
              : message.type === "warn"
              ? "rgba(245,158,11,0.12)"
              : "rgba(16,185,129,0.12)",
            border: `1px solid ${message.type === "error" ? "rgba(239,68,68,0.25)" : message.type === "warn" ? "rgba(245,158,11,0.25)" : "rgba(16,185,129,0.25)"}`,
            color: message.type === "error" ? "#fca5a5" : message.type === "warn" ? "#fcd34d" : "#6ee7b7",
          }}
        >
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={uploading}
        className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-all duration-200"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.6), rgba(59,130,246,0.5))", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        {uploading ? "Uploading…" : "Upload"}
      </button>
    </form>
  )
}
