import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const adminResult = await requireAdmin(request);
    
    if (adminResult.error || !adminResult.user) {
      return createErrorResponse(adminResult.error || 'Admin access required', 403);
    }

    const resolvedParams = await params;
    const { user_id } = resolvedParams;

    if (!user_id) {
      return createErrorResponse('User ID is required', 400);
    }

    // Prevent deactivating yourself
    if (adminResult.user.userId === user_id) {
      return createErrorResponse('Cannot deactivate your own account', 400);
    }

    // Check if user exists
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_active')
      .eq('id', user_id)
      .single();

    if (fetchError) {
      console.error('Error fetching user:', fetchError);
      return createErrorResponse('User not found', 404);
    }

    if (!profile) {
      return createErrorResponse('User not found', 404);
    }

    // Toggle active status
    const newActiveStatus = !profile.is_active;
    
    // Update the user's active status
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: newActiveStatus })
      .eq('id', user_id);

    if (updateError) {
      console.error('Error updating user status:', updateError);
      return createErrorResponse(
        `Failed to update user status: ${updateError.message || updateError.code || 'Unknown error'}`,
        500
      );
    }

    // Fetch the updated profile to return
    const { data: updatedProfile, error: fetchUpdatedError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (fetchUpdatedError) {
      console.error('Error fetching updated profile:', fetchUpdatedError);
      // Even if fetch fails, the update might have succeeded, so return success with the new status
      return createSuccessResponse({
        message: `User ${newActiveStatus ? 'activated' : 'deactivated'} successfully`,
        user: { ...profile, is_active: newActiveStatus },
      });
    }

    if (!updatedProfile) {
      return createErrorResponse('Failed to fetch updated user', 500);
    }

    return createSuccessResponse({
      message: `User ${updatedProfile.is_active ? 'activated' : 'deactivated'} successfully`,
      user: updatedProfile,
    });
  } catch (error: any) {
    console.error('Admin deactivate user error:', error);
    return createErrorResponse(
      error?.message || 'Internal server error',
      500
    );
  }
}

