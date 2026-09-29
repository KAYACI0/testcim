'use server';

import { redirect } from 'next/navigation';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

export async function saveOnboarding(formData: FormData): Promise<void> {
  const session = await requireSession();
  const supabase = await createClient();

  const role = formData.get('role');
  const subject = formData.get('subject');
  const gradeLevel = formData.get('gradeLevel');

  await supabase
    .from('profiles')
    .update({
      onboarding: {
        completed: true,
        role: typeof role === 'string' && role ? role : null,
        subject: typeof subject === 'string' && subject ? subject : null,
        gradeLevel: typeof gradeLevel === 'string' && gradeLevel ? gradeLevel : null,
      },
    })
    .eq('id', session.userId);

  redirect('/home');
}

export async function skipOnboarding(): Promise<void> {
  const session = await requireSession();
  const supabase = await createClient();

  await supabase
    .from('profiles')
    .update({ onboarding: { completed: true, skipped: true } })
    .eq('id', session.userId);

  redirect('/home');
}
