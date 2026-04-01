import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Disclaimer',
  description: 'Read the CapitolTrades financial and data disclaimer.',
}

export default function DisclaimerPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
      <div className="space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">Disclaimer</h1>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>CapitolTrades is provided for informational and research purposes only. Nothing on this site is financial advice, investment advice, legal advice, or tax advice.</p>
          <p>Data may be delayed, incomplete, reformatted, or unavailable at times. We do not guarantee accuracy, completeness, timeliness, or fitness for any particular purpose.</p>
          <p>You are solely responsible for any investment or business decisions you make based on information presented here.</p>
          <p>Data provided by Financial Modeling Prep and other third-party providers.</p>
        </div>
      </div>
    </main>
  )
}
