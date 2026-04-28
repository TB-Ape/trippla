# Trippla - Group Trip Planning Platform

A collaborative trip planning website where groups can create trips, invite members, and plan together with itinerary building, expense tracking, packing lists, and polls/voting.

## Features

- 🗺️ **Itinerary Builder**: Create and manage trip timelines with activities, meals, and travel
- 💰 **Expense Tracking**: Track spending and split costs fairly among group members
- 🎒 **Packing Lists**: Coordinate what to bring with collaborative packing lists
- 🗳️ **Polls & Voting**: Make group decisions easy with built-in voting
- 👥 **Trip Collaboration**: Share join codes and collaborate in real-time
- 🔐 **Secure Authentication**: Built with NextAuth.js

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5
- **UI**: Tailwind CSS with custom brutalist design
- **Forms**: React Hook Form + Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd trippla
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your database URL and NextAuth secret:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/trippla"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
```

Generate a secret with:
```bash
openssl rand -base64 32
```

4. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev --name init
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Setup Options

### Option 1: Local PostgreSQL

Install PostgreSQL locally and create a database:
```bash
createdb trippla
```

### Option 2: Cloud Database

Use a cloud PostgreSQL provider:
- [Supabase](https://supabase.com/) - Free tier available
- [Neon](https://neon.tech/) - Serverless Postgres
- [Railway](https://railway.app/) - Easy deployment

## Project Structure

```
trippla/
├── prisma/
│   └── schema.prisma        # Database schema
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── (auth)/         # Authentication pages
│   │   ├── (dashboard)/    # Main app pages
│   │   ├── api/            # API routes
│   │   └── page.tsx        # Landing page
│   ├── components/
│   │   └── ui/             # Reusable UI components
│   └── lib/
│       ├── prisma.ts       # Prisma client
│       ├── auth.ts         # NextAuth config
│       └── utils.ts        # Utility functions
├── package.json
└── tsconfig.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma migrate dev` - Create and apply migrations

## Development Roadmap

- [x] Project setup and configuration
- [x] Database schema design
- [x] Landing page with distinctive design
- [ ] Authentication system (signup/login)
- [ ] Trip management (create/join/list)
- [ ] Itinerary builder
- [ ] Expense tracking and splitting
- [ ] Packing lists
- [ ] Polls and voting
- [ ] Mobile responsive design
- [ ] Deployment

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

MIT
