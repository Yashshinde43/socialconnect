import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const adminResult = await requireAdmin(request);
    
    if (adminResult.error || !adminResult.user) {
      return createErrorResponse(adminResult.error || 'Admin access required', 403);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Get total users
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get active users today (users who logged in today)
    const { count: activeToday } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_login', todayISO);

    // Get total posts
    const { count: totalPosts } = await supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get posts created today
    const { count: postsToday } = await supabaseAdmin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('created_at', todayISO);

    // Get total follows
    const { count: totalFollows } = await supabaseAdmin
      .from('follows')
      .select('*', { count: 'exact', head: true });

    // Get total likes
    const { count: totalLikes } = await supabaseAdmin
      .from('likes')
      .select('*', { count: 'exact', head: true });

    // Get total comments
    const { count: totalComments } = await supabaseAdmin
      .from('comments')
      .select('*', { count: 'exact', head: true });

    return createSuccessResponse({
      users: {
        total: totalUsers || 0,
        active_today: activeToday || 0,
      },
      posts: {
        total: totalPosts || 0,
        created_today: postsToday || 0,
      },
      interactions: {
        total_follows: totalFollows || 0,
        total_likes: totalLikes || 0,
        total_comments: totalComments || 0,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

