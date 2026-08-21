# StudyGrouprr
ShipCheck test change.

**Find students studying your course nearby and join them.**

StudyGrouprr is a campus-focused platform that helps college students discover, create, and join real-world study sessions.

Instead of building another note-taking app, AI tutor, or general-purpose student social network, StudyGrouprr focuses on one simple problem:

> Students want study partners but often do not know who is available, nearby, and studying the same course.

A student can create a study session for a course, share when and where they are meeting, and allow nearby classmates to join.

---

## Overview

The core StudyGrouprr experience is:

```text
Student needs study partners
          ↓
Student creates a study session
          ↓
Other students discover the session
          ↓
Students join and meet in person
```

StudyGrouprr is designed around campus-specific discovery, course relevance, and low-friction coordination.

### Example session

```text
CS 300 Midterm Review
Memorial Library
6:00 PM – 8:00 PM

Reviewing recursion, trees, and exam practice problems.
```

---

## Core Features

### Authentication and onboarding

* Google authentication through Supabase Auth
* Automatic user profile creation
* University, major, and academic-year onboarding
* Protected routes for authenticated users
* Onboarding completion checks

### Study sessions

* Create scheduled study sessions
* Associate sessions with a course
* Add a campus location
* Set start and end times
* Include session descriptions and identification details
* Edit sessions created by the current user
* View live, upcoming, and completed session states

### Session discovery

* Browse available study sessions
* Discover sessions for saved courses
* View sessions happening now or starting soon
* Search and filter session listings
* Open individual session detail pages

### Session membership

* Join study sessions
* Leave sessions
* View session attendees
* Distinguish between sessions a user created and joined

### Courses

* Save courses to a personal course list
* Browse course-specific sessions
* Open dedicated course pages
* Create a session with a course preselected

### Student connections

* View other session attendees
* Send and manage buddy requests
* Build study connections through shared sessions

### Profiles

* View student information
* Edit profile details
* Display university, major, year, name, and avatar
* Handle missing or unavailable profile images safely

### Safety and moderation

* Text content moderation
* Input length restrictions
* Session-duration validation
* Restrictions on links, social handles, and phone numbers in selected fields
* Public-location-oriented session coordination
* Authentication and database authorization through Supabase

---

## Product Goal

StudyGrouprr is successful when:

1. One student creates a session.
2. Another student discovers it.
3. The second student joins.
4. Both students attend and study together.

The product is optimized around increasing:

> **Successful study meetups per week**

Page views and account registrations matter less than whether StudyGrouprr helps students form real study groups.

---

## Technology Stack

### Frontend

