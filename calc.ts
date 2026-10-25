// Pure functions for the Outage Concierge demo. No React, no network.
// All alert thresholds are CHALLENGE ASSUMPTIONS, not utility policy.

export type Band = 'High' | 'Medium' | 'Low'
export type Comparison = 'higher than typical' | 'about typical' | 'lower than typical'

export interface Level {
  name: string
  customers: number
}
export interface LocationRecord {
  label: string
  band: Band
  confidence: 'Medium' | 'Low'
  reliable: boolean
  critical_nearby: boolean
  factors: {
    dist_transformer_m: number
    dist_protective_m: number
    customers_within_200m: number
  }
  levels: Level[]
}
export interface Labor {
  hours_per_item: Record<string, number>
  indirect_labor_multiplier: number
  hard_access_adder_hours: number
}
export interface AppData {
  typical: LocationRecord['factors']
  labor: Labor
  model: { auc: number; top10pct_captures_damaged_pct: number; note: string }
  locations: LocationRecord[]
}

// Crew-wait assumptions (hours) added to the repair time.
export const WAIT = { best: 1, likely: 3, worst: 6 }
export const REPAIR_WEIGHT = { best: 0.75, likely: 1, worst: 1.5 }

export const NOTE =
  "This is a planning estimate, not a confirmed restoration time. Check your utility's outage page for official updates."

// ---------------------------------------------------------------- restoration

export interface Restoration {
  work: number
  repair: number
  best: number
  likely: number
  worst: number
}

export function restoration(
  type: string,
  items: number,
  crews: number,
  people: number,
  hardAccess: boolean,
  labor: Labor,
): Restoration {
  const perItem = labor.hours_per_item[type]
  if (perItem === undefined) throw new Error(`Unknown damage type: ${type}`)
  let work = items * perItem
  if (hardAccess) work += labor.hard_access_adder_hours
  work = work * labor.indirect_labor_multiplier
  const repair = work / (crews * people)
  return {
    work,
    repair,
    best: WAIT.best + REPAIR_WEIGHT.best * repair,
    likely: WAIT.likely + REPAIR_WEIGHT.likely * repair,
    worst: WAIT.worst + REPAIR_WEIGHT.worst * repair,
  }
}

/** Always a range, never a single number. */
export function rangeText(best: number, worst: number): string {
  const lo = Math.round(best)
  const hi = Math.round(worst)
  if (lo === hi) return `about ${hi} hours`
  return `roughly ${lo} to ${hi} hours`
}

// -------------------------------------------------------------------- factors

export function compareToTypical(value: number, typical: number): Comparison {
  if (value >= typical * 1.25) return 'higher than typical'
  if (value <= typical * 0.8) return 'lower than typical'
  return 'about typical'
}

export interface FactorRow {
  key: string
  label: string
  value: number
  unit: string
  typical: number
  comparison: Comparison
}

export function factorRows(loc: LocationRecord, typical: AppData['typical']): FactorRow[] {
  return [
    {
      key: 'dist_transformer_m',
      label: 'Distance to the nearest transformer',
      value: loc.factors.dist_transformer_m,
      unit: 'm',
      typical: typical.dist_transformer_m,
    },
    {
      key: 'dist_protective_m',
      label: 'Distance to the nearest fuse or recloser',
      value: loc.factors.dist_protective_m,
      unit: 'm',
      typical: typical.dist_protective_m,
    },
    {
      key: 'customers_within_200m',
      label: 'Customers within 200 m',
      value: loc.factors.customers_within_200m,
      unit: '',
      typical: typical.customers_within_200m,
    },
  ].map((f) => ({ ...f, comparison: compareToTypical(f.value, f.typical) }))
}

// --------------------------------------------------------------------- alerts

export interface AlertPlan {
  preStorm: boolean
  reasons: string[]
  timing: string
  channels: string[]
  escalate: string[]
}

