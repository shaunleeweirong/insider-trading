import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://capitoltrades.app'

  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/pricing',
    '/politicians',
    '/login',
    '/signup',
    '/legal/disclaimer',
    '/legal/privacy',
    '/legal/terms',
    '/dashboard',
    '/settings/billing',
    '/settings/alerts',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }))

  return staticRoutes
}
