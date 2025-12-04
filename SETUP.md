# SocialConnect Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to be fully provisioned

2. **Run Database Schema**
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the entire contents of `src/lib/db/schema.sql`
   - Execute the SQL script
   - Verify all tables are created (profiles, posts, follows, likes, comments, notifications, refresh_tokens)

3. **Create Storage Bucket**
   - Go to Storage in your Supabase dashboard
   - Create a new bucket named `images`
   - Set it to **Public** (so images can be accessed)
   - Configure CORS if needed for your domain

4. **Get API Keys**
   - Go to Project Settings > API
   - Copy the following:
     - Project URL (NEXT_PUBLIC_SUPABASE_URL)
     - anon/public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
     - service_role key (SUPABASE_SERVICE_ROLE_KEY) - **Keep this secret!**

### 3. Configure Environment Variables

Create `.env.local` in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

JWT_SECRET=generate-a-random-secret-here-min-32-chars
JWT_REFRESH_SECRET=generate-another-random-secret-here-min-32-chars

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Generate JWT Secrets:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# Or use an online generator:
# https://generate-secret.vercel.app/32
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Creating Your First Admin User

After setting up the database, you'll need to manually create an admin user:

1. Register a user through the app (this creates a regular user)
2. Go to Supabase SQL Editor and run:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE username = 'your_username';
```

## Testing the Application

1. **Register a new user** at `/register`
2. **Login** at `/login`
3. **Create a post** on the feed page
4. **Follow other users** from their profile pages
5. **Like and comment** on posts
6. **Edit your profile** from your profile page

## Common Issues

### "Missing Supabase environment variables"
- Make sure `.env.local` exists and has all required variables
- Restart the dev server after adding environment variables

### "Failed to upload image"
- Verify the `images` bucket exists in Supabase Storage
- Check that the bucket is set to Public
- Ensure file size is under 2MB and format is JPEG/PNG

### "Authentication required" errors
- Make sure you're logged in
- Check that JWT tokens are being stored in localStorage
- Verify JWT_SECRET and JWT_REFRESH_SECRET are set

### Database errors
- Verify all tables were created by running the schema
- Check that RLS policies are enabled
- Ensure triggers are created (for like_count, comment_count)

## Production Deployment

1. Set all environment variables in your hosting platform
2. Update `NEXT_PUBLIC_APP_URL` to your production URL
3. Configure Supabase CORS to allow your domain
4. Run database migrations if needed
5. Test all functionality before going live

## Security Checklist

- [ ] JWT secrets are strong and random (32+ characters)
- [ ] `.env.local` is in `.gitignore` (already configured)
- [ ] Service role key is never exposed to client
- [ ] Supabase RLS policies are enabled
- [ ] File uploads are validated (type and size)
- [ ] All API routes have proper authentication checks

