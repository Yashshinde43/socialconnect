import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ post_id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || 'Authentication required', 401);
    }

    const { post_id } = await params;

    // Check if post exists
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id, author_id')
      .eq('id', post_id)
      .eq('is_active', true)
      .single();

    if (postError || !post) {
      return createErrorResponse('Post not found', 404);
    }

    // Check if already liked
    const { data: existingLike } = await supabaseAdmin
      .from('likes')
      .select('id')
      .eq('user_id', authResult.user.userId)
      .eq('post_id', post_id)
      .single();

    if (existingLike) {
      return createErrorResponse('Post already liked', 409);
    }

    // Create like
    const { data: like, error: likeError } = await supabaseAdmin
      .from('likes')
      .insert({
        user_id: authResult.user.userId,
        post_id: post_id,
      })
      .select()
      .single();

    if (likeError || !like) {
      return createErrorResponse('Failed to like post', 500);
    }

    // Create notification (if not own post)
    if (post.author_id !== authResult.user.userId) {
      await supabaseAdmin.from('notifications').insert({
        user_id: post.author_id,
        type: 'like',
        actor_id: authResult.user.userId,
        post_id: post_id,
      });
    }

    return createSuccessResponse({ message: 'Post liked successfully', like });
  } catch (error) {
    console.error('Like post error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ post_id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || 'Authentication required', 401);
    }

    const { post_id } = await params;

    // Delete like
    const { error } = await supabaseAdmin
      .from('likes')
      .delete()
      .eq('user_id', authResult.user.userId)
      .eq('post_id', post_id);

    if (error) {
      return createErrorResponse('Failed to unlike post', 500);
    }

    return createSuccessResponse({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error('Unlike post error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

