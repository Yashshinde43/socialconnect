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

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const is_active = searchParams.get('is_active');

    let query = supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `username.ilike.%${search}%,email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      );
    }

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: users, error } = await query;

    if (error) {
      return createErrorResponse('Failed to fetch users', 500);
    }

    // Get statistics for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (user: any) => {
        const [followersResult, followingResult, postsResult] = await Promise.all([
          supabaseAdmin
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', user.id),
          supabaseAdmin
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', user.id),
          supabaseAdmin
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', user.id)
            .eq('is_active', true),
        ]);

        return {
          ...user,
          followers_count: followersResult.count || 0,
          following_count: followingResult.count || 0,
          posts_count: postsResult.count || 0,
        };
      })
    );

    return createSuccessResponse({
      users: usersWithStats,
      count: usersWithStats.length,
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

