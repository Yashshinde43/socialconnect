'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import { apiRequest } from '@/lib/api/client';
import { ProfileWithStats, PostWithAuthor } from '@/types';
import {
  LayoutDashboard,
  Users,
  FileText,
  Search,
  Trash2,
  UserX,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<ProfileWithStats[]>([]);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'posts'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<ProfileWithStats[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithAuthor[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'admin') {
      router.push('/feed');
      return;
    }

    loadData();
  }, [isAuthenticated, hasHydrated, user, router]);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.username?.toLowerCase().includes(query) ||
            u.email?.toLowerCase().includes(query) ||
            u.first_name?.toLowerCase().includes(query) ||
            u.last_name?.toLowerCase().includes(query)
        )
      );
      setFilteredPosts(
        posts.filter(
          (p) =>
            p.content?.toLowerCase().includes(query) ||
            p.author?.username?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredUsers(users);
      setFilteredPosts(posts);
    }
  }, [searchQuery, users, posts]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadUsers(), loadPosts()]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await apiRequest('/api/admin/stats');
      setStats(data);
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiRequest<{ users: ProfileWithStats[] }>('/api/admin/users');
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (err) {
      console.error('Load users error:', err);
    }
  };

  const loadPosts = async () => {
    try {
      const data = await apiRequest<{ posts: PostWithAuthor[] }>('/api/admin/posts');
      setPosts(data.posts || []);
      setFilteredPosts(data.posts || []);
    } catch (err) {
      console.error('Load posts error:', err);
    }
  };

  const handleDeactivateUser = async (userId: string, isActive: boolean) => {
    try {
      setError(null);
      await apiRequest(`/api/admin/users/${userId}/deactivate`, { method: 'POST' });
      await loadUsers();
      await loadStats();
    } catch (err: any) {
      console.error('Failed to toggle user status:', err);
      setError(err.message || 'Failed to update user status');
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      setError(null);
      await apiRequest(`/api/admin/posts/${postId}`, { method: 'DELETE' });
      await loadPosts();
      await loadStats();
    } catch (err: any) {
      console.error('Failed to delete post:', err);
      setError(err.message || 'Failed to delete post');
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInitials = (user: ProfileWithStats) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.username?.[0]?.toUpperCase() || 'U';
  };

  // Show loading state while hydrating or checking auth
  if (!hasHydrated || (!isAuthenticated && hasHydrated) || (hasHydrated && user?.role !== 'admin')) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BarChart3 className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Admin Panel</span>
              <span className="text-xs text-muted-foreground">Dashboard</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeTab === 'dashboard'}
                    onClick={() => setActiveTab('dashboard')}
                  >
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeTab === 'users'}
                    onClick={() => setActiveTab('users')}
                  >
                    <Users />
                    <span>Users</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeTab === 'posts'}
                    onClick={() => setActiveTab('posts')}
                  >
                    <FileText />
                    <span>Posts</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/feed">
                  <span>← Back to Feed</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex flex-1 items-center gap-2">
            <h1 className="text-lg font-semibold">Admin Dashboard</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
                <p className="text-muted-foreground">
                  Platform statistics and key metrics
                </p>
              </div>
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[...Array(2)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-16 mt-2" />
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.users?.total || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.users?.active_today || 0} active today
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.posts?.total || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.posts?.created_today || 0} created today
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
                  <p className="text-muted-foreground">
                    Manage and monitor all platform users
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>
                    A list of all users in the platform ({filteredUsers.length} total)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8">
                                <p className="text-muted-foreground">No users found</p>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredUsers.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar>
                                      <AvatarImage src={user.avatar_url || undefined} />
                                      <AvatarFallback>{getInitials(user)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {user.first_name && user.last_name
                                          ? `${user.first_name} ${user.last_name}`
                                          : user.username}
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        @{user.username}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                    {user.role}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={user.is_active ? 'default' : 'destructive'}
                                  >
                                    {user.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant={user.is_active ? 'destructive' : 'default'}
                                        size="sm"
                                      >
                                        {user.is_active ? (
                                          <>
                                            <UserX className="mr-2 h-4 w-4" />
                                            Deactivate
                                          </>
                                        ) : (
                                          <>
                                            <UserCheck className="mr-2 h-4 w-4" />
                                            Activate
                                          </>
                                        )}
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          {user.is_active ? 'Deactivate' : 'Activate'} User
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to{' '}
                                          {user.is_active ? 'deactivate' : 'activate'} this user?
                                          {user.is_active &&
                                            ' They will not be able to access the platform.'}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeactivateUser(user.id, user.is_active)
                                          }
                                          className={
                                            user.is_active
                                              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                              : ''
                                          }
                                        >
                                          {user.is_active ? 'Deactivate' : 'Activate'}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Post Management</h2>
                  <p className="text-muted-foreground">
                    Manage and moderate all platform posts
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2 mt-2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPosts.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">No posts found</p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredPosts.map((post) => (
                      <Card key={post.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage
                                  src={post.author?.avatar_url || undefined}
                                />
                                <AvatarFallback>
                                  {post.author?.username?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {post.author?.first_name && post.author?.last_name
                                    ? `${post.author.first_name} ${post.author.last_name}`
                                    : post.author?.username || 'Unknown User'}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  @{post.author?.username || 'unknown'} •{' '}
                                  {formatDate(post.created_at)}
                                </span>
                              </div>
                            </div>
                            <Badge variant={post.is_active ? 'default' : 'destructive'}>
                              {post.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-relaxed mb-4">{post.content}</p>
                          <div className="flex justify-end">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Post</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this post? This action
                                    cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePost(post.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
