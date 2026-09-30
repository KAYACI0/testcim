import { notFound } from 'next/navigation';

import { ExamClient } from './exam-client';

import { getPublicExamInfo } from '@/features/online-exam/anon.server';

export default async function StudentExamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exam = await getPublicExamInfo(slug);

  if (!exam) {
    notFound();
  }

  return <ExamClient slug={slug} exam={exam} />;
}
