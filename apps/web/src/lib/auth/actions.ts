'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { sanitizeRedirectPath } from '@testcim/shared';

import { clientEnv } from '@/lib/env.client';
import { createClient } from '@/lib/supabase/server';

export interface OtpFormState {
  readonly status: 'idle' | 'sent' | 'error';
  readonly message?: string;
}

const emailSchema = z.email();

async function getRequestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') || headerList.get('host');
  const proto = headerList.get('x-forwarded-proto') || 'https';
  if (host) {
    return `${proto}://${host}`;
  }
  return clientEnv.NEXT_PUBLIC_SITE_URL;
}

/** Sends a magic-link/OTP email. Supabase's confirmation link lands on `/auth/callback`. */
export async function requestOtp(_prev: OtpFormState, formData: FormData): Promise<OtpFormState> {
  const email = emailSchema.safeParse(formData.get('email'));

  if (!email.success) {
    return { status: 'error', message: 'invalid_email' };
  }

  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { status: 'error', message: error.message };
  }

  return { status: 'sent' };
}

/** Starts the Google OAuth flow; the callback route exchanges the code and redirects onward. */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const rawNext = formData.get('next');
  const nextPath = sanitizeRedirectPath(rawNext, '/home');
  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });

  if (error || !data.url) {
    throw error ?? new Error('oauth_url_missing');
  }

  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
