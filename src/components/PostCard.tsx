'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { apiRequest } from '@/lib/api/client';
import { PostWithAuthor } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: PostWithAuthor;
  onUpdate?: () => void;
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuthStore();
  const [isLiked, setIsLiked] = useState(post.is_liked || false);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    if (!user) return;

    try {
      if (isLiked) {
        await apiRequest(`/api/posts/${post.id}/like`, { method: 'DELETE' });
        setIsLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        await apiRequest(`/api/posts/${post.id}/like`, { method: 'POST' });
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const loadComments = async () => {
    try {
      const data = await apiRequest<{ comments: any[] }>(`/api/posts/${post.id}/comments`);
      setComments(data.comments || []);
    } catch (error) {
      console.error('Load comments error:', error);
    }
  };

  const handleToggleComments = () => {
    if (!showComments) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    try {
      setLoading(true);
      const newComment = await apiRequest(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText }),
      });
      setComments([...comments, newComment]);
      setCommentText('');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Add comment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const author = post.author || (post as any).author;

  const getInitials = (username?: string) => {
    return username?.[0]?.toUpperCase() || 'U';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <Link href={`/profile/${author?.id}`}>
            <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage src={author?.avatar_url || undefined} alt={author?.username} />
              <AvatarFallback>{getInitials(author?.username)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1">
            <Link
              href={`/profile/${author?.id}`}
              className="font-semibold hover:text-primary transition-colors"
            >
              {author?.username || 'Unknown'}
            </Link>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <p className="mb-4 whitespace-pre-wrap break-words">{post.content}</p>

        {post.image_url && (
          <div className="mb-4 rounded-lg overflow-hidden border">
            <Image
              src={post.image_url}
              alt="Post image"
              width={600}
              height={400}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        <Separator className="my-4" />

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={cn(
              'gap-2',
              isLiked && 'text-destructive hover:text-destructive'
            )}
          >
            <Heart
              className={cn('h-4 w-4', isLiked && 'fill-current')}
            />
            <span>{likeCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleComments}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{post.comment_count || 0}</span>
          </Button>
        </div>

        {showComments && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment: any) => (
                  <div key={comment.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={comment.author?.avatar_url || undefined}
                        alt={comment.author?.username}
                      />
                      <AvatarFallback className="text-xs">
                        {getInitials(comment.author?.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {comment.author?.username || 'Unknown'}
                      </p>
                      <p className="text-sm text-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {user && (
              <form onSubmit={handleAddComment} className="flex gap-2">
                <Input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading || !commentText.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
