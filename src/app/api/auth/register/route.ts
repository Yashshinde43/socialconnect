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

    // Verify the user exists in auth.users before creating profile
    // There can be a slight delay between signUp and the user being available in the database
    let userExists = false;
    let retries = 0;
    const maxRetries = 5;
    
    while (!userExists && retries < maxRetries) {
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authUser?.user && !authUserError) {
        userExists = true;
        break;
      }
      
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retries)));
      retries++;
    }

    if (!userExists) {
      console.error('User not found in auth.users after signup');
      // Clean up auth user if it was created
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (deleteError) {
        console.error('Failed to cleanup user:', deleteError);
      }
      return createErrorResponse('Failed to verify user creation', 500);
    }

    // Create or update profile.
    // In some environments (especially production), you might already have a trigger
    // that inserts into `profiles` on user signup. Using `upsert` avoids duplicate-key
    // errors when a profile row is created automatically by Supabase.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
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

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // Check if it's a foreign key constraint error (user doesn't exist)
      if (profileError.code === '23503') {
        console.error('Foreign key constraint violation - user may not be fully committed yet');
        // Try one more time after a short delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: retryProfile, error: retryError } = await supabaseAdmin
          .from('profiles')
          .upsert(
            {
              id: userId,
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
        
        if (retryError || !retryProfile) {
          console.error('Profile creation retry failed:', retryError);
          try {
            await supabaseAdmin.auth.admin.deleteUser(userId);
          } catch (deleteError) {
            console.error('Failed to cleanup user:', deleteError);
          }
          return createErrorResponse('Failed to create profile', 500);
        }
      } else {
        // Other errors - clean up and return
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
        } catch (deleteError) {
          console.error('Failed to cleanup user:', deleteError);
        }
        return createErrorResponse('Failed to create profile', 500);
      }
    }

    if (!profile) {
      console.error('Profile was not created');
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (deleteError) {
        console.error('Failed to cleanup user:', deleteError);
      }
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

