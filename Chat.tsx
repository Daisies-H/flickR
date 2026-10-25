import { useEffect, useRef, useState } from 'react'
import { localAnswer, type Facts } from '../lib/calc'

interface Msg {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Why is my risk high?',
  'What should I do tonight?',
  'Why did the estimate change?',
  'Can you explain this simply?',
]

export default function Chat({ facts }: { facts: Facts }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [msgs, busy])

  async function ask(question: string) {
    const q = question.trim()
    if (!q || busy) return
    const next: Msg[] = [...msgs, { role: 'user', content: q }]
    setMsgs(next)
    setText('')
    setBusy(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next, facts }),
      })
      if (!res.ok) throw new Error('chat unavailable')
      const { reply } = (await res.json()) as { reply: string }
      setMsgs([...next, { role: 'assistant', content: reply }])
    } catch {
      setMsgs([
        ...next,
        {
          role: 'assistant',
          content: `The AI assistant isn't available right now, so here is a simple answer built from the numbers above. ${localAnswer(q, facts)}`,
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="AI assistant" className="rounded-2xl border-2 border-slate-300 bg-white p-5">
      <h2 className="text-xl font-extrabold text-navy-900">Ask the AI assistant</h2>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Suggested questions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            disabled={busy}
            className="rounded-full border-2 border-brand px-4 py-2 text-base font-semibold text-brand-dark hover:bg-blue-50 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div
        className="mt-4 max-h-96 min-h-[6rem] space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {msgs.length === 0 && (
          <p className="text-base text-slate-700">Ask a question about your risk, what to do, or the estimate.</p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
            <p
              className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-left text-base ${
                m.role === 'user' ? 'bg-brand text-white' : 'border-2 border-slate-300 bg-white text-slate-900'
              }`}
            >
              <span className="sr-only">{m.role === 'user' ? 'You: ' : 'Assistant: '}</span>
              {m.content}
            </p>
          </div>
        ))}
        {busy && <p className="text-base text-slate-700">Thinking…</p>}
        <div ref={endRef} />
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          ask(text)
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Your question
        </label>
        <input
          id="chat-input"
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your question"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border-2 border-slate-400 px-3 py-2 text-base"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="rounded-lg bg-brand px-5 py-2 text-base font-bold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          Send
        </button>
      </form>
      <p className="mt-2 text-sm text-slate-700">AI-written explanation. Numbers come from the calculations above.</p>
    </section>
  )
}
