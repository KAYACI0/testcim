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
        <div className="border-border w-full max-w-sm border bg-white p-6 shadow-sm">
          <h1 className="text-text text-base font-semibold">Oturum süresi doldu</h1>
          <p className="text-muted mt-2 text-sm">
            Bu yakalama oturumu sonlandırılmış veya süresi dolmuş olabilir. Lütfen
            bilgisayarınızdaki Testcim ekranından yeni bir QR kod oluşturunuz.
          </p>
        </div>
      </main>
    );
  }

  return <MobileCaptureClient token={token} testTitle={result.session.testTitle} />;
}
