import { NextResponse, type NextRequest } from 'next/server';

import { sanitizeRedirectPath } from '@testcim/shared';

import { createClient } from '@/lib/supabase/server';

/** OAuth (Google) redirect target: exchanges the PKCE code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = sanitizeRedirectPath(searchParams.get('next'), '/home');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
