import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the CapitolTrades terms of service.',
}

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
      <div className="space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">Terms of Service</h1>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>By using CapitolTrades, you agree to use the service lawfully and responsibly. You may not misuse the platform, interfere with availability, or attempt unauthorized access.</p>
          <p>The service is provided on an “as is” and “as available” basis, without warranties of any kind.</p>
          <p>We may update, suspend, or discontinue features at any time. Your continued use of the service after updates constitutes acceptance of revised terms.</p>
          <p>To the maximum extent permitted by law, CapitolTrades is not liable for indirect, incidental, special, consequential, or investment-related losses arising from use of the service.</p>
        </div>
      </div>
    </main>
  )
}
