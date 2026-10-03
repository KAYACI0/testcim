'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { sanitizeRedirectPath } from '@testcim/shared';

import { clientEnv } from '@/lib/env.client';
import { createClient } from '@/lib/supabase/server';

export interface AuthFormState {
  readonly status: 'idle' | 'sent' | 'error';
  readonly message?: string;
}

export type OtpFormState = AuthFormState;

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

/** E-posta ve şifre ile oturum açar. */
export async function signInWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawEmail = formData.get('email');
  const cleanEmail = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const email = emailSchema.safeParse(cleanEmail);
  const password = formData.get('password');

  if (!email.success) {
    return { status: 'error', message: 'invalid_email' };
  }

  if (typeof password !== 'string' || !password) {
    return { status: 'error', message: 'Lütfen şifrenizi girin.' };
  }

  const rawNext = formData.get('next');
  const nextPath = sanitizeRedirectPath(rawNext, '/home');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.data,
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { status: 'error', message: 'E-posta veya şifre hatalı.' };
    }
    return { status: 'error', message: error.message };
  }

  redirect(nextPath);
}

/** E-posta ve şifre ile yeni hesap kaydı oluşturur. */
export async function signUpWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawEmail = formData.get('email');
  const cleanEmail = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const email = emailSchema.safeParse(cleanEmail);
  const password = formData.get('password');

  if (!email.success) {
    return { status: 'error', message: 'invalid_email' };
  }

  if (typeof password !== 'string' || password.length < 6) {
    return { status: 'error', message: 'Şifre en az 6 karakter olmalıdır.' };
  }

  const origin = await getRequestOrigin();
  const rawNext = formData.get('next');
  const nextPath = sanitizeRedirectPath(rawNext, '/home');

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });

  if (error) {
    return { status: 'error', message: error.message };
  }

  if (data.session) {
    redirect(nextPath);
  }

  return {
    status: 'sent',
    message: 'Kayıt başarılı! E-posta onayı gerekiyorsa gelen kutunuzu kontrol edin veya giriş yapın.',
  };
}

/** Sends a magic-link/OTP email. Supabase's confirmation link lands on `/auth/callback`. */
export async function requestOtp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const rawEmail = formData.get('email');
  const cleanEmail = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  const email = emailSchema.safeParse(cleanEmail);

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
