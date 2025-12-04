import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || 'Authentication required', 401);
    }

    // Get refresh token from request
    const body = await request.json().catch(() => ({}));
    const { refresh_token } = body;

    if (refresh_token) {
      // Blacklist refresh token
      await supabaseAdmin
        .from('refresh_tokens')
        .delete()
        .eq('token', refresh_token);
    } else {
      // Delete all refresh tokens for user
      await supabaseAdmin
        .from('refresh_tokens')
        .delete()
        .eq('user_id', authResult.user.userId);
    }

    return createSuccessResponse({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

