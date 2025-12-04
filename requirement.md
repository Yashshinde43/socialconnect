# **Introduction**

Create a SocialConnect Web Application, a comprehensive social media backend application using NextJS. SocialConnect allows users to share posts, connect with others, and discover content through a personalized feed experience.

## Core Functionality

- **Users** can register, create profiles, post content with images, follow other users, like and comment on posts, and view personalised feeds.
- **Admins** have access to user management and basic content oversight.

## Key Features

- **Authentication System**: JWT-based authentication with login/register/logout
- **User Profiles**: Basic profiles with bio, avatar, follower/following counts
- **Content Creation**: Text posts with single image upload capability
- **Social Interactions**: Follow/unfollow users, like posts, basic comment system
- **Personalised Feed**: Chronological feed showing posts from followed users
- **Real-time Notifications**: Live notifications using Supabase Real-Time Subscriptions
- **Basic Admin**: User management and post oversight

# **Assignment Details**

## Roles and Access Permissions

Users can have one of two roles: **User** (default) and **Admin**.

Following are the access permissions for Admins and Users:

| Feature/Endpoint | User Access | Admin Access |
| --- | --- | --- |
| Authentication | Yes | Yes |
| Create/Edit Own Profile | Yes | Yes |
| Create/Delete Own Posts | Yes | Yes |
| Follow/Unfollow Users | Yes | Yes |
| Like/Comment on Posts | Yes | Yes |
| View Public Feeds | Yes | Yes |
| User Management | No | Yes |
| Delete Any Content | No | Yes |
| View All Users List | No | Yes |

## API Endpoints Overview

### Authentication System

**JWT-based authentication with comprehensive user management**

1. **User Registration**
    - Endpoint: `POST /api/auth/register/`
    - Fields: email, username, password, first_name, last_name
    - Email verification required before account activation
    - Username must be unique and follow validation rules (3-30 chars, alphanumeric + underscore)
2. **User Login**
    - Endpoint: `POST /api/auth/login/`
    - Accept email OR username with password
    - Return access token, refresh token, and user profile data
    - Track last login timestamp
3. **Password Management**
    - Password Reset: `POST /api/auth/password-reset/`
    - Password Reset Confirm: `POST /api/auth/password-reset-confirm/`
    - Change Password: `POST /api/auth/change-password/` (authenticated)
4. **Token Management**
    - Refresh Token: `POST /api/auth/token/refresh/`
    - Logout: `POST /api/auth/logout/` (blacklist refresh token)

## User Management

### User Profile System

**Comprehensive user profiles with privacy controls**

1. **Profile CRUD Operations**
    - Get Profile: `GET /api/users/{user_id}/`
    - Update Own Profile: `PUT/PATCH /api/users/me/`
    - Profile fields: bio (max 160 chars), avatar_url, website, location
    - Avatar upload to Supabase Storage with basic validation
2. **User Statistics**
    - Include in profile response: followers_count, following_count, posts_count
    - Basic user listing: `GET /api/users/` (for admin and basic search)
3. **Privacy Settings**
    - Profile visibility: public, private, followers_only

## Posts and Content

### Post Management System

**Simple content creation with single image support**

1. **Post CRUD Operations**
    - Create Post: `POST /api/posts/`
    - Get Post: `GET /api/posts/{post_id}/`
    - Update Own Post: `PUT/PATCH /api/posts/{post_id}/`
    - Delete Own Post: `DELETE /api/posts/{post_id}/`
    - List All Posts: `GET /api/posts/` (with pagination)
2. **Post Content Features**
    - Text content with character limit (280 chars)
    - Single image upload
    - Basic post categories: general, announcement, question
3. **Post Model Requirements**
    
    ```markdown
    *# Required fields for Post model*
    - content (TextField, max_length=280)
    - author (ForeignKey to User)
    - created_at, updated_at (DateTimeField)
    - image_url (URLField, optional)
    - category (CharField with choices, default='general')
    - is_active (BooleanField, default=True)
    - like_count (PositiveIntegerField, default=0)
    - comment_count (PositiveIntegerField, default=0)
    ```
    
4. **Image Handling**
- Support JPEG, PNG formats only
- Maximum file size: 2MB per image
- Upload to Supabase Storage and store URL in database
- Basic image validation (file type and size)

## Social Features

### Follow System

**Simple follow/unfollow functionality**

1. **Follow Operations**
    - Follow User: `POST /api/users/{user_id}/follow/`
    - Unfollow User: `DELETE /api/users/{user_id}/follow/`
    - Get User Followers: `GET /api/users/{user_id}/followers/`
    - Get User Following: `GET /api/users/{user_id}/following/`
2. **Follow Model Requirements**
    
    ```markdown
    *# Follow relationship model*
    - follower (ForeignKey to User, related_name='following_set')
    - following (ForeignKey to User, related_name='followers_set')
    - created_at (DateTimeField)
    
    class Meta:
        unique_together = ('follower', 'following')
    ```
    

## **Basic Admin Features**

### Simple Admin Management

**Essential admin functionality for user and content management**

1. **User Management** (Admin only)
    - List All Users: `GET /api/admin/users/`
    - Get User Details: `GET /api/admin/users/{user_id}/`
    - Deactivate User: `POST /api/admin/users/{user_id}/deactivate/`
2. **Content Management** (Admin only)
    - List All Posts: `GET /api/admin/posts/`
    - Delete Any Post: `DELETE /api/admin/posts/{post_id}/`
    - Basic statistics: `GET /api/admin/stats/` (total users, posts, active today)

## Technology Stack

1. **Backend Framework**: NextJS
2. **Database**: PostgreSQL (via Supabase)
3. **Authentication**: Using any JWT package or Supabase Authentication
4. **File Storage**: Supabase Storage for images and media
5. **Frontend**: ReactJS/Next.js with TypeScript
6. **UI Framework**: Tailwind CSS with shadcn/ui components
7. **Real-time Features**: Supabase Realtime for notifications
8. **Deployment**: Vercel/Netlify

# **Submission Guidelines**

1. Project Code should be hosted publicly on your GitHub account. Repository URL to be shared with us in the Submission Form link shared above.
2. Share a screen recording video on Loom that demonstrates the application's functionality.
    1. Keep the screen, camera, and microphone turned on during the Loom recording.
    2. To share the Loom recording link, grant **Anyone with the link can view** permission and provide it in the submission form. 
    3. Note that the free version of Loom only allows recordings up to 5 minutes in length.
    4. To install the Loom browser extension and create a new recording, [follow the steps here](https://support.loom.com/hc/en-us/articles/360002187698-How-to-get-started-with-the-Loom-Chrome-extension).
3. To submit your assessment for evaluation, please fill the Submission form using the link provided in your Assessment Email.

# Asking Queries?

**If you have any questions during the Assessment, please reply to the Assessment email** and provide a detailed description of your query. We will make every effort to address them promptly.

# What do Reviewers look for in the Assignment?

[Secrets from the Interview Room - What Reviewers Look For in a Take-home Coding Assignment](https://medium.com/bigpanda-engineering/secrets-from-the-interview-room-what-reviewers-look-for-in-a-take-home-coding-assignment-1aaec70dabe0)

**Besides the guidelines mentioned in the above reference, please ensure the following:**

1. Ability to modify built-in models.
2. CRUD operations on models with restrictions.
3. Code readability (Variable naming, URL naming).
4. Code Modularity (each view has its own functionality).
5. UI is not a deciding factor. Just for reviewing the functionality.
6. Don’t expose sensitive information/credentials by committing secrets to Git repos.