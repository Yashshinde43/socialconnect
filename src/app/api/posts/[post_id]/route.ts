import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requireAuth } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validatePostContent } from '@/lib/utils/validation';
import { uploadImage } from '@/lib/utils/storage';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ post_id: string }> }
) {
  try {
    const { post_id } = await params;
    const authResult = await authenticateRequest(request);

    // Get post with author and comments
    const { data: post, error } = await supabaseAdmin
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
        ),
        comments:comments (
          id,
          content,
          created_at,
          updated_at,
          author:profiles!comments_author_id_fkey (
            id,
            username,
            email,
            first_name,
            last_name,
            avatar_url
          )
        )
      `)
      .eq('id', post_id)
      .eq('is_active', true)
      .single();

    if (error || !post) {
      return createErrorResponse('Post not found', 404);
    }

    // Check if user liked the post
    if (authResult.user) {
      const { data: like } = await supabaseAdmin
        .from('likes')
        .select('id')
        .eq('user_id', authResult.user.userId)
        .eq('post_id', post_id)
        .single();

      (post as any).is_liked = !!like;
    } else {
      (post as any).is_liked = false;
    }

    return createSuccessResponse(post);
  } catch (error) {
    console.error('Get post error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ post_id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || 'Authentication required', 401);
    }

    const { post_id } = await params;

    // Check if post exists and belongs to user
    const { data: existingPost, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('author_id')
      .eq('id', post_id)
      .single();

    if (fetchError || !existingPost) {
      return createErrorResponse('Post not found', 404);
    }

    if (existingPost.author_id !== authResult.user.userId) {
      return createErrorResponse('Not authorized to update this post', 403);
    }

    const formData = await request.formData();
    const content = formData.get('content') as string | null;
    const category = formData.get('category') as string | null;
    const image = formData.get('image') as File | null;

    const updateData: any = {};

    if (content !== null) {
      const contentValidation = validatePostContent(content);
      if (!contentValidation.valid) {
        return createErrorResponse(contentValidation.error!, 400);
      }
      updateData.content = content;
    }

    if (category !== null) {
      if (!['general', 'announcement', 'question'].includes(category)) {
        return createErrorResponse('Invalid category', 400);
      }
      updateData.category = category;
    }

    // Handle image upload
    if (image && image.size > 0) {
      const uploadResult = await uploadImage(image, 'posts');
      if (!uploadResult.success) {
        return createErrorResponse(uploadResult.error || 'Failed to upload image', 400);
      }
      updateData.image_url = uploadResult.url;
    }

    // Update post
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .update(updateData)
      .eq('id', post_id)
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
      .single();

    if (error || !post) {
      return createErrorResponse('Failed to update post', 500);
    }

    return createSuccessResponse(post);
  } catch (error) {
    console.error('Update post error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ post_id: string }> }
) {
  return PUT(request, { params });
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

    // Check if post exists and belongs to user
    const { data: existingPost, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('author_id')
      .eq('id', post_id)
      .single();

    if (fetchError || !existingPost) {
      return createErrorResponse('Post not found', 404);
    }

    if (existingPost.author_id !== authResult.user.userId) {
      return createErrorResponse('Not authorized to delete this post', 403);
    }

    // Soft delete (set is_active to false)
    const { error } = await supabaseAdmin
      .from('posts')
      .update({ is_active: false })
      .eq('id', post_id);

    if (error) {
      return createErrorResponse('Failed to delete post', 500);
    }

    return createSuccessResponse({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

