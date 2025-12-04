import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validatePassword } from '@/lib/utils/validation';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || 'Authentication required', 401);
    }

    const body = await request.json();
    const { old_password, new_password } = body;

    if (!old_password || !new_password) {
      return createErrorResponse('Old password and new password are required', 400);
    }

    const passwordValidation = validatePassword(new_password);
    if (!passwordValidation.valid) {
      return createErrorResponse(passwordValidation.error!, 400);
    }

    // Verify old password
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
      authResult.user.userId
    );

    if (authError || !authUser.user) {
      return createErrorResponse('User not found', 404);
    }

    // Verify old password by attempting to sign in
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: authResult.user.email,
      password: old_password,
    });

    if (signInError) {
      return createErrorResponse('Current password is incorrect', 401);
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authResult.user.userId,
      { password: new_password }
    );

    if (updateError) {
      return createErrorResponse('Failed to update password', 500);
    }

    return createSuccessResponse({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

