import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Only admins can list all users, others can only search
    if (!authResult.user || authResult.user.role !== 'admin') {
      if (!search) {
        return createErrorResponse('Search parameter required for non-admin users', 400);
      }
    }

    let query = supabaseAdmin
      .from('profiles')
      .select('id, username, email, first_name, last_name, avatar_url, bio, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `username.ilike.%${search}%,email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      );
    }

    const { data: users, error } = await query;

    if (error) {
      return createErrorResponse('Failed to fetch users', 500);
    }

    return createSuccessResponse({
      users: users || [],
      count: users?.length || 0,
    });
  } catch (error) {
    console.error('List users error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

