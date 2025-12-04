import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Email confirmation callback
 *
 * This route is called from the Supabase \"Confirm signup\" email template.
 * Template URL should be:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'email' | null;

  const redirectUrl = process.env.NEXT_PUBLIC_APP_URL ?? '/login';

  if (!token_hash || !type) {
    return NextResponse.redirect(`${redirectUrl}?verification=invalid`);
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (error) {
      console.error('Email verification error:', error);
      return NextResponse.redirect(`${redirectUrl}?verification=failed`);
    }

    // On success, redirect to login with a success flag
    return NextResponse.redirect(`${redirectUrl}?verification=success`);
  } catch (error) {
    console.error('Email verification internal error:', error);
    return NextResponse.redirect(`${redirectUrl}?verification=failed`);
  }
}


