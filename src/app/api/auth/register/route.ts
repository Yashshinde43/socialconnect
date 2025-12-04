import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import { validateEmail, validateUsername, validatePassword } from '@/lib/utils/validation';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

/**
 * User Registration
 *
 * Uses Supabase `auth.signUp` so that EVERY normal signup triggers
 * a confirmation email. The user is NOT logged in until they verify.
 *
 * Supabase configuration required (in dashboard):
 * - Enable "Email confirmations" for signups
 * - Set Site URL to your app (e.g. http://localhost:3000)
 * - Update "Confirm signup" template link to:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, password, first_name, last_name } = body;

    // Validate input
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return createErrorResponse(emailValidation.error!, 400);
    }

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return createErrorResponse(usernameValidation.error!, 400);
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return createErrorResponse(passwordValidation.error!, 400);
    }

    // Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return createErrorResponse('Username already taken', 409);
    }

    // Check if email already exists
    const { data: existingEmail } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return createErrorResponse('Email already registered', 409);
    }

    // Create user in Supabase Auth using signUp so it sends a confirmation email
    // Use the anon key client for signUp (service role doesn't support signUp)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      return createErrorResponse('Supabase configuration missing', 500);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          first_name,
          last_name,
        },
        // Optional but explicit; Supabase will also use SiteURL + template
        emailRedirectTo: `${
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }/auth/confirm`,
      },
    });

    if (signUpError || !signUpData.user) {
      return createErrorResponse(signUpError?.message || 'Failed to create user', 400);
    }

    // Create or update profile.
    // In some environments (especially production), you might already have a trigger
    // that inserts into `profiles` on user signup. Using `upsert` avoids duplicate-key
    // errors when a profile row is created automatically by Supabase.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: signUpData.user.id,
          username,
          email,
          first_name: first_name || null,
          last_name: last_name || null,
          is_verified: false,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (profileError || !profile) {
      console.error('Profile creation error:', profileError);
      // Clean up auth user if profile creation fails for some reason other than an existing profile.
      await supabaseAdmin.auth.admin.deleteUser(signUpData.user.id);
      return createErrorResponse('Failed to create profile', 500);
    }

    // Do NOT issue JWTs yet – user must verify email first.
    return createSuccessResponse(
      {
        message:
          'Registration successful. Please check your email and verify your address before logging in.',
      },
      201,
    );
  } catch (error) {
    console.error('Registration error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

