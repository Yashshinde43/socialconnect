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

    const userId = signUpData.user.id;

    // Wait a moment for the database trigger to potentially create the profile
    // and for the user to be fully committed to auth.users
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify the user exists in auth.users using admin API
    let userExists = false;
    let retries = 0;
    const maxRetries = 10;
    
    while (!userExists && retries < maxRetries) {
      try {
        const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (authUser?.user && !authUserError) {
          userExists = true;
          break;
        }
      } catch (error) {
        console.error(`Attempt ${retries + 1} to verify user failed:`, error);
      }
      
      // Exponential backoff: 200ms, 400ms, 800ms, 1600ms, etc.
      if (!userExists && retries < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, retries)));
      }
      retries++;
    }

    if (!userExists) {
      console.error('User not found in auth.users after signup after', maxRetries, 'attempts');
      // Clean up auth user if it was created
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (deleteError) {
        console.error('Failed to cleanup user:', deleteError);
      }
      return createErrorResponse('Failed to verify user creation. Please try again.', 500);
    }

    // Check if profile was already created by database trigger
    let profile = null;
    let profileError = null;
    let retriesProfile = 0;
    const maxRetriesProfile = 5;

    while (!profile && retriesProfile < maxRetriesProfile) {
      // First, try to get existing profile (might have been created by trigger)
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        // Profile exists, update it with our data
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            username,
            email,
            first_name: first_name || null,
            last_name: last_name || null,
            // Don't overwrite is_verified if it was set by trigger
          })
          .eq('id', userId)
          .select()
          .single();

        if (!updateError && updatedProfile) {
          profile = updatedProfile;
          break;
        }
      }

      // If profile doesn't exist, try to create it
      const { data: newProfile, error: newProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          username,
          email,
          first_name: first_name || null,
          last_name: last_name || null,
          is_verified: false,
        })
        .select()
        .single();

      if (!newProfileError && newProfile) {
        profile = newProfile;
        break;
      }

      // If we got a foreign key error, wait and retry
      if (newProfileError?.code === '23503') {
        profileError = newProfileError;
        retriesProfile++;
        if (retriesProfile < maxRetriesProfile) {
          await new Promise(resolve => setTimeout(resolve, 500 * retriesProfile));
          continue;
        }
      } else {
        profileError = newProfileError;
        break;
      }
    }

    if (profileError || !profile) {
      console.error('Profile creation error after retries:', profileError);
      // Clean up auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (deleteError) {
        console.error('Failed to cleanup user:', deleteError);
      }
      return createErrorResponse(
        profileError?.code === '23503' 
          ? 'User account created but profile setup failed. Please contact support.'
          : 'Failed to create profile. Please try again.',
        500
      );
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

