import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || 'Authentication required', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get users that current user follows
    const { data: following, error: followingError } = await supabaseAdmin
      .from('follows')
      .select('following_id')
      .eq('follower_id', authResult.user.userId);

    if (followingError) {
      return createErrorResponse('Failed to fetch following', 500);
    }

    const followingIds = (following || []).map((f: any) => f.following_id);
    
    // If user doesn't follow anyone, return empty feed
    if (followingIds.length === 0) {
      return createSuccessResponse({
        posts: [],
        count: 0,
      });
    }

    // Get posts from followed users
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey (
          id,
          username,
          email,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .in('author_id', followingIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      return createErrorResponse('Failed to fetch feed', 500);
    }

    // Check if user liked each post
    const postIds = (posts || []).map((p: any) => p.id);
    if (postIds.length > 0) {
      const { data: likes } = await supabaseAdmin
        .from('likes')
        .select('post_id')
        .eq('user_id', authResult.user.userId)
        .in('post_id', postIds);

      const likedPostIds = new Set((likes || []).map((l: any) => l.post_id));
      (posts || []).forEach((post: any) => {
        post.is_liked = likedPostIds.has(post.id);
      });
    }

    return createSuccessResponse({
      posts: posts || [],
      count: posts?.length || 0,
    });
  } catch (error) {
    console.error('Get feed error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

