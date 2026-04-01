import Link from 'next/link'
import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'CapitolTrades — Track Congressional Stock Trades',
  description:
    'Track congressional trades, search politicians, and monitor transparency signals from Capitol Hill.',
}

const features = [
  {
    title: 'Track trades fast',
    description: 'See new congressional disclosures in a clean feed built for daily monitoring.',
  },
  {
    title: 'Search any politician',
    description: 'Filter by name, chamber, and party to get straight to the members you care about.',
  },
  {
    title: 'Get alerts',
    description: 'Follow politicians and receive email alerts when new trades are synced.',
  },
  {
    title: 'Export and analyze',
    description: 'Unlock CSV export and performance views for deeper research workflows.',
  },
]

export default function MarketingHomePage() {
  return (
    <main>
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-28">
          <div className="space-y-6">
            <Badge variant="secondary">Public market transparency</Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Track congressional stock trades without digging through raw disclosures.
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                CapitolTrades makes public congressional trading data searchable, readable, and actionable — with alerts,
                exports, and history when you need more than a spreadsheet.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">Get Started Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>

          <Card className="border-foreground/10 bg-background shadow-sm">
            <CardHeader>
              <CardTitle>Built for signal, not noise</CardTitle>
              <CardDescription>
                Monitor activity across 535+ members of Congress with a workflow tuned for research and accountability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Coverage</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">535+ members</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Alerts</div>
                  <div className="mt-2 text-lg font-medium text-foreground">Email updates</div>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Exports</div>
                  <div className="mt-2 text-lg font-medium text-foreground">CSV ready</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="space-y-3">
          <Badge variant="secondary">Features</Badge>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Everything you need to monitor public trade disclosures</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Start with a fast search and recent activity, then upgrade when you want alerts, exports, and full history.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{feature.description}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-16 text-center sm:px-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Social proof</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Track trades from 535+ members of Congress</h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Public market data is only useful if it is accessible. CapitolTrades helps you turn disclosures into a usable research surface.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Card className="border-foreground/10 bg-background">
          <CardHeader>
            <CardTitle>Start free. Upgrade when you need full visibility.</CardTitle>
            <CardDescription>
              Explore recent disclosures now, then unlock alerts, exports, and deeper history with Premium.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/signup">Get Started Free</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">See Pricing</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <span>Not financial advice. Data may be delayed. See disclaimer.</span>
          <div className="flex gap-4">
            <Link href="/legal/disclaimer" className="underline underline-offset-4 hover:text-foreground">
              Disclaimer
            </Link>
            <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy
            </Link>
            <Link href="/legal/terms" className="underline underline-offset-4 hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
