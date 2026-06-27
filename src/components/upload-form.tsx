"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

export function UploadForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
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
        setMessage({ text: `Duplicate: this file was already uploaded (status: ${data.parse_status})`, type: "warn" })
        return
      }

      if (data.period_conflict) {
        setMessage({ text: `Note: another ${uploadType} already exists for this month. Uploaded anyway.`, type: "warn" })
      } else {
        setMessage({ text: "Uploaded successfully.", type: "success" })
      }

      if (autoParse && data.upload_id) {
        setMessage({ text: "Parsing…", type: "success" })
        const parseRes = await fetch(`/api/parse/${data.upload_id}`, { method: "POST" })
        const parseData = await parseRes.json()
        if (parseData.ok) {
          setMessage({ text: `Parsed successfully.${parseData.transaction_count ? ` ${parseData.transaction_count} transactions extracted.` : ""}`, type: "success" })
        } else {
          setMessage({ text: `Parse failed: ${parseData.error}`, type: "error" })
        }
      }

      router.refresh()
      if (fileRef.current) fileRef.current.value = ""
    } catch (err) {
      setMessage({ text: `Upload failed: ${err instanceof Error ? err.message : "unknown error"}`, type: "error" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-zinc-800 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-zinc-300">New Upload</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Type</label>
          <select value={uploadType} onChange={e => setUploadType(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
            <option value="bank_statement">Bank Statement</option>
            <option value="ibkr_screenshot">IBKR Screenshot</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Period (month)</label>
          <input
            type="month"
            value={periodMonth.slice(0, 7)}
            onChange={e => setPeriodMonth(e.target.value + "-01")}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">File</label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
          required
          className="w-full text-sm text-zinc-400 file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-300 hover:file:bg-zinc-700"
        />
        <p className="text-xs text-zinc-600 mt-1">Accepted: CSV, Excel, PNG, JPG, WEBP</p>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
        <input type="checkbox" checked={autoParse} onChange={e => setAutoParse(e.target.checked)} className="rounded" />
        Automatically parse after upload
      </label>
      {message && (
        <div className={`rounded-lg px-3 py-2 text-sm ${
          message.type === "success" ? "bg-zinc-900 text-zinc-300" :
          message.type === "warn" ? "bg-amber-950/30 text-amber-300" :
          "bg-red-950/30 text-red-300"
        }`}>
          {message.text}
        </div>
      )}
      <button type="submit" disabled={uploading} className="rounded-lg bg-zinc-700 px-5 py-2 text-sm font-medium hover:bg-zinc-600 disabled:opacity-50 transition-colors">
        {uploading ? "Uploading…" : "Upload"}
      </button>
    </form>
  )
}
