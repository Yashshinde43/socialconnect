# SocialConnect - Social Media Web Application

A comprehensive social media backend application built with Next.js, featuring user authentication, content sharing, social interactions, and admin management.

## Features

### Core Functionality
- **User Authentication**: JWT-based authentication with register, login, logout, and password management
- **User Profiles**: Customizable profiles with bio, avatar, website, and location
- **Content Creation**: Create posts with text (280 char limit) and single image upload (JPEG/PNG, max 2MB)
- **Social Interactions**: Follow/unfollow users, like posts, and comment on posts
- **Personalized Feed**: Chronological feed showing posts from users you follow
- **Real-time Notifications**: Live notifications using Supabase Real-Time (ready for implementation)
- **Admin Dashboard**: User management, content oversight, and statistics

### Access Control
- **Users**: Can create/edit own profile, create/delete own posts, follow users, like/comment
- **Admins**: All user permissions plus user management, delete any content, view all users

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL via Supabase
- **Authentication**: JWT tokens with Supabase Auth
- **File Storage**: Supabase Storage
- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Real-time**: Supabase Realtime (configured)

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Supabase account and project
- npm or yarn package manager

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `src/lib/db/schema.sql`
3. Create a storage bucket named `images` with public access
4. Get your Supabase URL and API keys from Project Settings > API

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important**: Generate strong, random secrets for JWT_SECRET and JWT_REFRESH_SECRET. Never commit these to version control.

### 4. Run Database Migrations

Execute the SQL schema file (`src/lib/db/schema.sql`) in your Supabase SQL Editor to create all necessary tables, indexes, triggers, and RLS policies.

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/username and password
- `POST /api/auth/logout` - Logout (blacklist refresh token)
- `POST /api/auth/token/refresh` - Refresh access token
- `POST /api/auth/password-reset` - Request password reset
- `POST /api/auth/password-reset-confirm` - Confirm password reset
- `POST /api/auth/change-password` - Change password (authenticated)

### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `GET /api/users` - List users (search for non-admins)
- `GET /api/users/{user_id}` - Get user profile
- `POST /api/users/{user_id}/follow` - Follow user
- `DELETE /api/users/{user_id}/follow` - Unfollow user
- `GET /api/users/{user_id}/followers` - Get user's followers
- `GET /api/users/{user_id}/following` - Get users following

### Posts
- `GET /api/posts` - List all posts (with pagination)
- `POST /api/posts` - Create new post
- `GET /api/posts/{post_id}` - Get post details
- `PUT /api/posts/{post_id}` - Update own post
- `DELETE /api/posts/{post_id}` - Delete own post
- `GET /api/posts/feed` - Get personalized feed
- `POST /api/posts/{post_id}/like` - Like post
- `DELETE /api/posts/{post_id}/like` - Unlike post
- `GET /api/posts/{post_id}/comments` - Get post comments
- `POST /api/posts/{post_id}/comments` - Add comment

### Admin (Admin only)
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/{user_id}` - Get user details
- `POST /api/admin/users/{user_id}/deactivate` - Deactivate/activate user
- `GET /api/admin/posts` - List all posts
- `DELETE /api/admin/posts/{post_id}` - Delete any post
- `GET /api/admin/stats` - Get platform statistics

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── users/         # User management endpoints
│   │   ├── posts/         # Post endpoints
│   │   └── admin/         # Admin endpoints
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── feed/              # Feed page
│   ├── profile/           # Profile pages
│   └── admin/             # Admin dashboard
├── components/            # React components
├── lib/                  # Utilities and configurations
│   ├── auth/             # Authentication utilities
│   ├── supabase/         # Supabase clients
│   ├── api/              # API client
│   ├── store/            # State management
│   └── utils/            # Helper functions
└── types/                # TypeScript type definitions
```

## Database Schema

The application uses the following main tables:
- `profiles` - User profiles (extends Supabase auth.users)
- `posts` - User posts
- `follows` - Follow relationships
- `likes` - Post likes
- `comments` - Post comments
- `notifications` - User notifications
- `refresh_tokens` - JWT refresh token blacklist

See `src/lib/db/schema.sql` for complete schema definition.

## Security Features

- JWT-based authentication with access and refresh tokens
- Password hashing with bcrypt
- Row Level Security (RLS) policies in Supabase
- Input validation on all endpoints
- File upload validation (type and size)
- Admin-only endpoints protected by middleware

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

Make sure to:
- Set all environment variables
- Run database migrations
- Configure Supabase storage bucket
- Update `NEXT_PUBLIC_APP_URL` with your production URL

## Development Notes

- UI is kept simple as functionality is the focus
- All API routes use proper error handling
- TypeScript types are defined for all data structures
- Code follows modular structure with separate concerns
- Environment variables are required for JWT secrets and Supabase credentials

## License

This project is created for assessment purposes.

## Support

For questions or issues, please refer to the assessment guidelines or contact the assessment team.
