import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateBio } from '@/lib/utils/validation';
import { uploadImage } from '@/lib/utils/storage';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || 'Authentication required', 401);
    }

    // Get user profile with stats
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authResult.user.userId)
      .single();

    if (error || !profile) {
      return createErrorResponse('Profile not found', 404);
    }

    // Get statistics
    const [followersResult, followingResult, postsResult] = await Promise.all([
      supabaseAdmin
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', profile.id),
      supabaseAdmin
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', profile.id),
      supabaseAdmin
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', profile.id)
        .eq('is_active', true),
    ]);

    const profileWithStats = {
      ...profile,
      followers_count: followersResult.count || 0,
      following_count: followingResult.count || 0,
      posts_count: postsResult.count || 0,
    };

    return createSuccessResponse(profileWithStats);
  } catch (error) {
    console.error('Get profile error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || 'Authentication required', 401);
    }

    const formData = await request.formData();
    const bio = formData.get('bio') as string | null;
    const website = formData.get('website') as string | null;
    const location = formData.get('location') as string | null;
    const avatar = formData.get('avatar') as File | null;

    // Validate bio
    if (bio !== null) {
      const bioValidation = validateBio(bio);
      if (!bioValidation.valid) {
        return createErrorResponse(bioValidation.error!, 400);
      }
    }

    const updateData: any = {};
    if (bio !== null) updateData.bio = bio;
    if (website !== null) updateData.website = website;
    if (location !== null) updateData.location = location;

    // Handle avatar upload
    if (avatar && avatar.size > 0) {
      const uploadResult = await uploadImage(avatar, 'avatars');
      if (!uploadResult.success) {
        return createErrorResponse(uploadResult.error || 'Failed to upload avatar', 400);
      }
      updateData.avatar_url = uploadResult.url;
    }

    // Update profile
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', authResult.user.userId)
      .select()
      .single();

    if (error || !profile) {
      return createErrorResponse('Failed to update profile', 500);
    }

    return createSuccessResponse(profile);
  } catch (error) {
    console.error('Update profile error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function PATCH(request: NextRequest) {
  return PUT(request);
}

