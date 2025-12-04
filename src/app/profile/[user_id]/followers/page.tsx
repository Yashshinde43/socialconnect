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
import { ArrowLeft, Users, XCircle } from 'lucide-react';

interface Follower extends Profile {
  followed_at?: string;
}

export default function FollowersPage() {
  const router = useRouter();
  const params = useParams();
  const user_id = params.user_id as string;
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const [followers, setFollowers] = useState<Follower[]>([]);
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

    loadFollowers();
  }, [isAuthenticated, hasHydrated, router, user_id]);

  const loadFollowers = async () => {
    try {
      const data = await apiRequest<{ followers: Follower[] }>(
        `/api/users/${user_id}/followers`,
      );
      setFollowers(data.followers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load followers');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (username?: string) => {
    if (!username) return 'U';
    return username[0].toUpperCase();
  };

  // Show loading state while hydrating or loading followers
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
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Followers</h1>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {followers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No followers yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {followers.map((follower) => (
            <Card key={follower.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <Link
                  href={`/profile/${follower.id}`}
                  className="flex items-center gap-3 group"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={follower.avatar_url || undefined} alt={follower.username} />
                    <AvatarFallback>{getInitials(follower.username)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold group-hover:text-primary transition-colors truncate">
                      {follower.username}
                    </p>
                    {follower.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {follower.bio}
                      </p>
                    )}
                    {follower.first_name && follower.last_name && (
                      <p className="text-xs text-muted-foreground">
                        {follower.first_name} {follower.last_name}
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
