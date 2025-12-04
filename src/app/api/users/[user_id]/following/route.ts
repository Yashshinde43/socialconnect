import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const { user_id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get following
    const { data: following, error } = await supabaseAdmin
      .from('follows')
      .select(`
        following_id,
        created_at,
        following:profiles!follows_following_id_fkey (
          id,
          username,
          email,
          first_name,
          last_name,
          avatar_url,
          bio
        )
      `)
      .eq('follower_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return createErrorResponse('Failed to fetch following', 500);
    }

    const formattedFollowing = (following || []).map((f: any) => ({
      ...f.following,
      followed_at: f.created_at,
    }));

    return createSuccessResponse({
      following: formattedFollowing,
      count: formattedFollowing.length,
    });
  } catch (error) {
    console.error('Get following error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

