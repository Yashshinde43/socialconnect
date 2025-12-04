'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { apiRequest } from '@/lib/api/client';
import { PostWithAuthor } from '@/types';
import PostCard from '@/components/PostCard';
import CreatePost from '@/components/CreatePost';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Home, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FeedPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllPosts, setShowAllPosts] = useState(false);

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadFeed();
  }, [isAuthenticated, hasHydrated, router]);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ posts: PostWithAuthor[] }>('/api/posts/feed');
      setPosts(data.posts || []);
      // If feed is empty, automatically show all posts for discovery
      if (data.posts?.length === 0) {
        setShowAllPosts(true);
        loadAllPosts();
      } else {
        setShowAllPosts(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  const loadAllPosts = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<{ posts: PostWithAuthor[] }>('/api/posts');
      setPosts(data.posts || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = () => {
    loadFeed();
  };

  // Show loading state while hydrating
  if (!hasHydrated) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-6 md:py-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full mb-4" />
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Home className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            {showAllPosts ? 'Discover Posts' : 'Your Feed'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!showAllPosts && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAllPosts(true);
                loadAllPosts();
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Discover All Posts
            </Button>
          )}
          {showAllPosts && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAllPosts(false);
                loadFeed();
              }}
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Feed
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={showAllPosts ? loadAllPosts : loadFeed}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <CreatePost onPostCreated={handlePostCreated} />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full mb-4" />
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No posts found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {showAllPosts && (
            <Alert className="mb-4">
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                <strong>Discover new users!</strong> Click on any username to visit their profile
                and follow them to see their posts in your feed.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={showAllPosts ? loadAllPosts : loadFeed}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
