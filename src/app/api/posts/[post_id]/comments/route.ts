import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, authenticateRequest } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ post_id: string }> }
) {
  try {
    const { post_id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get comments
    const { data: comments, error } = await supabaseAdmin
      .from('comments')
      .select(`
        *,
        author:profiles!comments_author_id_fkey (
          id,
          username,
          email,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('post_id', post_id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      return createErrorResponse('Failed to fetch comments', 500);
    }

    return createSuccessResponse({
      comments: comments || [],
      count: comments?.length || 0,
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

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
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return createErrorResponse('Comment content is required', 400);
    }

    if (content.length > 500) {
      return createErrorResponse('Comment must be 500 characters or less', 400);
    }

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

    // Create comment
    const { data: comment, error: commentError } = await supabaseAdmin
      .from('comments')
      .insert({
        post_id: post_id,
        author_id: authResult.user.userId,
        content: content.trim(),
      })
      .select(`
        *,
        author:profiles!comments_author_id_fkey (
          id,
          username,
          email,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single();

    if (commentError || !comment) {
      return createErrorResponse('Failed to create comment', 500);
    }

    // Create notification (if not own post)
    if (post.author_id !== authResult.user.userId) {
      await supabaseAdmin.from('notifications').insert({
        user_id: post.author_id,
        type: 'comment',
        actor_id: authResult.user.userId,
        post_id: post_id,
        comment_id: comment.id,
      });
    }

    return createSuccessResponse(comment, 201);
  } catch (error) {
    console.error('Create comment error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

