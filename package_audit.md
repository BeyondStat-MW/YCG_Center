# Tech Stack Audit

## Core Dependencies
- **Next.js**: `16.1.1` (Latest/Beta). Cutting edge Vercel features.
- **React**: `19.2.3` (RC/Canary). Necessary for Next.js 16.
- **TypeScript**: `^5`. Standard.

## Data & Backend
- **Supabase**: `@supabase/supabase-js`, `@supabase/ssr`. Standard stack for Auth/DB.
- **React Query**: `@tanstack/react-query ^5`. Excellent for state management.

## UI/UX
- **Tailwind CSS**: `^3.4`. (Consider upgrading to v4 alpha if desired, but v3 is stable).
- **Shadcn UI**: Uses `@radix-ui` primitives.
- **Framer Motion**: `^12`. Smooth animations.
- **Lucide React**: Iconography.
- **Tremor**: `@tremor/react`. Dashboard charts. Note: Tremor v3 has React 19 peer dependency warnings; check `npm audit`.

## Recommendations
- **Warning**: Tremor might lag behind React 19 support (Common issue with Next 15/16). Monitor for updates or use Recharts directly if issues arise.
- **Format**: Add `prettier-plugin-tailwindcss` for class sorting.
