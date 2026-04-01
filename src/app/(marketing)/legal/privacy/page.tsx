import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Read the CapitolTrades privacy policy.',
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
      <div className="space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">Privacy Policy</h1>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>We collect limited account and product usage data to operate CapitolTrades. This can include your email address, account identifiers, subscription status, and product activity.</p>
          <p>We use cookies and session storage for authentication and product functionality.</p>
          <p>We rely on third-party processors including Supabase, Stripe, Financial Modeling Prep, and Resend to deliver core functionality.</p>
          <p>We do not sell your personal data. We retain account data for as long as necessary to operate the service and comply with legal obligations.</p>
        </div>
      </div>
    </main>
  )
}
