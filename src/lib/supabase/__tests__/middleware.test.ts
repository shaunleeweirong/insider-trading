import { describe, expect, it } from 'vitest'
import {
  isProtectedRoute,
  isPublicRoute,
  matchesRoute,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
} from '../middleware'

describe('matchesRoute', () => {
  it('returns true for an exact match', () => {
    expect(matchesRoute('/dashboard', ['/dashboard'])).toBe(true)
  })

  it('returns true for a sub-path match', () => {
    expect(matchesRoute('/dashboard/settings', ['/dashboard'])).toBe(true)
  })

  it('returns false when no routes match', () => {
    expect(matchesRoute('/other', ['/dashboard'])).toBe(false)
  })

  it('does not match partial path segments', () => {
    expect(matchesRoute('/dashboardx', ['/dashboard'])).toBe(false)
  })

  it('returns false for an empty routes array', () => {
    expect(matchesRoute('/anything', [])).toBe(false)
  })
})

describe('isProtectedRoute', () => {
  it.each(PROTECTED_ROUTES)('marks %s as protected', (route) => {
    expect(isProtectedRoute(route)).toBe(true)
  })

  it('marks sub-paths of protected routes as protected', () => {
    expect(isProtectedRoute('/dashboard/overview')).toBe(true)
    expect(isProtectedRoute('/settings/profile')).toBe(true)
    expect(isProtectedRoute('/api/export/csv')).toBe(true)
    expect(isProtectedRoute('/api/follow/123')).toBe(true)
  })

  it.each(PUBLIC_ROUTES)('does not mark public route %s as protected', (route) => {
    expect(isProtectedRoute(route)).toBe(false)
  })

  it('returns false for unknown routes', () => {
    expect(isProtectedRoute('/unknown')).toBe(false)
    expect(isProtectedRoute('/api/other')).toBe(false)
  })
})

describe('isPublicRoute', () => {
  it.each(PUBLIC_ROUTES)('marks %s as public', (route) => {
    expect(isPublicRoute(route)).toBe(true)
  })

  it('marks sub-paths of public routes as public', () => {
    expect(isPublicRoute('/api/trades/AAPL')).toBe(true)
    expect(isPublicRoute('/api/politicians/pelosi')).toBe(true)
  })

  it.each(PROTECTED_ROUTES)('does not mark protected route %s as public', (route) => {
    expect(isPublicRoute(route)).toBe(false)
  })

  it('returns false for unknown routes', () => {
    expect(isPublicRoute('/unknown')).toBe(false)
  })
})

describe('route classification coverage', () => {
  it('protected and public route lists do not overlap', () => {
    const overlap = PROTECTED_ROUTES.filter((r) => PUBLIC_ROUTES.includes(r))
    expect(overlap).toEqual([])
  })

  it('root path is public', () => {
    expect(isPublicRoute('/')).toBe(true)
    expect(isProtectedRoute('/')).toBe(false)
  })
})
