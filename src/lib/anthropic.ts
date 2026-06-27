import Anthropic from "@anthropic-ai/sdk"

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

function extractJson(raw: string): string {
  const stripped = raw.trim()
  // Strip markdown code blocks: ```json ... ``` or ``` ... ```
  const match = stripped.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/)
  return match ? match[1].trim() : stripped
}

export async function parseIBKRScreenshot(base64Image: string, mediaType: string): Promise<{
  portfolio_value: number
  cash: number
  positions: Array<{ symbol: string; value: number; pnl?: number }>
  snapshot_date?: string
}> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data: base64Image },
          },
          {
            type: "text",
            text: `Extract portfolio data from this IBKR screenshot. Return ONLY valid JSON with this exact shape:
{
  "portfolio_value": <total portfolio value as number>,
  "cash": <cash/money market balance as number, 0 if not visible>,
  "positions": [{"symbol": "...", "value": <market value as number>, "pnl": <unrealized P&L as number or null>}],
  "snapshot_date": "<YYYY-MM-DD if visible, else null>"
}
Use 0 for any values you cannot find. No markdown, no explanation, just JSON.`,
          },
        ],
      },
    ],
  })

  const text = (response.content[0] as { type: string; text: string }).text.trim()
  return JSON.parse(extractJson(text))
}

const CSV_CHUNK_ROWS = 200 // rows per Claude call

async function parseCsvChunk(header: string, rows: string[]): Promise<
  Array<{ date: string; description: string; amount: number; is_income: boolean }>
> {
  const chunk = [header, ...rows].join("\n")
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `Parse this bank statement CSV chunk and extract ALL transactions. Return ONLY valid JSON array (no wrapper object):
[
  {"date": "YYYY-MM-DD", "description": "...", "amount": <positive number>, "is_income": <true if money in, false if expense>}
]

Rules:
- amount is always positive; use is_income to indicate direction
- Skip internal transfers between own accounts if identifiable
- Normalise descriptions (remove reference numbers, trim whitespace)
- Include EVERY transaction row — do not summarise or skip any

CSV:
${chunk}`,
      },
    ],
  })
  const text = (response.content[0] as { type: string; text: string }).text.trim()
  const parsed = JSON.parse(extractJson(text))
  return Array.isArray(parsed) ? parsed : parsed.transactions ?? []
}

export async function parseBankStatementCSV(csvContent: string): Promise<{
  transactions: Array<{ date: string; description: string; amount: number; is_income: boolean }>
  period_start?: string
  period_end?: string
}> {
  const lines = csvContent.split("\n").filter(l => l.trim())
  if (lines.length === 0) return { transactions: [] }

  // Detect header row (first line)
  const header = lines[0]
  const dataRows = lines.slice(1)

  // Chunk and process in parallel batches
  const chunks: string[][] = []
  for (let i = 0; i < dataRows.length; i += CSV_CHUNK_ROWS) {
    chunks.push(dataRows.slice(i, i + CSV_CHUNK_ROWS))
  }

  // Process up to 5 chunks in parallel, then the next 5, etc.
  const PARALLEL = 5
  const allTransactions: Array<{ date: string; description: string; amount: number; is_income: boolean }> = []
  for (let i = 0; i < chunks.length; i += PARALLEL) {
    const batch = chunks.slice(i, i + PARALLEL)
    const results = await Promise.all(batch.map(rows => parseCsvChunk(header, rows)))
    results.forEach(txs => allTransactions.push(...txs))
  }

  const dates = allTransactions.map(t => t.date).filter(Boolean).sort()
  return {
    transactions: allTransactions,
    period_start: dates[0],
    period_end: dates[dates.length - 1],
  }
}

export async function parseBankStatementImage(base64Image: string, mediaType: string): Promise<{
  transactions: Array<{ date: string; description: string; amount: number; is_income: boolean }>
  period_start?: string
  period_end?: string
}> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data: base64Image },
          },
          {
            type: "text",
            text: `Parse this bank statement image and extract all transactions. Return ONLY valid JSON:
{
  "transactions": [
    {"date": "YYYY-MM-DD", "description": "...", "amount": <positive number>, "is_income": <true if money in, false if expense>}
  ],
  "period_start": "YYYY-MM-DD or null",
  "period_end": "YYYY-MM-DD or null"
}
amount is always a positive number; use is_income to indicate direction. No markdown, just JSON.`,
          },
        ],
      },
    ],
  })

  const text = (response.content[0] as { type: string; text: string }).text.trim()
  return JSON.parse(extractJson(text))
}

export async function categoriseTransactions(
  transactions: Array<{ description: string; amount: number }>
): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Categorise each transaction into exactly one category. Categories: Groceries, Dining, Transport, Housing, Utilities, Subscriptions, Healthcare, Clothing, Entertainment, Travel, Investments, Income, Transfers, Other.

Transactions (JSON array):
${JSON.stringify(transactions)}

Return ONLY a JSON array of category strings, one per transaction, in the same order. Example: ["Groceries","Dining","Transport"]`,
      },
    ],
  })

  const text = (response.content[0] as { type: string; text: string }).text.trim()
  return JSON.parse(extractJson(text))
}

export async function generateFireNarrative(data: {
  config: { annual_expenses_target: number; swr: number; current_age: number; target_retirement_age?: number }
  netWorth: number
  fiNumber: number
  percentToFi: number
  yearsToFiBase: number
  yearsToFiPessimistic: number
  monthlySpend: number
  targetMonthlySpend: number
  savingsRate: number
  topSpendCategories: Array<{ category: string; amount: number }>
  monthlySpendHistory: Array<{ month: string; total: number }>
}): Promise<{ narrative: string; spending_critique: string }> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are a brutally honest, pessimistic financial advisor reviewing someone's FIRE progress. You do NOT sugarcoat. You point out problems directly. You do not validate unless the numbers genuinely warrant it.

Data:
- Age: ${data.config.current_age}
- Target retirement age: ${data.config.target_retirement_age ?? "not set"}
- FI Number (${(data.config.swr * 100).toFixed(1)}% SWR): €${data.fiNumber.toLocaleString()}
- Current net worth: €${data.netWorth.toLocaleString()}
- Progress to FI: ${data.percentToFi.toFixed(1)}%
- Years to FI (base case): ${data.yearsToFiBase.toFixed(1)}
- Years to FI (pessimistic, -2% real return): ${data.yearsToFiPessimistic.toFixed(1)}
- This month's spend: €${data.monthlySpend.toLocaleString()}
- Target monthly spend: €${(data.config.annual_expenses_target / 12).toLocaleString()}
- Savings rate: ${(data.savingsRate * 100).toFixed(1)}%
- Top spending categories: ${data.topSpendCategories.map(c => `${c.category}: €${c.amount}`).join(", ")}
- Spend trend (last months): ${data.monthlySpendHistory.map(m => `${m.month}: €${m.total}`).join(", ")}

Write two sections:
1. "narrative": 2-3 paragraph honest assessment of FIRE progress. Lead with the most alarming fact. Use the pessimistic timeline as the anchor, not the optimistic one. Call out if they're off-track clearly.
2. "spending_critique": 1-2 paragraphs on spending. Name specific categories that are problematic. Give one concrete actionable recommendation for next month.

Return ONLY valid JSON: {"narrative": "...", "spending_critique": "..."}`,
      },
    ],
  })

  const text = (response.content[0] as { type: string; text: string }).text.trim()
  return JSON.parse(extractJson(text))
}
