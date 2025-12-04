import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const adminResult = await requireAdmin(request);
    
    if (adminResult.error || !adminResult.user) {
      return createErrorResponse(adminResult.error || 'Admin access required', 403);
    }

    const { user_id } = await params;

    // Get user profile
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (error || !profile) {
      return createErrorResponse('User not found', 404);
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
    console.error('Admin get user error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

