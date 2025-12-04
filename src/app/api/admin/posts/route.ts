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
    const author_id = searchParams.get('author_id');
    const is_active = searchParams.get('is_active');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (author_id) {
      query = query.eq('author_id', author_id);
    }

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: posts, error } = await query;

    if (error) {
      return createErrorResponse('Failed to fetch posts', 500);
    }

    return createSuccessResponse({
      posts: posts || [],
      count: posts?.length || 0,
    });
  } catch (error) {
    console.error('Admin list posts error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

