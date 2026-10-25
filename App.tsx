import { useMemo, useState } from 'react'
import raw from '../app_data.json'
import { buildFacts, computeScenario, limitsText, type AppData, type ScenarioInput } from './lib/calc'
import Bulb from './components/Bulb'
import Chat from './components/Chat'
import Sidebar, { type SidebarState } from './components/Sidebar'
import { FallbackPanel, MetricCards, ThreeColumns } from './components/Panels'
import { Limits, SampleMessage } from './components/Lower'

const DATA = raw as unknown as AppData
const DAMAGE_TYPES = Object.keys(DATA.labor.hours_per_item)

export default function App() {
  const [st, setSt] = useState<SidebarState>({
    bandFilter: 'All',
    locationLabel: DATA.locations[0].label,
    medical: false,
    accessibility: false,
    damageType: DAMAGE_TYPES[0],
    levelIndex: 0,
    items: 1,
    crews: 1,
    people: 2,
    hardAccess: false,
  })
  const set = (patch: Partial<SidebarState>) => setSt((p) => ({ ...p, ...patch }))

  const location = DATA.locations.find((l) => l.label === st.locationLabel) ?? DATA.locations[0]

  const input: ScenarioInput = {
    location,
    damageType: st.damageType,
    levelIndex: st.levelIndex,
    items: st.items,
    crews: st.crews,
    people: st.people,
    hardAccess: st.hardAccess,
    medical: st.medical,
    accessibility: st.accessibility,
  }
  const s = useMemo(() => computeScenario(input, DATA), [st]) // eslint-disable-line react-hooks/exhaustive-deps
  const facts = useMemo(() => buildFacts(input, s, DATA), [s]) // eslint-disable-line react-hooks/exhaustive-deps
  const limits = useMemo(() => limitsText(DATA.model), [])

  return (
    <div className="min-h-screen">
      <a
        href="#results"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-3 focus:font-bold"
      >
        Skip to results
      </a>
      <header className="bg-navy-900 px-4 py-4 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-extrabold">Outage Concierge</h1>
          <p className="text-base text-slate-200">Demo using anonymous locations. Not official utility information.</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <Sidebar
            state={st}
            set={set}
            locations={DATA.locations}
            location={location}
            damageTypes={DAMAGE_TYPES}
          />
        </aside>

        <main id="results" className="min-w-0 space-y-6">
          <section aria-label="Lightbulb" className="rounded-3xl bg-navy-900 px-4 py-8">
            <Bulb state={s.bulb} />
          </section>

          {s.reliable ? (
            <>
              <MetricCards s={s} />
              <ThreeColumns s={s} input={input} />
            </>
          ) : (
            <FallbackPanel tips={s.tips} />
          )}

          <Chat facts={facts} />
          <SampleMessage s={s} />
          <Limits items={limits} />
        </main>
      </div>
    </div>
  )
}
