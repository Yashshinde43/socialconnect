import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || 'Authentication required', 401);
    }

    const { user_id } = await params;

    if (authResult.user.userId === user_id) {
      return createErrorResponse('Cannot follow yourself', 400);
    }

    // Check if user exists
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_active')
      .eq('id', user_id)
      .single();

    if (userError || !targetUser || !targetUser.is_active) {
      return createErrorResponse('User not found or inactive', 404);
    }

    // Check if already following
    const { data: existingFollow } = await supabaseAdmin
      .from('follows')
      .select('id')
      .eq('follower_id', authResult.user.userId)
      .eq('following_id', user_id)
      .single();

    if (existingFollow) {
      return createErrorResponse('Already following this user', 409);
    }

    // Create follow relationship
    const { data: follow, error: followError } = await supabaseAdmin
      .from('follows')
      .insert({
        follower_id: authResult.user.userId,
        following_id: user_id,
      })
      .select()
      .single();

    if (followError || !follow) {
      return createErrorResponse('Failed to follow user', 500);
    }

    // Create notification
    await supabaseAdmin.from('notifications').insert({
      user_id: user_id,
      type: 'follow',
      actor_id: authResult.user.userId,
    });

    return createSuccessResponse({ message: 'Successfully followed user', follow });
  } catch (error) {
    console.error('Follow user error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || 'Authentication required', 401);
    }

    const { user_id } = await params;

    // Delete follow relationship
    const { error } = await supabaseAdmin
      .from('follows')
      .delete()
      .eq('follower_id', authResult.user.userId)
      .eq('following_id', user_id);

    if (error) {
      return createErrorResponse('Failed to unfollow user', 500);
    }

    return createSuccessResponse({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

