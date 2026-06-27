"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function ParseButton({ uploadId }: { uploadId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function parse() {
    setLoading(true)
    try {
      await fetch(`/api/parse/${uploadId}`, { method: "POST" })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={parse}
      disabled={loading}
      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white disabled:opacity-40 transition-all"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
    >
      {loading ? "…" : "Parse"}
    </button>
  )
}
