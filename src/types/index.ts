import { Database } from './database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type Follow = Database['public']['Tables']['follows']['Row'];
export type Like = Database['public']['Tables']['likes']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

export interface ProfileWithStats extends Profile {
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_following?: boolean;
}

export interface PostWithAuthor extends Post {
  author?: Profile;
  is_liked?: boolean;
  comments?: CommentWithAuthor[];
}

export interface CommentWithAuthor extends Comment {
  author?: Profile;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse extends AuthTokens {
  user: Profile;
}

