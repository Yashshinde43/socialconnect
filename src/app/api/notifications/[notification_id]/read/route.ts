import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ notification_id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || 'Authentication required', 401);
    }

    const { notification_id } = await params;

    // Verify notification belongs to user
    const { data: notification, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('id, user_id')
      .eq('id', notification_id)
      .single();

    if (fetchError || !notification) {
      return createErrorResponse('Notification not found', 404);
    }

    if (notification.user_id !== authResult.user.userId) {
      return createErrorResponse('Not authorized', 403);
    }

    // Mark as read
    const { error: updateError } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification_id);

    if (updateError) {
      return createErrorResponse('Failed to mark notification as read', 500);
    }

    return createSuccessResponse({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

