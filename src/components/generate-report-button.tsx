"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function GenerateReportButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function generate() {
    setLoading(true)
    try {
      await fetch("/api/fire/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
    >
      {loading ? "Generating..." : "Generate Report"}
    </button>
  )
}