export function alertPlan(
  band: Band,
  customers: number,
  worst: number,
  criticalNearby: boolean,
  medicalNeed: boolean,
): AlertPlan {
  const reasons: string[] = []
  if (band === 'High') reasons.push('Risk band is High.')
  if (band === 'Medium' && customers >= 100)
    reasons.push('Risk band is Medium and 100 or more customers would lose power.')
  if (band === 'Medium' && worst >= 12)
    reasons.push('Risk band is Medium and the worst case is 12 hours or more.')
  if (medicalNeed && band !== 'Low')
    reasons.push('You declared a medical-equipment need and risk is not Low.')
  if (criticalNearby && band !== 'Low')
    reasons.push('A critical facility is nearby and risk is not Low.')

  const preStorm = reasons.length > 0

  let timing = 'No pre-storm alert (outage alerts still apply)'
  if (preStorm) {
    if (band === 'High') timing = '48 and 24 hours before the storm'
    else if (band === 'Medium') timing = '24 hours before the storm'
  }

  const channels = ['Text message', 'App notification']
  if (medicalNeed || worst >= 12) channels.push('Phone call')

  const escalate = [
    'The estimate rises by 2 or more hours.',
    'The outage is still unresolved after the worst-case time.',
  ]
  if (worst >= 24) escalate.push('The worst case is 24 hours or more: send for priority review.')
  if (medicalNeed)
    escalate.push('A declared medical need and the outage lasts over 4 hours: personal follow-up.')
  if (criticalNearby)
    escalate.push('A critical facility is nearby: escalate immediately when an outage is confirmed.')

  return {
    preStorm,
    reasons: preStorm ? reasons : ['No pre-storm alert rule was triggered.'],
    timing,
    channels,
    escalate,
  }
}

// ---------------------------------------------------------------------- tips

export interface Tip {
  kind: 'SAFETY' | 'PREPARE'
  text: string
}

export function prepTips(worst: number, medicalNeed: boolean, accessibilityNeed: boolean): Tip[] {
  const tips: Tip[] = [
    {
      kind: 'SAFETY',
      text: 'Stay away from downed power lines and anything touching them. Call 911 for emergencies and report the line to your utility.',
    },
    { kind: 'PREPARE', text: 'Charge phones and power banks. Keep a flashlight handy.' },
  ]
  if (worst >= 4)
    tips.push({
      kind: 'PREPARE',
      text: 'Keep the fridge and freezer closed. Fill a few bottles with water.',
    })
  if (worst >= 12)
    tips.push({
      kind: 'PREPARE',
      text: 'Plan where you could stay if it runs long, and have cash and any medicines on hand.',
    })
  if (worst >= 24)
    tips.push({
      kind: 'PREPARE',
      text: 'Pack a small go-bag. A long outage is possible, so check on neighbors who may need help.',
    })
  if (medicalNeed)
    tips.push({
      kind: 'SAFETY',
      text: 'You told us someone depends on powered medical equipment. Test your backup power now and know when to call your care provider. If anyone is in danger, call 911.',
    })
  if (accessibilityNeed)
    tips.push({
      kind: 'PREPARE',
      text: 'You told us you have an accessibility need. Plan how you would reach help or communicate during an outage.',
    })
  return tips
}

export const safetyOnly = (tips: Tip[]) => tips.filter((t) => t.kind === 'SAFETY')

// ------------------------------------------------------------------- messages

export function preStormMessage(band: Band, best: number, worst: number): string {
  return `A storm is coming. Your area has a ${band.toLowerCase()} chance of power problems. If you lose power, it could take ${rangeText(best, worst)} to restore. We suggest charging devices and checking your supplies now. ${NOTE}`
}

export function outageConfirmedMessage(best: number, worst: number): string {
  return `We've confirmed a power outage in your area. Based on typical repairs, power may be back in ${rangeText(best, worst)}. We'll update you if anything changes. ${NOTE}`
}

export function estimateUpdatedMessage(oldWorst: number, best: number, worst: number): string {
  const direction = worst > oldWorst ? 'longer' : 'shorter'
  return `Update: the estimate is now ${direction}. Power may be back in ${rangeText(best, worst)}. This can change with crew availability, road access, or what crews find on site. ${NOTE}`
}

export function restoredMessage(): string {
  return 'Good news: power should be back on. If your lights are still off, check your breaker and tell us so we can look into it.'
}

// ----------------------------------------------------------------- bulb state

export type BulbState = 'bright' | 'flicker' | 'off' | 'unknown'

