import { useState } from 'react'
import type { Scenario } from '../lib/calc'

const OPTIONS = [
  ['preStorm', 'Pre-storm'],
  ['outageConfirmed', 'Outage confirmed'],
  ['estimateUpdated', 'Estimate updated'],
  ['restored', 'Restored'],
] as const

export function SampleMessage({ s }: { s: Scenario }) {
  const [key, setKey] = useState<(typeof OPTIONS)[number][0]>('preStorm')
  return (
    <section aria-label="Sample message" className="rounded-2xl border-2 border-slate-300 bg-white p-5">
      <label htmlFor="sample-message" className="text-xl font-extrabold text-navy-900">
        Sample message
      </label>
      <select
        id="sample-message"
        value={key}
        onChange={(e) => setKey(e.target.value as typeof key)}
        className="mt-2 block w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-2 text-base sm:w-72"
      >
        {OPTIONS.map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <p className="mt-3 rounded-xl border-2 border-slate-300 bg-slate-50 p-4 text-lg leading-relaxed" aria-live="polite">
        {s.messages[key]}
      </p>
      {key === 'estimateUpdated' && (
        <p className="mt-2 text-sm text-slate-700">Example update: best +2 hours and worst +4 hours.</p>
      )}
    </section>
  )
}

export function Limits({ items }: { items: string[] }) {
  return (
    <details className="rounded-2xl border-2 border-slate-300 bg-white p-5">
      <summary className="cursor-pointer text-xl font-extrabold text-navy-900">How this works and limits</summary>
      <ul className="ml-5 mt-3 list-disc space-y-2 text-base">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-slate-700">
        Privacy: only anonymous labels are shown. No addresses, customer or premise IDs, coordinates, or facility names.
        Chat content is not logged.
      </p>
    </details>
  )
}
