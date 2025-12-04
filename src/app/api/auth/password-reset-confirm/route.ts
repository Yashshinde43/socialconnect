import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validatePassword } from '@/lib/utils/validation';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return createErrorResponse('Token and password are required', 400);
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return createErrorResponse(passwordValidation.error!, 400);
    }

    // Verify token and update password using Supabase Auth
    // In a real implementation, you'd verify the token first
    // For now, we'll use Supabase's built-in password reset
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (error) {
      return createErrorResponse('Invalid or expired reset token', 400);
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      data.user.id,
      { password }
    );

    if (updateError) {
      return createErrorResponse('Failed to update password', 500);
    }

    return createSuccessResponse({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset confirm error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