/** Bright = low risk and short repairs. Off = high risk with a long worst case, or any worst case of 24 h or more. */
export function bulbState(band: Band, worst: number, reliable: boolean): BulbState {
  if (!reliable) return 'unknown'
  if (worst >= 24 || (band === 'High' && worst >= 12)) return 'off'
  if (band === 'Low' && worst < 12) return 'bright'
  return 'flicker'
}

// ------------------------------------------------------------------- limits

export function limitsText(model: AppData['model']): string[] {
  const auc = model.auc.toFixed(2)
  return [
    `Risk comes from a model trained on past damage records. On map areas it had never seen it scored AUC ${auc}, and its top 10% riskiest poles contained ${model.top10pct_captures_damaged_pct}% of damaged poles. That is useful but modest, so confidence is never "High".`,
    'No weather data was provided. Risk shows where damage tends to happen, not what a specific storm will do.',
    'Restoration is a calculation from labor workbook hours times a 4.5 indirect labor multiplier. Wire and switch hours, and the 1, 3, and 6 hour crew-wait figures, are assumptions.',
    'Damage is linked to the nearest fuse or recloser on the map.',
    'Alert thresholds are challenge assumptions, not utility policy.',
    'Estimates are not confirmed restoration information.',
  ]
}

// ------------------------------------------------------------------ scenario

export interface ScenarioInput {
  location: LocationRecord
  damageType: string
  levelIndex: number
  items: number
  crews: number
  people: number
  hardAccess: boolean
  medical: boolean
  accessibility: boolean
}

export interface Scenario {
  reliable: boolean
  band: Band
  confidence: string
  level: Level
  customersAffected: number
  customersOnMainBreaker: number
  protectiveDevices: number
  criticalNearby: boolean
  factors: FactorRow[]
  rest: Restoration
  range: string
  alerts: AlertPlan
  tips: Tip[]
  bulb: BulbState
  update: { best: number; worst: number }
  messages: Record<'preStorm' | 'outageConfirmed' | 'estimateUpdated' | 'restored', string>
}

export function computeScenario(input: ScenarioInput, data: AppData): Scenario {
  const { location: loc } = input
  const level = loc.levels[Math.min(input.levelIndex, loc.levels.length - 1)]
  const rest = restoration(
    input.damageType,
    input.items,
    input.crews,
    input.people,
    input.hardAccess,
    data.labor,
  )
  const customersAffected = level.customers
  const alerts = alertPlan(loc.band, customersAffected, rest.worst, loc.critical_nearby, input.medical)
  const allTips = prepTips(rest.worst, input.medical, input.accessibility)
  const update = { best: rest.best + 2, worst: rest.worst + 4 }
  return {
    reliable: loc.reliable,
    band: loc.band,
    confidence: loc.confidence === 'Low' ? 'Low' : 'Medium', // never "High"
    level,
    customersAffected,
    customersOnMainBreaker: loc.levels[loc.levels.length - 1].customers,
    protectiveDevices: Math.max(0, loc.levels.length - 2),
    criticalNearby: loc.critical_nearby,
    factors: factorRows(loc, data.typical),
    rest,
    range: rangeText(rest.best, rest.worst),
    alerts,
    tips: loc.reliable ? allTips : safetyOnly(allTips),
    bulb: bulbState(loc.band, rest.worst, loc.reliable),
    update,
    messages: {
      preStorm: preStormMessage(loc.band, rest.best, rest.worst),
      outageConfirmed: outageConfirmedMessage(rest.best, rest.worst),
      estimateUpdated: estimateUpdatedMessage(rest.worst, update.best, update.worst),
      restored: restoredMessage(),
    },
  }
}

// ---------------------------------------------------------------- chat facts

