import { describe, it, expect } from 'vitest'

// Funktionen aus DiaryView.vue

function vorschau(text) {
  if (text.length <= 90) return text
  return text.slice(0, 90) + '…'
}

function sortiereEintraege(eintraege) {
  return [...eintraege].sort((a, b) => a.datum.localeCompare(b.datum))
}

function eintragGueltig(text, datum) {
  return text.trim().length > 0 && datum.length > 0
}

function vorherigerEintrag(eintraege, aktuelleId) {
  const i = eintraege.findIndex(e => e.id === aktuelleId)
  if (i > 0) return eintraege[i - 1]
  return null
}

function naechsterEintrag(eintraege, aktuelleId) {
  const i = eintraege.findIndex(e => e.id === aktuelleId)
  if (i < eintraege.length - 1) return eintraege[i + 1]
  return null
}

// Tests

describe('vorschau', () => {
  it('kurzer Text bleibt unverändert', () => {
    const text = 'Heute war Bangkok schön.'
    expect(vorschau(text)).toBe(text)
  })

  it('langer Text wird auf 90 Zeichen + Auslassungszeichen gekürzt', () => {
    const lang = 'A'.repeat(120)
    expect(vorschau(lang).length).toBe(91)
    expect(vorschau(lang).endsWith('…')).toBe(true)
  })
})

describe('sortiereEintraege', () => {
  it('ältester Eintrag kommt zuerst', () => {
    const eintraege = [
      { id: 1, datum: '2024-06-20' },
      { id: 2, datum: '2024-06-15' },
    ]
    expect(sortiereEintraege(eintraege)[0].datum).toBe('2024-06-15')
  })

  it('originale Liste wird nicht verändert', () => {
    const original = [
      { id: 1, datum: '2024-06-20' },
      { id: 2, datum: '2024-06-15' },
    ]
    sortiereEintraege(original)
    expect(original[0].datum).toBe('2024-06-20')
  })
})

describe('eintragGueltig', () => {
  it('Text und Datum vorhanden → gültig', () => {
    expect(eintragGueltig('Schöner Tag', '2024-06-15')).toBe(true)
  })

  it('nur Leerzeichen im Text → ungültig', () => {
    expect(eintragGueltig('   ', '2024-06-15')).toBe(false)
  })
})

describe('Navigation zwischen Einträgen', () => {
  const eintraege = [
    { id: 1, datum: '2024-06-01' },
    { id: 2, datum: '2024-06-02' },
    { id: 3, datum: '2024-06-03' },
  ]

  it('vorherigerEintrag gibt null beim ersten Eintrag zurück', () => {
    expect(vorherigerEintrag(eintraege, 1)).toBeNull()
  })

  it('naechsterEintrag gibt null beim letzten Eintrag zurück', () => {
    expect(naechsterEintrag(eintraege, 3)).toBeNull()
  })
})
