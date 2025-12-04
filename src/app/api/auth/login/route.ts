import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, password } = body;

    if (!password || (!email && !username)) {
      return createErrorResponse('Email/username and password are required', 400);
    }

    // Find user by email or username
    let profile;
    if (email) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        return createErrorResponse('Invalid credentials', 401);
      }
      profile = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data) {
        return createErrorResponse('Invalid credentials', 401);
      }
      profile = data;
    }

    // Check if user is active
    if (!profile.is_active) {
      return createErrorResponse('Account is deactivated', 403);
    }

    // Get auth user to verify password AND email verification status
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
      profile.id,
    );

    if (authError || !authUser.user) {
      return createErrorResponse('Invalid credentials', 401);
    }

    // Enforce email verification before allowing login
    if (!authUser.user.email_confirmed_at) {
      return createErrorResponse(
        'Please verify your email address before logging in. Check your inbox for a confirmation link.',
        403,
      );
    }

    // Verify password using Supabase Auth
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (signInError || !signInData.user) {
      return createErrorResponse('Invalid credentials', 401);
    }

    // Mark profile as verified if it isn't already
    if (!profile.is_verified) {
      await supabaseAdmin
        .from('profiles')
        .update({ is_verified: true, last_login: new Date().toISOString() })
        .eq('id', profile.id);
    } else {
      // Update last login
      await supabaseAdmin
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', profile.id);
    }

    // Generate tokens
    const tokenPayload = {
      userId: profile.id,
      email: profile.email,
      role: profile.role,
    };

    const access_token = generateAccessToken(tokenPayload);
    const refresh_token = generateRefreshToken(tokenPayload);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await supabaseAdmin.from('refresh_tokens').insert({
      user_id: profile.id,
      token: refresh_token,
      expires_at: expiresAt.toISOString(),
    });

    return createSuccessResponse({
      access_token,
      refresh_token,
      user: { ...profile, is_verified: true },
    });
  } catch (error) {
    console.error('Login error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

