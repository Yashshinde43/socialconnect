'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { apiRequest } from '@/lib/api/client';
import { Profile } from '@/types';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserCheck, XCircle } from 'lucide-react';

interface FollowingUser extends Profile {
  followed_at?: string;
}

export default function FollowingPage() {
  const router = useRouter();
  const params = useParams();
  const user_id = params.user_id as string;
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadFollowing();
  }, [isAuthenticated, hasHydrated, router, user_id]);

  const loadFollowing = async () => {
    try {
      const data = await apiRequest<{ following: FollowingUser[] }>(
        `/api/users/${user_id}/following`,
      );
      setFollowing(data.following || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load following');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (username?: string) => {
    if (!username) return 'U';
    return username[0].toUpperCase();
  };

  // Show loading state while hydrating or loading following
  if (!hasHydrated || (!isAuthenticated && hasHydrated) || loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-4" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <UserCheck className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Following</h1>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {following.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Not following anyone yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {following.map((user) => (
            <Card key={user.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <Link
                  href={`/profile/${user.id}`}
                  className="flex items-center gap-3 group"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                    <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold group-hover:text-primary transition-colors truncate">
                      {user.username}
                    </p>
                    {user.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {user.bio}
                      </p>
                    )}
                    {user.first_name && user.last_name && (
                      <p className="text-xs text-muted-foreground">
                        {user.first_name} {user.last_name}
                      </p>
                    )}
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
