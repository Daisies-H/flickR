import type { Band, LocationRecord } from '../lib/calc'

export interface SidebarState {
  bandFilter: 'All' | Band
  locationLabel: string
  medical: boolean
  accessibility: boolean
  damageType: string
  levelIndex: number
  items: number
  crews: number
  people: number
  hardAccess: boolean
}

interface Props {
  state: SidebarState
  set: (patch: Partial<SidebarState>) => void
  locations: LocationRecord[]
  location: LocationRecord
  damageTypes: string[]
}

const field = 'mt-1 block w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-2 text-base text-slate-900'
const legend = 'text-lg font-bold text-navy-900'

function Slider(props: {
  id: string
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  return (
    <div className="mt-4">
      <label htmlFor={props.id} className="flex justify-between text-base font-semibold">
        <span>{props.label}</span>
        <span className="text-brand-dark" aria-hidden>
          {props.value}
        </span>
      </label>
      <input
        id={props.id}
        type="range"
        min={props.min}
        max={props.max}
        step={1}
        value={props.value}
        aria-valuetext={`${props.value}`}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="mt-2 h-8 w-full cursor-pointer accent-[#1d5fa8]"
      />
    </div>
  )
}

export default function Sidebar({ state, set, locations, location, damageTypes }: Props) {
  const shown = locations.filter((l) => state.bandFilter === 'All' || l.band === state.bandFilter)

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()} aria-label="Scenario settings">
      <fieldset className="rounded-2xl border-2 border-slate-300 bg-white p-4">
        <legend className={`px-1 ${legend}`}>1. Location</legend>
        <label className="block text-base font-semibold" htmlFor="band-filter">
          Filter by risk band
        </label>
        <select
          id="band-filter"
          className={field}
          value={state.bandFilter}
          onChange={(e) => {
            const bandFilter = e.target.value as SidebarState['bandFilter']
            const pool = locations.filter((l) => bandFilter === 'All' || l.band === bandFilter)
            const keep = pool.some((l) => l.label === state.locationLabel)
            set(
              keep
                ? { bandFilter }
                : { bandFilter, locationLabel: pool[0].label, levelIndex: 0 },
            )
          }}
        >
          {['All', 'High', 'Medium', 'Low'].map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>

        <label className="mt-4 block text-base font-semibold" htmlFor="location">
          Location ({shown.length} shown)
        </label>
        <select
          id="location"
          className={field}
          value={state.locationLabel}
          onChange={(e) => set({ locationLabel: e.target.value, levelIndex: 0 })}
        >
          {shown.map((l) => (
            <option key={l.label} value={l.label}>
              {l.label}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset className="rounded-2xl border-2 border-slate-300 bg-white p-4">
        <legend className={`px-1 ${legend}`}>2. Declared needs (optional)</legend>
        <p className="text-sm text-slate-700">We only use what you tell us. We never guess.</p>
        <label className="mt-3 flex items-start gap-3 text-base">
          <input
            type="checkbox"
            className="mt-1 h-6 w-6 shrink-0 accent-[#1d5fa8]"
            checked={state.medical}
            onChange={(e) => set({ medical: e.target.checked })}
          />
          <span>Someone here depends on powered medical equipment</span>
        </label>
        <label className="mt-3 flex items-start gap-3 text-base">
          <input
            type="checkbox"
            className="mt-1 h-6 w-6 shrink-0 accent-[#1d5fa8]"
            checked={state.accessibility}
            onChange={(e) => set({ accessibility: e.target.checked })}
          />
          <span>I have an accessibility need</span>
        </label>
      </fieldset>

      <fieldset className="rounded-2xl border-2 border-slate-300 bg-white p-4">
        <legend className={`px-1 ${legend}`}>3. Damage scenario</legend>
        <label className="block text-base font-semibold" htmlFor="damage-type">
          Damage type
        </label>
        <select
          id="damage-type"
          className={field}
          value={state.damageType}
          onChange={(e) => set({ damageType: e.target.value })}
        >
          {damageTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <label className="mt-4 block text-base font-semibold" htmlFor="damage-where">
          Where the damage is
        </label>
        <select
          id="damage-where"
          className={field}
          value={state.levelIndex}
          onChange={(e) => set({ levelIndex: Number(e.target.value) })}
        >
          {location.levels.map((lv, i) => (
            <option key={i} value={i}>
              {lv.name} ({lv.customers.toLocaleString()} {lv.customers === 1 ? 'customer' : 'customers'})
            </option>
          ))}
        </select>

        <Slider id="items" label="Items damaged" min={1} max={10} value={state.items} onChange={(items) => set({ items })} />
        <Slider id="crews" label="Crews" min={1} max={6} value={state.crews} onChange={(crews) => set({ crews })} />
        <Slider id="people" label="People per crew" min={1} max={4} value={state.people} onChange={(people) => set({ people })} />

        <label className="mt-4 flex items-start gap-3 text-base">
          <input
            type="checkbox"
            className="mt-1 h-6 w-6 shrink-0 accent-[#1d5fa8]"
            checked={state.hardAccess}
            onChange={(e) => set({ hardAccess: e.target.checked })}
          />
          <span>Hard-to-reach site</span>
        </label>
      </fieldset>
    </form>
  )
}
