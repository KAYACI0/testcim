'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

export interface ProfileActionState {
  readonly status: 'idle' | 'saved' | 'error';
  readonly message?: string;
}

const updateProfileSchema = z.object({ fullName: z.string().trim().min(2).max(120) });

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const session = await requireSession();
  const parsed = updateProfileSchema.safeParse({ fullName: formData.get('fullName') });

  if (!parsed.success) {
    return { status: 'error', message: 'invalid_name' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.fullName })
    .eq('id', session.userId);

  if (error) {
    return { status: 'error', message: error.message };
  }

  revalidatePath('/settings/profile');
  return { status: 'saved' };
}
