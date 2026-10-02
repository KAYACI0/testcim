import { notFound } from 'next/navigation';

import { MobileCaptureClient } from './mobile-capture-client';

import { getMobileCaptureSessionAction } from '@/features/capture/session.server';

interface PageProps {
  readonly params: Promise<{ token: string }>;
}

export default async function MobileCapturePage({ params }: PageProps) {
  const { token } = await params;
  if (!token) {
    notFound();
  }

  const result = await getMobileCaptureSessionAction(token);
  if (!result.ok || !result.session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-4 text-center">
        <div className="w-full max-w-sm border border-border bg-white p-6 shadow-sm">
          <h1 className="text-base font-semibold text-text">Oturum süresi doldu</h1>
          <p className="mt-2 text-sm text-muted">
            Bu yakalama oturumu sonlandırılmış veya süresi dolmuş olabilir. Lütfen bilgisayarınızdaki
            Testcim ekranından yeni bir QR kod oluşturunuz.
          </p>
        </div>
      </main>
    );
  }

  return <MobileCaptureClient token={token} testTitle={result.session.testTitle} />;
}
