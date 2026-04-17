import { afterEach, describe, expect, it, vi } from 'vitest'

describe('test environment shims', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('handles pseudo-element getComputedStyle calls without logging jsdom not-implemented warnings', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const element = document.createElement('div')

    document.body.appendChild(element)

    const style = window.getComputedStyle(element, '::before')

    expect(style).toBeInstanceOf(CSSStyleDeclaration)
    expect(consoleError).not.toHaveBeenCalled()

    element.remove()
  })
})