/** The only information the AI assistant is allowed to use. */
export function buildFacts(input: ScenarioInput, s: Scenario, data: AppData) {
  const unreliable = "We can't make a reliable prediction for this location."
  return {
    locationIsReliable: s.reliable,
    reliabilityNote: s.reliable ? undefined : unreliable,
    riskBand: s.band,
    confidence: s.confidence,
    factorsVsTypical: s.factors.map((f) => ({
      factor: f.label,
      value: `${f.value}${f.unit ? ' ' + f.unit : ''}`,
      typical: `${f.typical}${f.unit ? ' ' + f.unit : ''}`,
      comparison: f.comparison,
    })),
    factorsNote: 'These are patterns seen in past damage records, not causes.',
    scenario: {
      damageType: input.damageType,
      itemsDamaged: input.items,
      crews: input.crews,
      peoplePerCrew: input.people,
      hardToReachSite: input.hardAccess,
      whereDamageIs: s.level.name,
    },
    confirmedFacts: {
      protectiveDevicesBetweenYouAndSubstation: s.protectiveDevices,
      customersWhoWouldLosePowerInThisScenario: s.customersAffected,
      customersOnMainBreaker: s.customersOnMainBreaker,
      criticalFacilityNearby: s.criticalNearby ? 'yes (approximate)' : 'no',
      outageStatus: 'No outage currently confirmed (demo)',
    },
    restorationEstimate: {
      rangeText: s.range,
      bestHours: Number(s.rest.best.toFixed(1)),
      likelyHours: Number(s.rest.likely.toFixed(1)),
      worstHours: Number(s.rest.worst.toFixed(1)),
      note: 'Model estimate, not a promise or confirmed time.',
      exampleUpdate: {
        rangeText: rangeText(s.update.best, s.update.worst),
        meaning: 'Example of an update if damage is worse than first thought (best +2 hours, worst +4 hours).',
      },
    },
    alertPlan: {
      preStormAlert: s.alerts.preStorm ? 'YES' : 'NO',
      reasons: s.alerts.reasons,
      timing: s.alerts.timing,
      channels: s.alerts.channels,
      escalateWhen: s.alerts.escalate,
      outageConfirmedAndRestoredAlerts: 'Everyone is eligible.',
    },
    preparationTips: s.tips.map((t) => `${t.kind}: ${t.text}`),
    declaredNeeds: { medicalEquipment: input.medical, accessibility: input.accessibility },
    limits: limitsText(data.model),
  }
}

export type Facts = ReturnType<typeof buildFacts>

// ---------------------------------------------------------- fallback answers

/** Used when the server or API key is unavailable. Built only from the facts. */
export function localAnswer(question: string, f: Facts): string {
  const q = question.toLowerCase()
  const safety = f.preparationTips.filter((t) => t.startsWith('SAFETY'))
  if (!f.locationIsReliable) {
    return `${f.reliabilityNote} Please check your utility's outage page for official information. ${safety.join(' ')}`
  }
  const range = f.restorationEstimate.rangeText
  if (/(why|reason|factor|risk|high|medium|low)/.test(q) && !/(estimate|change|update)/.test(q)) {
    const parts = f.factorsVsTypical.map((x) => `${x.factor.toLowerCase()} is ${x.comparison}`)
    return `Your risk band is ${f.riskBand} (a model estimate, confidence ${f.confidence}). Compared with typical locations, ${parts.join('; ')}. These are patterns in past damage records, not causes.`
  }
  if (/(tonight|do|prepare|prep|ready|should)/.test(q)) {
    return `${f.preparationTips.slice(0, 4).join(' ')} Pre-storm alert: ${f.alertPlan.preStormAlert}.`
  }
  if (/(estimate|change|update|longer|how long|restor)/.test(q)) {
    return `Our current estimate is ${range}. It is a model estimate, not a promise. It can change with how much is damaged, how many crews are available, access to the site, and what crews find on site. For example, worse damage could move it to ${f.restorationEstimate.exampleUpdate.rangeText}.`
  }
  if (/(alert|notify|notification|qualify|eligible)/.test(q)) {
    return `Pre-storm alert: ${f.alertPlan.preStormAlert}. ${f.alertPlan.reasons.join(' ')} Timing: ${f.alertPlan.timing}. Channels: ${f.alertPlan.channels.join(', ')}.`
  }
  if (/(simple|explain|plain|mean)/.test(q)) {
    return `Short version: your area is ${f.riskBand} risk (a model estimate). If something breaks, power may be back in ${range}. That is an estimate, not a promise. Stay away from downed lines and call 911 for emergencies.`
  }
  return `Your risk band is ${f.riskBand} and the restoration estimate is ${range} (an estimate, not a promise). Try asking about your risk, what to do tonight, or why the estimate can change. For official updates, check your utility's outage page.`
}
