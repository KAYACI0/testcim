import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';

export const alt = 'Testcim';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Text-only card. Colours mirror the design tokens (ink, ink-2, accent, surface);
// ImageResponse cannot read CSS variables, and hex values stay in tokens.css.
export default async function OpengraphImage() {
  const t = await getTranslations('marketing.home');

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 96,
        background: 'rgb(255 255 255)',
        borderLeft: '16px solid rgb(35 64 143)',
      }}
    >
      <div style={{ fontSize: 88, fontWeight: 600, color: 'rgb(28 34 48)' }}>Testcim</div>
      <div style={{ marginTop: 24, fontSize: 40, color: 'rgb(85 96 112)', maxWidth: 900 }}>
        {t('title')}
      </div>
    </div>,
    { ...size },
  );
}
