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
    const unread_only = searchParams.get('unread_only') === 'true';

    let query = supabaseAdmin
      .from('notifications')
      .select(`
        *,
        actor:profiles!notifications_actor_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .eq('user_id', authResult.user.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unread_only) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      return createErrorResponse('Failed to fetch notifications', 500);
    }

    return createSuccessResponse({
      notifications: notifications || [],
      count: notifications?.length || 0,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

