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

    // Get followers
    const { data: followers, error } = await supabaseAdmin
      .from('follows')
      .select(`
        follower_id,
        created_at,
        follower:profiles!follows_follower_id_fkey (
          id,
          username,
          email,
          first_name,
          last_name,
          avatar_url,
          bio
        )
      `)
      .eq('following_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return createErrorResponse('Failed to fetch followers', 500);
    }

    const formattedFollowers = (followers || []).map((f: any) => ({
      ...f.follower,
      followed_at: f.created_at,
    }));

    return createSuccessResponse({
      followers: formattedFollowers,
      count: formattedFollowers.length,
    });
  } catch (error) {
    console.error('Get followers error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

