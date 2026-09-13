# Hotel PMS — Frontend (MERN Stack, React part)

Simple, clean frontend for a Hotel Property Management System, built with **React + Vite + React Router**.

**Currently running backend-free.** The Calendar, Master Data and Audit pages normally
talk to the Express/MongoDB backend through `src/services/api.js`. For now, `api.js` is
pointed at `src/services/api.mock.js` — an in-browser mock backend (`src/services/mockDb.js`)
that replicates the same rooms/room-types/bookings/audit-log data and behaviour (create,
edit, drag-move, extras, settlements, cancel, etc.), stored in `localStorage`. No UI or
page code was touched to make this work.

**Switching back to the real backend later:** set `VITE_USE_MOCK=false` in `.env` and start
the server — no other code changes needed, every mock function matches the real API 1:1.
To reset the mock data at any time, run `window.__resetHotelPMSMockData()` in the browser console.

## Pages included

**Main**
- Dashboard
- Hotel Info
- Room Type
- Rooms
- Staff
- Gallery
- Policies

**Front Desk**
- Calendar
- Check In
- Check Out
- Walk-in Guest
- Room Availability
- Guest Details
- Payment

## Run locally

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Build for production

```bash
npm run build
```

Output goes to `dist/`.

## Project structure

```
src/
  components/     -> Layout, Sidebar, shared UI (badges, cards), icons
  pages/           -> Main section pages
  pages/frontdesk/ -> Front Desk sub-pages
  data/            -> mockData.js (dummy data — replace with API calls later)
  index.css        -> Global design tokens & all component styles
```

## Next step (Backend)

Once you're happy with the UI, I'll build the Express + MongoDB backend
with REST APIs for rooms, room types, staff, gallery, policies, bookings,
guests, and payments, and wire this frontend up to it (replacing `mockData.js`
with `fetch`/`axios` calls).
