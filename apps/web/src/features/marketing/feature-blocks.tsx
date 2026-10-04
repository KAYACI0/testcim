import { getTranslations } from 'next-intl/server';

const BLOCK_KEYS = ['capture', 'layout', 'exam', 'bank'] as const;

export async function FeatureBlocks() {
  const t = await getTranslations('marketing.home.blocks');

  return (
    <ul className="mt-10 grid border-t border-line md:grid-cols-2">
      {BLOCK_KEYS.map((key, index) => (
        <li
          key={key}
          className={`flex flex-col gap-4 border-b border-line py-8 md:px-8 ${
            index % 2 === 0 ? 'md:border-r md:pl-0' : 'md:pr-0'
          }`}
        >
          <span className="text-sm text-ink-3 tabular-nums">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-semibold text-ink">{t(`${key}.title`)}</h3>
            <p className="text-ink-2">{t(`${key}.summary`)}</p>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-ink">
            {(t.raw(`${key}.points`) as string[]).map((point) => (
              <li key={point} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-accent" />
                {point}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
