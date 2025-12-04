import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const { user_id } = await params;
    const authResult = await authenticateRequest(request);
    const currentUserId = authResult.user?.userId;

    // Get user profile
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (error || !profile) {
      return createErrorResponse('User not found', 404);
    }

    // Check privacy settings
    if (profile.privacy_setting === 'private' && currentUserId !== user_id) {
      return createErrorResponse('Profile is private', 403);
    }

    if (profile.privacy_setting === 'followers_only' && currentUserId !== user_id) {
      if (!currentUserId) {
        return createErrorResponse('Authentication required', 401);
      }
      // Check if current user follows this user
      const { data: follow } = await supabaseAdmin
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', user_id)
        .single();

      if (!follow) {
        return createErrorResponse('Profile is only visible to followers', 403);
      }
    }

    // Get statistics
    const [followersResult, followingResult, postsResult, isFollowingResult] = await Promise.all([
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
      currentUserId
        ? supabaseAdmin
            .from('follows')
            .select('id')
            .eq('follower_id', currentUserId)
            .eq('following_id', user_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const profileWithStats = {
      ...profile,
      followers_count: followersResult.count || 0,
      following_count: followingResult.count || 0,
      posts_count: postsResult.count || 0,
      is_following: !!isFollowingResult.data,
    };

    return createSuccessResponse(profileWithStats);
  } catch (error) {
    console.error('Get user error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

