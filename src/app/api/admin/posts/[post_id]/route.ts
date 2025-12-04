import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ post_id: string }> }
) {
  try {
    const adminResult = await requireAdmin(request);
    
    if (adminResult.error || !adminResult.user) {
      return createErrorResponse(adminResult.error || 'Admin access required', 403);
    }

    const { post_id } = await params;

    // Check if post exists
    const { data: post, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('id', post_id)
      .single();

    if (fetchError || !post) {
      return createErrorResponse('Post not found', 404);
    }

    // Delete post (hard delete for admin)
    const { error: deleteError } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', post_id);

    if (deleteError) {
      return createErrorResponse('Failed to delete post', 500);
    }

    return createSuccessResponse({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Admin delete post error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

