import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BeispielListe from '../BeispielListe.vue'

describe('BeispielListe', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the heading "Meine Reisen"', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([]),
    })
    const wrapper = mount(BeispielListe)
    expect(wrapper.text()).toContain('Meine Reisen')
  })

  it('displays countries fetched from backend', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve([
          { id: 1, country: 'Japan', countryCode: 'JP' },
          { id: 2, country: 'Frankreich', countryCode: 'FR' },
        ]),
    })
    const wrapper = mount(BeispielListe)
    await flushPromises()
    expect(wrapper.text()).toContain('Japan')
    expect(wrapper.text()).toContain('Frankreich')
  })

  it('shows "Noch keine Reisen gespeichert." when list is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([]),
    })
    const wrapper = mount(BeispielListe)
    await flushPromises()
    expect(wrapper.text()).toContain('Noch keine Reisen gespeichert.')
  })
})
