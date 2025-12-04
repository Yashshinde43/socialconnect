import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateEmail } from '@/lib/utils/validation';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return createErrorResponse(emailValidation.error!, 400);
    }

    // Check if user exists
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    if (error || !profile) {
      // Don't reveal if email exists for security
      return createSuccessResponse({
        message: 'If the email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token using Supabase Auth
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: profile.email,
    });

    if (resetError) {
      return createErrorResponse('Failed to generate reset link', 500);
    }

    // In production, send email with reset link
    // For now, we'll just return success
    // The reset link would be: resetData.properties.action_link

    return createSuccessResponse({
      message: 'If the email exists, a password reset link has been sent.',
      // In development, you might want to return the link:
      // reset_link: resetData.properties.action_link,
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

