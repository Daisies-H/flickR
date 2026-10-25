import type { BulbState } from '../lib/calc'

const COPY: Record<BulbState, { title: string; detail: string }> = {
  bright: { title: 'Light on', detail: 'Low risk and short possible repairs.' },
  flicker: { title: 'Light flickering', detail: 'Some risk, or a repair that could take a while.' },
  off: { title: 'Light out', detail: 'High risk with a long possible outage, or a worst case of 24 hours or more.' },
  unknown: { title: 'No reliable prediction', detail: "We can't make a reliable prediction for this location." },
}

export default function Bulb({ state }: { state: BulbState }) {
  const on = state === 'bright' || state === 'flicker'
  const glass = on ? '#ffe08a' : '#4b5b73'
  const filament = on ? '#fff7d6' : '#7b8aa3'
  return (
    <figure className="flex flex-col items-center text-center" aria-live="polite">
      <div className="relative h-64 w-48">
        {on && (
          <div
            aria-hidden
            className={`absolute left-1/2 top-2 h-56 w-56 -translate-x-1/2 rounded-full ${
              state === 'flicker' ? 'flicker' : ''
            }`}
            style={{
              background: 'radial-gradient(circle, rgba(255,214,102,.85) 0%, rgba(255,184,61,.3) 45%, transparent 70%)',
              filter: 'blur(6px)',
            }}
          />
        )}
        <svg
          viewBox="0 0 190 300"
          className="relative h-full w-full"
          role="img"
          aria-label={`${COPY[state].title}. ${COPY[state].detail}`}
        >
          <path
            d="M95 8C45 8 14 44 14 92c0 34 16 54 30 72 9 12 14 22 14 36v10h74v-10c0-14 5-24 14-36 14-18 30-38 30-72C176 44 145 8 95 8z"
            fill={glass}
            fillOpacity={on ? 0.9 : 0.35}
            stroke="#ffffff"
            strokeOpacity={0.5}
            strokeWidth={3}
            className={on && state === 'flicker' ? 'flicker' : ''}
          />
          <path
            d="M72 210V150c0-12 10-18 23-18s23 6 23 18v60M72 150c10-10 36-10 46 0"
            fill="none"
            stroke={filament}
            strokeWidth={4}
            strokeLinecap="round"
            className={on && state === 'flicker' ? 'flicker' : ''}
          />
          {state === 'unknown' && (
            <text x="95" y="120" textAnchor="middle" fontSize="64" fill="#cbd5e1" fontWeight="700">
              ?
            </text>
          )}
          <rect x="58" y="210" width="74" height="22" rx="5" fill="#94a3b8" />
          <rect x="62" y="236" width="66" height="18" rx="5" fill="#64748b" />
          <rect x="70" y="258" width="50" height="16" rx="8" fill="#94a3b8" />
        </svg>
      </div>
      <figcaption className="mt-2">
        <p className="text-2xl font-bold text-white">{COPY[state].title}</p>
        <p className="mt-1 max-w-md text-base text-slate-200">{COPY[state].detail}</p>
      </figcaption>
    </figure>
  )
}
