/**
 * Labels drawn directly on the karne PDF (`@testcim/renderers` has no i18n dependency).
 * Shared between the server action (single karne) and the bulk Worker (whole class).
 */
export const reportCardLabels = {
  title: 'Karne',
  studentNoLabel: 'Numara',
  classLabel: 'Sınıf',
  scoresTitle: 'Sonuçlar',
  outcomesTitle: 'Kazanımlar',
  summaryTitle: 'Öğretmen değerlendirmesi',
  scoreColumn: 'Puan',
  dateColumn: 'Tarih',
} as const;
