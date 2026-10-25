// Tiny server. Its only job is to call the Claude API for the chat.
// The API key is read here and never sent to the browser. Chat content is not logged.
import 'dotenv/config'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SYSTEM_PROMPT =
  'You are a customer assistant for an electric utility storm demo. You may use ONLY the numbers and facts in the FACTS JSON. ' +
  'Never invent or change numbers, times, customer counts, or alert decisions. Always describe restoration as a range and as an estimate, never a promise. ' +
  'Separate what is confirmed (utility records) from what is a model estimate. Explain reasons in plain language a non-technical customer understands, and say the factors are patterns, not causes. ' +
  'Lead with safety for emergencies and downed lines, and tell people to call 911 for emergencies. ' +
  'Do not guess at medical, accessibility, or other personal needs; only use needs the customer declared. ' +
  'Never ask for or show addresses, account numbers, or any identifying information. ' +
  'If the facts say the location is not reliable, or you do not know something, say so and point to the utility\'s outage page. ' +
  'Keep answers short (under 120 words).'

const app = express()
app.use(express.json({ limit: '100kb' }))

interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

function cleanTurns(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return []
  const turns = raw
    .filter(
      (m): m is ChatTurn =>
        !!m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0,
    )
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }))
  while (turns.length && turns[0].role !== 'user') turns.shift()
  return turns
}

app.post('/api/chat', async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(503).json({ error: 'no_key' })

  const turns = cleanTurns(req.body?.messages)
  const facts = req.body?.facts
  if (!turns.length || turns[turns.length - 1].role !== 'user' || typeof facts !== 'object' || !facts) {
    return res.status(400).json({ error: 'bad_request' })
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
        max_tokens: 400,
        system: `${SYSTEM_PROMPT}\n\nFACTS JSON:\n${JSON.stringify(facts)}`,
        messages: turns,
      }),
      signal: AbortSignal.timeout(25_000),
    })
    if (!upstream.ok) {
      console.error(`Claude API returned status ${upstream.status}`)
      return res.status(502).json({ error: 'upstream' })
    }
    const json = (await upstream.json()) as { content?: { type: string; text?: string }[] }
    const reply = (json.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n')
      .trim()
    if (!reply) return res.status(502).json({ error: 'empty' })
    res.json({ reply })
  } catch {
    console.error('Claude API request failed')
    res.status(502).json({ error: 'upstream' })
  }
})

// Optional: serve the built front end (npm run build && npm start).
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const port = Number(process.env.PORT) || 3001
app.listen(port, () => console.log(`API server listening on http://localhost:${port}`))