* [Next.js](https://nextjs.org/) 16
* [React](https://react.dev/) 19
* [TypeScript](https://www.typescriptlang.org/)
* [Tailwind CSS](https://tailwindcss.com/) 4
* Next.js App Router

### Backend

* [Supabase](https://supabase.com/)
* PostgreSQL
* Supabase Authentication
* Row Level Security
* Relational database queries

### Interface and animation

* [Lucide React](https://lucide.dev/)
* [GSAP](https://gsap.com/)

### Deployment

* Frontend: Vercel
* Backend: Supabase

---

## Application Structure

The project uses the Next.js App Router.

```text
studygrouprr/
├── app/
│   ├── auth/
│   ├── buddies/
│   ├── campus-activity/
│   ├── courses/
│   │   └── [courseCode]/
│   ├── create-session/
│   ├── dashboard/
│   ├── go-live/
│   ├── onboarding/
│   ├── profile/
│   ├── sessions/
│   │   └── [id]/
│   │       └── edit/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── hooks/
├── lib/
├── public/
├── package.json
└── tsconfig.json
```

Some paths may change as the application continues to evolve.

---

## Main Routes

| Route                   | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| `/`                     | Public landing page and application entry point         |
| `/onboarding`           | Collect university, major, year, and course information |
| `/dashboard`            | Personalized overview of upcoming activity              |
| `/sessions`             | Browse and discover study sessions                      |
| `/sessions/[id]`        | View one session and its attendees                      |
| `/sessions/[id]/edit`   | Edit a session created by the current user              |
| `/create-session`       | Create a scheduled study session                        |
| `/go-live`              | Create or manage an immediate live study session        |
| `/courses/[courseCode]` | View activity for a particular course                   |
| `/buddies`              | Manage study connections                                |
| `/campus-activity`      | View broader campus study activity                      |
| `/profile`              | View and edit the current user’s profile                |

---

## Database Model

StudyGrouprr uses Supabase PostgreSQL.

The exact production schema should be managed through version-controlled Supabase migrations. The following represents the primary application model.

### `profiles`

Stores application-specific data for authenticated students.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  university text,
  major text,
  year text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);
```

### `study_sessions`

Stores scheduled and live study meetups.

```sql
create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  course_code text not null,
  location_name text not null,
  description text,
  identification text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  creator_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
```

### `session_members`

Tracks students who have joined sessions.

```sql
create table session_members (
  session_id uuid not null references study_sessions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
```

### `user_courses`

Stores the courses followed by each student.

```sql
create table user_courses (
  user_id uuid not null references profiles(id) on delete cascade,
  course_code text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, course_code)
);
```

### Friendships

The application also supports study-buddy relationships. The corresponding friendship table should store:

* Requesting student
* Receiving student
* Request status
* Creation and update timestamps

Refer to the active Supabase project or repository migrations for the authoritative schema.

---

## Prerequisites

Before running StudyGrouprr locally, install:

* [Node.js](https://nodejs.org/) 20 or newer
* npm, pnpm, yarn, or Bun
* A Supabase project
* A Google OAuth application configured through Supabase

Check your Node version:

```bash
node --version
```

---

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/GreenTreeGaming/studygrouprr.git
cd studygrouprr
```

### 2. Install dependencies

Using npm:

```bash
npm install
```

Alternatively:

```bash
pnpm install
```

```bash
yarn install
```

```bash
bun install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```bash
touch .env.local
```

Add the following values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These values are available in the Supabase dashboard under:

```text
Project Settings → API
```

Do not commit `.env.local` or private credentials to GitHub.

### 4. Configure Supabase authentication

In the Supabase dashboard:

1. Open **Authentication**.
2. Open **Providers**.
3. Enable **Google**.
4. Add the Google OAuth client ID and secret.
5. Configure the correct redirect URLs.

For local development, include a URL matching your authentication callback implementation, such as:

```text
http://localhost:3000/auth/callback
```

For production, add the corresponding deployed domain:

```text
https://your-domain.com/auth/callback
```

Use the callback route that actually exists in the current application.

### 5. Configure the database

Create the required tables, relationships, indexes, triggers, and Row Level Security policies in Supabase.

For a production deployment, schema changes should be stored as migrations rather than applied only through the Supabase dashboard.

### 6. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Available Commands

```bash
npm run dev
```

Starts the local development server.

```bash
npm run build
```

Creates an optimized production build.

```bash
npm run start
```

Runs the production build locally.

```bash
npm run lint
```

Runs ESLint across the project.

Before opening a pull request or deploying a change, run:

```bash
npm run lint
npm run build
```

---

## Supabase Row Level Security

Row Level Security should be enabled for every table containing user or session data.

At a minimum, policies should enforce the following rules:

### Profiles

* Authenticated students can read profiles needed for session participation.
* A student can update only their own profile.
* A student cannot change another student’s profile.

### Study sessions

* Authenticated students can read discoverable sessions.
* A student can create sessions only as themselves.
* Only the session creator can edit or delete a session.

### Session members

* Authenticated students can view membership for visible sessions.
* A student can join only as themselves.
* A student can remove only their own membership.
* Session creators may be granted limited moderation permissions when necessary.

### User courses

* A student can read and manage only their own saved courses.

Client-side checks are not a replacement for Row Level Security. Authorization must be enforced by PostgreSQL policies.

---

## Recommended Database Indexes

As usage grows, the following indexes will help common queries:

```sql
create index study_sessions_start_time_idx
  on study_sessions (start_time);

create index study_sessions_course_code_start_time_idx
  on study_sessions (course_code, start_time);

create index study_sessions_creator_id_idx
  on study_sessions (creator_id);

create index session_members_user_id_idx
  on session_members (user_id);

create index user_courses_user_id_idx
  on user_courses (user_id);
```

Indexes should be validated against actual query patterns before adding unnecessary database overhead.

---

## Product Principles

StudyGrouprr follows several product principles.

### Real-world connection over online engagement

The purpose of the app is to help students meet and study. Time spent inside the app is not the primary goal.

### Course relevance over generic social discovery

Students should primarily see people and sessions connected to their actual courses.

### Fast session creation

Creating a study session should take less than a minute.

### Useful density over broad reach

A highly active group within one university or course is more valuable than inactive users distributed across many campuses.

### Safety by default

Sessions should encourage public campus locations, verified identities, transparent attendee lists, and clear reporting controls.

### Functionality over unnecessary complexity

Features should directly improve session creation, discovery, attendance, trust, or repeat participation.

---

## Current Development Priorities

The most important product work includes:

* Improving session discovery
* Reducing friction in session creation
* Increasing the number of sessions receiving at least one join
* Improving reminder and attendance flows
* Strengthening reporting and safety controls
* Adding reliable product analytics
* Testing the product with real students
* Measuring successful in-person study meetups

Features such as generalized messaging, large community systems, gamification, and AI assistance are secondary to validating the core study-session loop.

---

## Suggested Analytics Events

The following events can help evaluate marketplace health:

```text
user_signed_up
onboarding_completed
course_added
session_created
session_viewed
session_shared
session_joined
session_left
session_cancelled
session_started
session_completed
attendance_confirmed
buddy_request_sent
buddy_request_accepted
```

Useful product metrics include:

* Sessions created per week
* Sessions receiving at least one non-creator join
* Median time from session creation to first join
* Join-to-attendance conversion
* Repeat session creators
* Repeat session attendees
* Sessions per active course
* Weekly confirmed study attendees
* Successful study meetups per week

Avoid sending sensitive profile information, private session content, or precise location data to analytics platforms unless it is clearly required and appropriately disclosed.

---

## Deployment

### Vercel

StudyGrouprr is designed to be deployed on Vercel.

1. Import the GitHub repository into Vercel.
2. Add the required environment variables.
3. Deploy the application.
4. Add the production URL to Supabase authentication settings.
5. Add the production callback URL to the Google OAuth configuration.

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase

Before launching publicly:

* Apply all database migrations.
* Enable Row Level Security.
* Review every policy.
* Configure Google OAuth.
* Configure allowed redirect URLs.
* Confirm database indexes.
* Test account deletion behavior.
* Test session deletion cascades.
* Review authentication email and rate-limit settings.

---

## Security Considerations

StudyGrouprr coordinates real-world meetings, so security and privacy should be treated as core product requirements.

Before a public campus launch, review:

* Row Level Security policies
* Authentication callback validation
* Open redirect protection
* Session ownership validation
* Profile privacy
* Location visibility
* Reporting and blocking
* Content moderation
* Rate limiting
* Abuse prevention
* No-show and cancellation handling
* Database constraints
* Environment-variable handling
* Error-message information leakage
* Dependency vulnerabilities

Students should be encouraged to meet in public university locations such as libraries, student centers, residence-hall common areas, and academic buildings.

---

## Testing

Automated testing should cover the application’s most important behavior:

### Unit tests

* Course-code normalization
* Session duration validation
* Date and time formatting
* Session status calculations
* Content-validation rules
* Relationship normalization
* Session deduplication

### Integration tests

* Profile creation after authentication
* Onboarding completion
* Session creation
* Session editing permissions
* Joining and leaving sessions
* Course-specific session queries
* Friendship state changes
* Row Level Security policies

### End-to-end tests

* New user signs in and completes onboarding
* User creates a study session
* A second user discovers and joins it
* Session creator sees the attendee
* Participant leaves the session
* Unauthorized user cannot edit another user’s session

The end-to-end create, discover, and join flow is the most important test in the application.

---

## Roadmap

### MVP

* [x] Google authentication
* [x] User profiles
* [x] Student onboarding
* [x] Course selection
* [x] Session creation
* [x] Session discovery
* [x] Session detail pages
* [x] Session membership
* [x] Session editing
* [x] Student profiles
* [x] Study buddies
* [x] Live-session experiences

### Validation and reliability

* [ ] Real-user campus testing
* [ ] Attendance confirmation
* [ ] Session reminders
* [ ] Session cancellation notifications
* [ ] Reporting and blocking
* [ ] No-show feedback
* [ ] Product analytics
* [ ] Marketplace health dashboard
* [ ] Automated tests
* [ ] Version-controlled Supabase migrations

### Future possibilities

* [ ] Campus map
* [ ] Nearby-session discovery
* [ ] University email verification
* [ ] Session-specific chat
* [ ] Push notifications
* [ ] Recurring sessions
* [ ] Course communities
* [ ] Campus ambassador tools
* [ ] University organization partnerships

Future features should be prioritized only when they improve successful study meetups.

---

## Contributing

StudyGrouprr is currently an actively developed project.

To contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make focused changes.
4. Run linting and production builds.
5. Add or update tests where appropriate.
6. Open a pull request explaining the problem and solution.

```bash
git checkout -b feature/your-feature-name
npm run lint
npm run build
```

Please avoid combining unrelated refactors and product changes in the same pull request.

---

## Author

Built by **Sarvajith Karun**.

* Portfolio: [sarvajithkarun.com](https://sarvajithkarun.com)
* GitHub: [GreenTreeGaming](https://github.com/GreenTreeGaming)

---

## License

No open-source license has currently been specified.

Unless a license is added, the source code remains protected under standard copyright law and should not be copied, distributed, or modified without permission.

---

## Project Status

StudyGrouprr is under active development and is not yet guaranteed to be production-ready.

The immediate objective is to validate whether students consistently use the platform to create, discover, join, and attend real study sessions.
