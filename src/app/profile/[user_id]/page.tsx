'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { apiRequest } from '@/lib/api/client';
import { ProfileWithStats, PostWithAuthor } from '@/types';
import PostCard from '@/components/PostCard';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  UserPlus,
  UserMinus,
  MapPin,
  Globe,
  FileText,
  Users,
  UserCheck,
  Edit,
  Settings,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const user_id = params.user_id as string;
  const { user: currentUser, isAuthenticated, hasHydrated } = useAuthStore();
  const [profile, setProfile] = useState<ProfileWithStats | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadProfile();
    loadPosts();
  }, [user_id, isAuthenticated, hasHydrated, router]);

  const loadProfile = async () => {
    try {
      const data = await apiRequest<ProfileWithStats>(`/api/users/${user_id}`);
      setProfile(data);
      setIsFollowing(data.is_following || false);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const data = await apiRequest<{ posts: PostWithAuthor[] }>(
        `/api/posts?author_id=${user_id}`
      );
      setPosts(data.posts || []);
    } catch (err: any) {
      console.error('Load posts error:', err);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) return;

    try {
      setLoadingFollow(true);
      if (isFollowing) {
        await apiRequest(`/api/users/${user_id}/follow`, { method: 'DELETE' });
        setIsFollowing(false);
        if (profile) {
          setProfile({
            ...profile,
            followers_count: (profile.followers_count || 0) - 1,
          });
        }
      } else {
        await apiRequest(`/api/users/${user_id}/follow`, { method: 'POST' });
        setIsFollowing(true);
        if (profile) {
          setProfile({
            ...profile,
            followers_count: (profile.followers_count || 0) + 1,
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to follow/unfollow');
    } finally {
      setLoadingFollow(false);
    }
  };

  const getInitials = (username?: string) => {
    if (!username) return 'U';
    return username[0].toUpperCase();
  };

  // Show loading state while hydrating or loading profile
  if (!hasHydrated || (!isAuthenticated && hasHydrated) || loading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const isOwnProfile = currentUser?.id === user_id;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Avatar className="h-24 w-24 shrink-0">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
              <AvatarFallback className="text-2xl">
                {getInitials(profile.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{profile.username}</h1>
                  {profile.is_verified && (
                    <Badge variant="default" className="gap-1">
                      <UserCheck className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                {profile.first_name && profile.last_name && (
                  <p className="text-muted-foreground mt-1">
                    {profile.first_name} {profile.last_name}
                  </p>
                )}
                {profile.bio && (
                  <p className="mt-3 text-sm leading-relaxed">{profile.bio}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Globe className="h-4 w-4" />
                      <span>{profile.website}</span>
                    </a>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{profile.posts_count || 0}</span>
                  <span className="text-sm text-muted-foreground">Posts</span>
                </div>
                <Link
                  href={`/profile/${user_id}/followers`}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{profile.followers_count || 0}</span>
                  <span className="text-sm text-muted-foreground">Followers</span>
                </Link>
                <Link
                  href={`/profile/${user_id}/following`}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{profile.following_count || 0}</span>
                  <span className="text-sm text-muted-foreground">Following</span>
                </Link>
              </div>

              <div className="flex flex-wrap gap-3">
                {!isOwnProfile && (
                  <Button
                    onClick={handleFollow}
                    disabled={loadingFollow}
                    variant={isFollowing ? 'outline' : 'default'}
                    className="gap-2"
                  >
                    {loadingFollow ? (
                      <>
                        <span className="animate-pulse">...</span>
                      </>
                    ) : isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
                {isOwnProfile && (
                  <>
                    <Button variant="outline" asChild className="gap-2">
                      <Link href="/profile/edit">
                        <Edit className="h-4 w-4" />
                        Edit Profile
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="gap-2">
                      <Link href="/profile/settings">
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-xl font-bold">Posts</h2>
        </div>
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No posts yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={loadPosts} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
