import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return createErrorResponse('Refresh token is required', 400);
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refresh_token);
    } catch (error) {
      return createErrorResponse('Invalid or expired refresh token', 401);
    }

    // Check if token exists in database
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('refresh_tokens')
      .select('*')
      .eq('token', refresh_token)
      .eq('user_id', payload.userId)
      .single();

    if (tokenError || !tokenData) {
      return createErrorResponse('Invalid refresh token', 401);
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      // Delete expired token
      await supabaseAdmin
        .from('refresh_tokens')
        .delete()
        .eq('token', refresh_token);
      return createErrorResponse('Refresh token expired', 401);
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', payload.userId)
      .single();

    if (profileError || !profile || !profile.is_active) {
      return createErrorResponse('User not found or inactive', 401);
    }

    // Generate new tokens
    const tokenPayload = {
      userId: profile.id,
      email: profile.email,
      role: profile.role,
    };

    const new_access_token = generateAccessToken(tokenPayload);
    const new_refresh_token = generateRefreshToken(tokenPayload);

    // Delete old refresh token and store new one
    await supabaseAdmin
      .from('refresh_tokens')
      .delete()
      .eq('token', refresh_token);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await supabaseAdmin.from('refresh_tokens').insert({
      user_id: profile.id,
      token: new_refresh_token,
      expires_at: expiresAt.toISOString(),
    });

    return createSuccessResponse({
      access_token: new_access_token,
      refresh_token: new_refresh_token,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

