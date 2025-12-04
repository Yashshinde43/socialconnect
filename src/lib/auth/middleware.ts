import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, JWTPayload } from './jwt';
import { createClient } from '@/lib/supabase/server';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: JWTPayload | null; error: string | null }> {
  try {
    // Try to get token from Authorization header
    const authHeader = request.headers.get('authorization');
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Try to get from cookies
      const cookieStore = await import('next/headers').then(m => m.cookies());
      token = cookieStore.get('access_token')?.value || null;
    }

    if (!token) {
      return { user: null, error: 'No authentication token provided' };
    }

    const payload = verifyAccessToken(token);
    return { user: payload, error: null };
  } catch (error) {
    return { user: null, error: 'Invalid or expired token' };
  }
}

export async function requireAuth(
  request: NextRequest
): Promise<{ user: JWTPayload; error: null } | { user: null; error: string }> {
  const { user, error } = await authenticateRequest(request);
  
  if (!user || error) {
    return { user: null, error: error || 'Authentication required' };
  }

  return { user, error: null };
}

export async function requireAdmin(
  request: NextRequest
): Promise<{ user: JWTPayload; error: null } | { user: null; error: string }> {
  const authResult = await requireAuth(request);
  
  if (authResult.error || !authResult.user) {
    return { user: null, error: authResult.error || 'Authentication required' };
  }

  if (authResult.user.role !== 'admin') {
    return { user: null, error: 'Admin access required' };
  }

  return { user: authResult.user, error: null };
}

export function createErrorResponse(
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, { status });
}

