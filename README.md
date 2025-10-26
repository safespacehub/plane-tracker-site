# Plane Tracker Portal

Beautiful, modern web portal for managing your plane tracking devices. Built with React, TypeScript, TailwindCSS, and Supabase.

## Features

- **Authentication** - Secure login and registration with Supabase Auth
- **Device Management** - Add, edit, and assign tracking devices to planes
- **Plane Management** - Manage your aircraft fleet with tail numbers, models, and manufacturers
- **Session Tracking** - View complete flight history with detailed analytics
- **Real-time Updates** - Live data from your ESP32 devices
- **Dark Mode** - Apple-inspired design with automatic dark mode
- **Export Data** - Download session data as CSV for record keeping
- **Responsive** - Works beautifully on desktop, tablet, and mobile

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works great)

### Installation

1. Clone the repository and navigate to the site_sym directory:
```bash
cd site_sym
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your Supabase credentials:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Run the development server:
```bash
npm run dev
```

5. Open http://localhost:5173 in your browser

## Building for Production

Build the static site:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Deployment

### GitHub Pages (Automatic)

This project is configured to automatically deploy to GitHub Pages when you push to the main branch.

1. Go to your GitHub repository settings
2. Navigate to Settings > Secrets and variables > Actions
3. Add the following secrets:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
4. Enable GitHub Pages in Settings > Pages
   - Source: GitHub Actions
5. Push to main branch and the site will automatically deploy

The site will be available at: `https://yourusername.github.io/plane-tracker/`

### Manual Deployment with gh-pages

```bash
npm run deploy
```

This will build and deploy to the gh-pages branch.

## Project Structure

```
site_sym/
├── src/
│   ├── components/
│   │   ├── Auth/           # Login and registration
│   │   ├── Dashboard/      # Main dashboard and views
│   │   └── Layout/         # Header, sidebar, and layout
│   ├── lib/
│   │   └── supabase.ts     # Supabase client and types
│   ├── App.tsx             # Main app with routing
│   ├── index.css           # Global styles and utilities
│   └── main.tsx            # App entry point
├── public/                 # Static assets
├── index.html              # HTML template
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── tailwind.config.js      # Tailwind CSS config
└── vite.config.ts          # Vite config
```

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **Supabase** - Backend (database, auth, edge functions)
- **React Router** - Client-side routing
- **date-fns** - Date formatting and manipulation

## Design Philosophy

This portal follows Apple's Human Interface Guidelines:

- **Clean and minimal** - No clutter, just what you need
- **Smooth animations** - Spring-based transitions for natural feel
- **Consistent spacing** - Proper use of whitespace
- **Clear hierarchy** - Visual weight guides the user
- **Accessible** - Proper contrast ratios and semantic HTML
- **Responsive** - Adapts beautifully to any screen size

## Usage Guide

### First Time Setup

1. **Register** - Create an account with your email
2. **Add Planes** - Register your aircraft with tail numbers
3. **Add Devices** - Register your ESP32 devices using their UUID
4. **Assign Devices** - Link devices to planes for automatic tracking

### Daily Usage

- **Dashboard** - Overview of all your tracking data
- **Devices** - Manage device assignments and view last seen
- **Planes** - Edit aircraft information
- **Sessions** - View complete flight history, filter, and export

## Support

For issues or questions:
1. Check the main project README
2. Review Supabase documentation
3. Open an issue on GitHub

## License

This project is part of the Plane Tracker system. See main README for details.

