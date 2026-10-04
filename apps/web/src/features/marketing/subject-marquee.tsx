import { getTranslations } from 'next-intl/server';

const MARKERS = ['bg-accent', 'bg-ok', 'bg-warn', 'bg-err'] as const;

function SubjectRow({ subjects }: { subjects: readonly string[] }) {
  return (
    <ul className="flex shrink-0 items-center gap-3 pr-3">
      {subjects.map((subject, index) => (
        <li
          key={subject}
          className="flex items-center gap-2 rounded-control border border-line bg-surface px-3 py-1.5 text-sm font-medium whitespace-nowrap text-ink"
        >
          <span className={`size-2 rounded-thumb ${MARKERS[index % MARKERS.length]}`} />
          {subject}
        </li>
      ))}
    </ul>
  );
}

export async function SubjectMarquee() {
  const t = await getTranslations('marketing.home.hero');
  const subjects = t.raw('subjects') as string[];

  return (
    <section
      aria-label={t('subjectsLabel')}
      className="hero-marquee overflow-hidden border-y border-line bg-canvas py-4"
    >
      <div className="hero-marquee-track flex w-max">
        <SubjectRow subjects={subjects} />
        <div aria-hidden="true">
          <SubjectRow subjects={subjects} />
        </div>
      </div>
    </section>
  );
}
