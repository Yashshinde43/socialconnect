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

## Development Notes

- UI is kept simple as functionality is the focus
- All API routes use proper error handling
- TypeScript types are defined for all data structures
- Code follows modular structure with separate concerns
