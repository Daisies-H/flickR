import type { Scenario, ScenarioInput, Tip } from '../lib/calc'

const bandStyle = {
  High: 'border-red-700 bg-red-50 text-red-900',
  Medium: 'border-amber-600 bg-amber-50 text-amber-900',
  Low: 'border-green-700 bg-green-50 text-green-900',
}

export function MetricCards({ s }: { s: Scenario }) {
  return (
    <section aria-label="Key results" className="grid gap-4 md:grid-cols-3">
      <div className={`rounded-2xl border-2 p-5 ${bandStyle[s.band]}`}>
        <h2 className="text-base font-bold uppercase tracking-wide">Outage risk</h2>
        <p className="mt-1 text-4xl font-extrabold">{s.band}</p>
        <p className="mt-1 text-base">Model estimate from past damage patterns.</p>
      </div>
      <div className="rounded-2xl border-2 border-slate-400 bg-white p-5">
        <h2 className="text-base font-bold uppercase tracking-wide text-slate-800">Confidence</h2>
        <p className="mt-1 text-4xl font-extrabold">{s.confidence}</p>
        <p className="mt-1 text-base text-slate-800">Never shown as High. This model is useful but modest.</p>
      </div>
      <div className="rounded-2xl border-2 border-brand bg-white p-5">
        <h2 className="text-base font-bold uppercase tracking-wide text-brand-dark">Restoration range</h2>
        <p className="mt-1 text-3xl font-extrabold leading-tight">{s.range}</p>
        <p className="mt-1 text-base text-slate-800">An estimate, not a promise.</p>
      </div>
    </section>
  )
}

function Badge({ kind }: { kind: Tip['kind'] }) {
  return kind === 'SAFETY' ? (
    <span className="mr-2 inline-block rounded bg-red-700 px-2 py-0.5 text-sm font-extrabold tracking-wide text-white">
      SAFETY
    </span>
  ) : null
}

const colCls = 'rounded-2xl border-2 border-slate-300 bg-white p-5'
const h2 = 'text-xl font-extrabold text-navy-900'
const h3 = 'mt-4 text-base font-bold text-navy-800'

export function FallbackPanel({ tips }: { tips: Tip[] }) {
  return (
    <section aria-label="No reliable prediction" className="rounded-2xl border-2 border-slate-500 bg-white p-6">
      <h2 className="text-2xl font-extrabold text-navy-900">We can't make a reliable prediction for this location</h2>
      <p className="mt-2 text-lg">
        Please check your utility's outage page for official information. Here is the safety guidance that applies
        everywhere:
      </p>
      <ul className="mt-3 space-y-2 text-lg">
        {tips.map((t, i) => (
          <li key={i}>
            <Badge kind={t.kind} />
            {t.text}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ThreeColumns({ s, input }: { s: Scenario; input: ScenarioInput }) {
  return (
    <section aria-label="Details" className="grid gap-4 lg:grid-cols-3">
      {/* ---- Confirmed facts ---- */}
      <div className={colCls}>
        <h2 className={h2}>Confirmed facts</h2>
        <p className="text-sm text-slate-700">From utility records (demo data).</p>
        <ul className="mt-3 space-y-3 text-base">
          <li>
            <strong>{s.protectiveDevices}</strong> protective {s.protectiveDevices === 1 ? 'device' : 'devices'} between
            you and the substation.
          </li>
          <li>
            <strong>{s.customersAffected.toLocaleString()}</strong>{' '}
            {s.customersAffected === 1 ? 'customer' : 'customers'} would lose power in this scenario.
          </li>
          <li>
            <strong>{s.customersOnMainBreaker.toLocaleString()}</strong> customers are on the main breaker.
          </li>
          <li>
            Critical facility nearby (approximate): <strong>{s.criticalNearby ? 'Yes' : 'No'}</strong>.
          </li>
          <li>No outage currently confirmed (demo).</li>
        </ul>
      </div>

      {/* ---- Model estimates ---- */}
      <div className={colCls}>
        <h2 className={h2}>Model estimates</h2>
        <p className="text-sm text-slate-700">Predictions, not facts.</p>
        <p className="mt-3 text-base">
          Risk band: <strong>{s.band}</strong>
        </p>
        <h3 className={h3}>Compared with typical locations</h3>
        <ul className="mt-1 space-y-2 text-base">
          {s.factors.map((f) => (
            <li key={f.key}>
              {f.label}: <strong>{f.comparison}</strong>
              <span className="text-slate-700">
                {' '}
                ({f.value}
                {f.unit ? ' ' + f.unit : ''} vs {f.typical}
                {f.unit ? ' ' + f.unit : ''} typical)
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-slate-700">These are patterns in past damage records, not causes.</p>
        <h3 className={h3}>Restoration range: {s.range}</h3>
        <p className="mt-1 text-base">What moves it:</p>
        <ul className="ml-5 mt-1 list-disc space-y-1 text-base">
          <li>
            Damaged items: {input.items} × {input.damageType.toLowerCase()}
          </li>
          <li>
            Crews: {input.crews} with {input.people} {input.people === 1 ? 'person' : 'people'} each
          </li>
          <li>Hard access: {input.hardAccess ? 'yes (adds time)' : 'no'}</li>
          <li>Wait for a crew (assumed 1 to 6 hours)</li>
          <li>What crews find on site</li>
        </ul>
      </div>

      {/* ---- What you can do ---- */}
      <div className={colCls}>
        <h2 className={h2}>What you can do</h2>
        <h3 className="mt-3 text-base font-bold text-navy-800">Preparation tips</h3>
        <ul className="mt-1 space-y-2 text-base">
          {s.tips.map((t, i) => (
            <li key={i}>
              <Badge kind={t.kind} />
              {t.text}
            </li>
          ))}
        </ul>
        <h3 className={h3}>Pre-storm alert: {s.alerts.preStorm ? 'Yes' : 'No'}</h3>
        <ul className="ml-5 mt-1 list-disc space-y-1 text-base">
          {s.alerts.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
        <p className="mt-2 text-base">
          <strong>Timing:</strong> {s.alerts.timing}.
        </p>
        <p className="mt-1 text-base">
          <strong>Channels:</strong> {s.alerts.channels.join(', ')}.
        </p>
        <p className="mt-1 text-sm text-slate-700">Everyone gets outage-confirmed and restored alerts.</p>
        <h3 className={h3}>Escalate when</h3>
        <ul className="ml-5 mt-1 list-disc space-y-1 text-base">
          {s.alerts.escalate.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
