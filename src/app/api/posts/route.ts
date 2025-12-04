import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requireAuth } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validatePostContent } from '@/lib/utils/validation';
import { uploadImage } from '@/lib/utils/storage';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const author_id = searchParams.get('author_id');
    const limit = parseInt(searchParams.get('limit') || '20');
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
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (author_id) {
      query = query.eq('author_id', author_id);
    }

    const { data: posts, error } = await query;

    if (error) {
      return createErrorResponse('Failed to fetch posts', 500);
    }

    // Check if user liked each post
    if (authResult.user) {
      const postIds = (posts || []).map((p: any) => p.id);
      if (postIds.length > 0) {
        const { data: likes } = await supabaseAdmin
          .from('likes')
          .select('post_id')
          .eq('user_id', authResult.user.userId)
          .in('post_id', postIds);

        const likedPostIds = new Set((likes || []).map((l: any) => l.post_id));
        (posts || []).forEach((post: any) => {
          post.is_liked = likedPostIds.has(post.id);
        });
      }
    }

    return createSuccessResponse({
      posts: posts || [],
      count: posts?.length || 0,
    });
  } catch (error) {
    console.error('List posts error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error || !authResult.user) {
      return createErrorResponse(authResult.error || 'Authentication required', 401);
    }

    const formData = await request.formData();
    const content = formData.get('content') as string;
    const category = (formData.get('category') as string) || 'general';
    const image = formData.get('image') as File | null;

    // Validate content
    const contentValidation = validatePostContent(content);
    if (!contentValidation.valid) {
      return createErrorResponse(contentValidation.error!, 400);
    }

    // Validate category
    if (!['general', 'announcement', 'question'].includes(category)) {
      return createErrorResponse('Invalid category', 400);
    }

    let image_url: string | null = null;

    // Handle image upload
    if (image && image.size > 0) {
      const uploadResult = await uploadImage(image, 'posts');
      if (!uploadResult.success) {
        return createErrorResponse(uploadResult.error || 'Failed to upload image', 400);
      }
      // uploadResult.url can be undefined at type level; normalize to null when missing
      image_url = uploadResult.url ?? null;
    }

    // Create post
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .insert({
        author_id: authResult.user.userId,
        content,
        image_url,
        category: category as 'general' | 'announcement' | 'question',
      })
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
      return createErrorResponse('Failed to create post', 500);
    }

    return createSuccessResponse({ ...post, is_liked: false }, 201);
  } catch (error) {
    console.error('Create post error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

