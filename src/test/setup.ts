import '@testing-library/jest-dom/vitest'

const originalGetComputedStyle = window.getComputedStyle.bind(window)

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false
  })
})

Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: (element: Element, pseudoElt?: string | null) => {
    // jsdom logs a not-implemented warning for pseudo-elements; fall back to base styles in tests.
    if (typeof pseudoElt === 'string' && pseudoElt.length > 0) {
      return originalGetComputedStyle(element)
    }

    return originalGetComputedStyle(element, pseudoElt)
  }
})

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => undefined
})
