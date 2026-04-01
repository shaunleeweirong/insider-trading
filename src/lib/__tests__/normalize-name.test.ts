import { describe, expect, it } from 'vitest'

import { normalizePoliticianName, parseFirstLast } from '../normalize-name'

describe('normalizePoliticianName', () => {
  it('normalizes last first format', () => {
    expect(normalizePoliticianName('Pelosi, Nancy')).toBe('nancy pelosi')
  })

  it('normalizes first last format', () => {
    expect(normalizePoliticianName('Nancy Pelosi')).toBe('nancy pelosi')
  })

  it('normalizes all caps names', () => {
    expect(normalizePoliticianName('PELOSI NANCY')).toBe('nancy pelosi')
  })

  it('strips hon honorifics', () => {
    expect(normalizePoliticianName('Hon. Nancy Pelosi')).toBe('nancy pelosi')
  })

  it('strips sen honorifics', () => {
    expect(normalizePoliticianName('Sen. Nancy Pelosi')).toBe('nancy pelosi')
  })

  it('strips rep honorifics', () => {
    expect(normalizePoliticianName('Rep. Nancy Pelosi')).toBe('nancy pelosi')
  })

  it('strips jr suffixes', () => {
    expect(normalizePoliticianName('Nancy Pelosi Jr.')).toBe('nancy pelosi')
  })

  it('strips sr suffixes', () => {
    expect(normalizePoliticianName('Nancy Pelosi Sr.')).toBe('nancy pelosi')
  })

  it('strips roman numeral suffixes', () => {
    expect(normalizePoliticianName('Nancy Pelosi III')).toBe('nancy pelosi')
  })

  it('strips middle initials', () => {
    expect(normalizePoliticianName('Nancy A. Pelosi')).toBe('nancy pelosi')
  })

  it('collapses extra whitespace', () => {
    expect(normalizePoliticianName('  Nancy  Pelosi  ')).toBe('nancy pelosi')
  })

  it('normalizes last first middle format', () => {
    expect(normalizePoliticianName('McConnell, Addison Mitchell')).toBe(
      'addison mitchell mcconnell',
    )
  })
})

describe('parseFirstLast', () => {
  it('parses last first format', () => {
    expect(parseFirstLast('Pelosi, Nancy')).toEqual({
      firstName: 'Nancy',
      lastName: 'Pelosi',
    })
  })

  it('parses first last format', () => {
    expect(parseFirstLast('Nancy Pelosi')).toEqual({
      firstName: 'Nancy',
      lastName: 'Pelosi',
    })
  })

  it('parses names with honorifics', () => {
    expect(parseFirstLast('Hon. Nancy Pelosi')).toEqual({
      firstName: 'Nancy',
      lastName: 'Pelosi',
    })
  })

  it('parses names with middle initials', () => {
    expect(parseFirstLast('Nancy A. Pelosi')).toEqual({
      firstName: 'Nancy',
      lastName: 'Pelosi',
    })
  })

  it('preserves original casing while parsing', () => {
    expect(parseFirstLast('mCcOnNeLl, Addison Mitchell')).toEqual({
      firstName: 'Addison',
      lastName: 'mCcOnNeLl',
    })
  })

  it('parses names with suffixes', () => {
    expect(parseFirstLast('Nancy Pelosi Jr.')).toEqual({
      firstName: 'Nancy',
      lastName: 'Pelosi',
    })
  })
})
