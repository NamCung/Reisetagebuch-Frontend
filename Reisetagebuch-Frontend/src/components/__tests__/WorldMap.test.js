import { describe, it, expect } from 'vitest'

// Funktionen aus HomeView.vue (Weltkarte)

const ISO_FIXES = { France: 'FR', Norway: 'NO' }

function resolveIsoCode(feature) {
  const raw = feature?.properties?.['ISO3166-1-Alpha-2']
  if (raw && raw !== '-99') return raw
  return ISO_FIXES[feature?.properties?.name] ?? raw
}

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function berechneWeltprozent(besuchteAnzahl, gesamtAnzahl) {
  return Math.round((besuchteAnzahl / gesamtAnzahl) * 100)
}

function getStyle(isoCode, visitedCountries) {
  const isVisited = visitedCountries.includes(isoCode)
  return {
    fillColor: isVisited ? '#7a9b5c' : '#c8d6e5',
    fillOpacity: isVisited ? 0.85 : 0.4,
    color: isVisited ? '#5a7a3f' : '#7f8c8d',
    weight: isVisited ? 2 : 0.6,
  }
}

// Tests

describe('resolveIsoCode', () => {
  it('gibt normalen ISO-Code zurück', () => {
    const feature = { properties: { 'ISO3166-1-Alpha-2': 'DE', name: 'Germany' } }
    expect(resolveIsoCode(feature)).toBe('DE')
  })

  it('France bekommt FR weil Dataset -99 zurückgibt', () => {
    const feature = { properties: { 'ISO3166-1-Alpha-2': '-99', name: 'France' } }
    expect(resolveIsoCode(feature)).toBe('FR')
  })

  it('Norway bekommt NO weil Dataset -99 zurückgibt', () => {
    const feature = { properties: { 'ISO3166-1-Alpha-2': '-99', name: 'Norway' } }
    expect(resolveIsoCode(feature)).toBe('NO')
  })
})

describe('normalize', () => {
  it('entfernt Umlaute für die Suche', () => {
    expect(normalize('Österreich')).toBe('osterreich')
  })
})

describe('berechneWeltprozent', () => {
  it('0 besuchte Länder ergibt 0 Prozent', () => {
    expect(berechneWeltprozent(0, 193)).toBe(0)
  })

  it('alle Länder besucht ergibt 100 Prozent', () => {
    expect(berechneWeltprozent(193, 193)).toBe(100)
  })
})

describe('getStyle', () => {
  it('besuchtes Land bekommt grüne Farbe', () => {
    const style = getStyle('DE', ['DE', 'FR'])
    expect(style.fillColor).toBe('#7a9b5c')
  })

  it('unbesuchtes Land bekommt blaue Farbe', () => {
    const style = getStyle('JP', ['DE', 'FR'])
    expect(style.fillColor).toBe('#c8d6e5')
  })
})
