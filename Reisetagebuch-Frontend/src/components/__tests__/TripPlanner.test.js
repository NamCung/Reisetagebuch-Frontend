import { describe, it, expect } from 'vitest'

// Funktionen aus TripPlannerView.vue

const KATEGORIEN = {
  SEHENSWUERDIGKEIT: { label: 'Sehenswürdigkeit', icon: '📍', farbe: '#c9963f' },
  RESTAURANT:        { label: 'Restaurant',        icon: '🍴', farbe: '#e07a5f' },
  HOTEL:             { label: 'Hotel',             icon: '🛏️', farbe: '#7a9b5c' },
  SONSTIGES:         { label: 'Sonstiges',         icon: '⭐', farbe: '#8c8c8c' },
}

function kategorieInfo(wert) {
  if (KATEGORIEN[wert]) return KATEGORIEN[wert]
  return KATEGORIEN.SONSTIGES
}

function zeileStatus(reise) {
  if (reise.status !== 'GEPLANT' || !reise.reiseziel || !reise.startDatum || !reise.endDatum) {
    return { text: 'Details fehlen', klasse: 'keine-details' }
  }
  const heute = new Date()
  heute.setHours(0, 0, 0, 0)
  const start = new Date(reise.startDatum)
  start.setHours(0, 0, 0, 0)
  const ende = new Date(reise.endDatum)
  ende.setHours(0, 0, 0, 0)
  if (heute < start) {
    const tage = Math.ceil((start - heute) / 86400000)
    return { text: 'in ' + tage + ' Tag' + (tage === 1 ? '' : 'en'), klasse: 'countdown' }
  }
  if (heute <= ende) {
    const tagAktuell = Math.floor((heute - start) / 86400000) + 1
    const tagGesamt  = Math.floor((ende  - start) / 86400000) + 1
    return { text: 'Läuft gerade (Tag ' + tagAktuell + ' von ' + tagGesamt + ')', klasse: 'laeuft' }
  }
  return { text: 'Abgeschlossen', klasse: 'abgeschlossen' }
}

function sortiereReisen(reisen) {
  const kopie = [...reisen]
  kopie.sort((a, b) => {
    if (a.status === 'GEPLANT' && b.status !== 'GEPLANT') return -1
    if (a.status !== 'GEPLANT' && b.status === 'GEPLANT') return 1
    if (!a.startDatum) return 1
    if (!b.startDatum) return -1
    return a.startDatum.localeCompare(b.startDatum)
  })
  return kopie
}

function datumGueltig(startDatum, endDatum) {
  if (!startDatum || !endDatum) return true
  return endDatum >= startDatum
}

// Tests

describe('kategorieInfo', () => {
  it('gibt Sehenswürdigkeit mit richtigem Icon zurück', () => {
    const info = kategorieInfo('SEHENSWUERDIGKEIT')
    expect(info.icon).toBe('📍')
    expect(info.label).toBe('Sehenswürdigkeit')
  })

  it('unbekannte Kategorie fällt auf Sonstiges zurück', () => {
    const info = kategorieInfo('IRGENDWAS')
    expect(info.label).toBe('Sonstiges')
  })
})

describe('zeileStatus', () => {
  it('Entwurf → Details fehlen', () => {
    const reise = { status: 'ENTWURF', reiseziel: 'Japan', startDatum: '2099-01-01', endDatum: '2099-01-10' }
    expect(zeileStatus(reise).text).toBe('Details fehlen')
  })

  it('vergangene Reise → Abgeschlossen', () => {
    const reise = { status: 'GEPLANT', reiseziel: 'Japan', startDatum: '2020-01-01', endDatum: '2020-01-10' }
    expect(zeileStatus(reise).text).toBe('Abgeschlossen')
  })

  it('zukünftige Reise → Countdown', () => {
    const reise = { status: 'GEPLANT', reiseziel: 'Japan', startDatum: '2099-01-01', endDatum: '2099-01-10' }
    expect(zeileStatus(reise).klasse).toBe('countdown')
  })
})

describe('sortiereReisen', () => {
  it('GEPLANT kommt vor ENTWURF', () => {
    const reisen = [
      { id: 1, status: 'ENTWURF', startDatum: '2025-01-01' },
      { id: 2, status: 'GEPLANT', startDatum: '2025-06-01' },
    ]
    expect(sortiereReisen(reisen)[0].status).toBe('GEPLANT')
  })

  it('frühere Reise kommt vor späterer', () => {
    const reisen = [
      { id: 1, status: 'GEPLANT', startDatum: '2025-12-01' },
      { id: 2, status: 'GEPLANT', startDatum: '2025-03-01' },
    ]
    expect(sortiereReisen(reisen)[0].startDatum).toBe('2025-03-01')
  })
})

describe('datumGueltig', () => {
  it('Enddatum vor Startdatum ist ungültig', () => {
    expect(datumGueltig('2025-01-10', '2025-01-01')).toBe(false)
  })

  it('Enddatum nach Startdatum ist gültig', () => {
    expect(datumGueltig('2025-01-01', '2025-01-10')).toBe(true)
  })
})
