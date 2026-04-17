import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const stylePath = resolve(dirname(fileURLToPath(import.meta.url)), 'style.css')

describe('desktop navigation dropdown styles', () => {
  test('adds a hover bridge above grouped menus to keep the dropdown reachable', () => {
    const css = readFileSync(stylePath, 'utf8')

    expect(css).toContain('.app-nav-group-menu::before')
    expect(css).toMatch(/\.app-nav-group-menu\s*\{[\s\S]*z-index:\s*\d+;/)
    expect(css).toMatch(/\.app-nav-group-menu::before\s*\{[\s\S]*position:\s*absolute;/)
    expect(css).toMatch(/\.app-nav-group-menu::before\s*\{[\s\S]*top:\s*-0\.5rem;/)
    expect(css).toMatch(/\.app-nav-group-menu::before\s*\{[\s\S]*height:\s*0\.5rem;/)
    expect(css).toMatch(/\.app-nav-group\.is-open\s+\.app-nav-group-menu\s*\{[\s\S]*pointer-events:\s*auto;/)
  })
})
