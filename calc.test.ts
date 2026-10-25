import { describe, expect, it } from 'vitest'
import data from '../../app_data.json'
import {
  alertPlan,
  bulbState,
  compareToTypical,
  computeScenario,
  prepTips,
  rangeText,
  restoration,
  type AppData,
} from './calc'

const D = data as unknown as AppData

describe('restoration', () => {
  it('matches the pole test case: 1 pole, 1 crew, 2 people, easy access', () => {
    const r = restoration('Pole', 1, 1, 2, false, D.labor)
    expect(r.best).toBeCloseTo(6.8, 1)
    expect(r.likely).toBeCloseTo(10.7, 1)
    expect(r.worst).toBeCloseTo(17.6, 1)
    expect(rangeText(r.best, r.worst)).toBe('roughly 7 to 18 hours')
  })

  it('hard access adds hours before the multiplier', () => {
    const easy = restoration('Pole', 1, 1, 2, false, D.labor)
    const hard = restoration('Pole', 1, 1, 2, true, D.labor)
    expect(hard.work - easy.work).toBeCloseTo(0.5 * 4.5, 5)
  })

  it('more crews shortens the range', () => {
    const one = restoration('Pole', 4, 1, 2, false, D.labor)
    const three = restoration('Pole', 4, 3, 2, false, D.labor)
    expect(three.worst).toBeLessThan(one.worst)
  })
})

describe('typical comparison cutoffs', () => {
  it('uses +25% and -20%', () => {
    expect(compareToTypical(125, 100)).toBe('higher than typical')
    expect(compareToTypical(124, 100)).toBe('about typical')
    expect(compareToTypical(80, 100)).toBe('lower than typical')
    expect(compareToTypical(81, 100)).toBe('about typical')
  })
})

describe('alert rules', () => {
  it('High is always eligible, with 48 and 24 hour timing', () => {
    const a = alertPlan('High', 5, 3, false, false)
    expect(a.preStorm).toBe(true)
    expect(a.timing).toBe('48 and 24 hours before the storm')
  })
  it('Medium needs 100+ customers or worst >= 12', () => {
    expect(alertPlan('Medium', 99, 11.9, false, false).preStorm).toBe(false)
    expect(alertPlan('Medium', 100, 1, false, false).preStorm).toBe(true)
    expect(alertPlan('Medium', 1, 12, false, false).preStorm).toBe(true)
  })
  it('Low is never eligible, even with declared need or critical facility', () => {
    expect(alertPlan('Low', 500, 30, true, true).preStorm).toBe(false)
  })
  it('medical need on Medium makes it eligible and adds phone + escalation', () => {
    const a = alertPlan('Medium', 1, 2, false, true)
    expect(a.preStorm).toBe(true)
    expect(a.channels).toContain('Phone call')
    expect(a.escalate.some((e) => e.includes('personal follow-up'))).toBe(true)
  })
  it('worst >= 24 triggers priority review', () => {
    expect(alertPlan('High', 1, 24, false, false).escalate.some((e) => e.includes('priority review'))).toBe(true)
  })
})

describe('preparation tips', () => {
  it('always includes a SAFETY tip, and tiers by worst case', () => {
    expect(prepTips(1, false, false)[0].kind).toBe('SAFETY')
    expect(prepTips(1, false, false)).toHaveLength(2)
    expect(prepTips(4, false, false)).toHaveLength(3)
    expect(prepTips(12, false, false)).toHaveLength(4)
    expect(prepTips(24, false, false)).toHaveLength(5)
  })
  it('only adds need-specific tips when declared', () => {
    expect(prepTips(1, false, false).some((t) => /medical|accessibility/.test(t.text))).toBe(false)
    expect(prepTips(1, true, true)).toHaveLength(4)
  })
})

describe('scenario + fallback', () => {
  const loc = D.locations[0]
  const base = {
    location: loc,
    damageType: 'Pole',
    levelIndex: 0,
    items: 1,
    crews: 1,
    people: 2,
    hardAccess: false,
    medical: false,
    accessibility: false,
  }
  it('customers affected is the chosen level count', () => {
    const s = computeScenario({ ...base, levelIndex: loc.levels.length - 1 }, D)
    expect(s.customersAffected).toBe(loc.levels[loc.levels.length - 1].customers)
    expect(s.protectiveDevices).toBe(loc.levels.length - 2)
  })
  it('confidence is never High', () => {
    for (const l of D.locations) expect(computeScenario({ ...base, location: l }, D).confidence).not.toBe('High')
  })
  it('unreliable location shows only SAFETY tips and an unknown bulb', () => {
    const s = computeScenario({ ...base, location: { ...loc, reliable: false }, medical: true }, D)
    expect(s.tips.every((t) => t.kind === 'SAFETY')).toBe(true)
    expect(s.bulb).toBe('unknown')
  })
  it('estimate-updated message uses best+2 / worst+4', () => {
    const s = computeScenario(base, D)
    expect(s.messages.estimateUpdated).toContain(rangeText(s.rest.best + 2, s.rest.worst + 4))
  })
  it('every message but restored carries the planning-estimate note, with spaces between sentences', () => {
    const s = computeScenario(base, D)
    for (const k of ['preStorm', 'outageConfirmed', 'estimateUpdated'] as const) {
      expect(s.messages[k]).toContain('This is a planning estimate, not a confirmed restoration time.')
      expect(s.messages[k]).not.toMatch(/[.!?][A-Z]/)
    }
    expect(s.messages.restored).not.toContain('planning estimate')
  })
})

describe('bulb', () => {
  it('maps band and duration to bright / flicker / off', () => {
    expect(bulbState('Low', 8, true)).toBe('bright')
    expect(bulbState('Medium', 8, true)).toBe('flicker')
    expect(bulbState('High', 8, true)).toBe('flicker')
    expect(bulbState('High', 12, true)).toBe('off')
    expect(bulbState('Low', 30, true)).toBe('off')
    expect(bulbState('Low', 1, false)).toBe('unknown')
  })
})
