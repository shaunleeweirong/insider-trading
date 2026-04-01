function cleanName(rawName: string): string {
  return rawName.trim().replace(/\s+/g, ' ')
}

function stripHonorific(value: string): string {
  return value.replace(/^(hon|sen|rep)\.?\s+/i, '')
}

function stripSuffix(value: string): string {
  return value.replace(/\s+,?(jr|sr|ii|iii|iv|v)\.?$/i, '')
}

function stripMiddleInitials(value: string): string {
  const parts = value.split(' ').filter(Boolean)

  if (parts.length <= 2) {
    return value
  }

  return parts.filter((part, index) => {
    if (index === 0 || index === parts.length - 1) {
      return true
    }

    return !/^[A-Za-z]\.?$/.test(part)
  }).join(' ')
}

function reorderName(cleanedName: string): string {
  if (cleanedName.includes(',')) {
    const [lastNamePart = '', remainingPart = ''] = cleanedName.split(',', 2)
    return `${remainingPart.trim()} ${lastNamePart.trim()}`.trim()
  }

  const parts = cleanedName.split(' ').filter(Boolean)

  if (parts.length === 2 && parts.every((part) => part === part.toUpperCase())) {
    return `${parts[1]} ${parts[0]}`
  }

  return cleanedName
}

function getNameParts(rawName: string): string[] {
  const cleaned = cleanName(rawName)
  const withoutHonorific = stripHonorific(cleaned)
  const withoutSuffix = stripSuffix(withoutHonorific)

  if (withoutSuffix.includes(',')) {
    const [lastNamePart = '', remainingPart = ''] = withoutSuffix.split(',', 2)
    const firstParts = stripMiddleInitials(cleanName(remainingPart)).split(' ').filter(Boolean)
    return [...firstParts, cleanName(lastNamePart)].filter(Boolean)
  }

  const reordered = reorderName(withoutSuffix)
  const withoutMiddleInitials = stripMiddleInitials(reordered)
  return withoutMiddleInitials.split(' ').filter(Boolean)
}

export function normalizePoliticianName(rawName: string): string {
  return getNameParts(rawName)
    .map((part) => part.toLowerCase())
    .join(' ')
}

export function parseFirstLast(rawName: string): { firstName: string; lastName: string } {
  const parts = getNameParts(rawName)
  const firstName = parts[0] ?? ''
  const lastName = parts[parts.length - 1] ?? ''

  return {
    firstName,
    lastName,
  }
}
