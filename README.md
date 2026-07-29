# Messenger — React frontend

A Discord/Telegram-style messenger UI built with React + Vite. Frontend is
fully complete and functional against a local mock backend (`src/db/store.js`)
so you can test everything yourself right now, before a real backend exists.

## There is no real server (yet)

Every "backend" concern — accounts, permissions, roles, messages, search,
notifications, scheduling, offline queueing — lives in **`src/db/store.js`**
and is persisted to the browser's `localStorage`. Every exported function
mirrors what a real API endpoint would do: validate input → check permission
→ mutate → return `{ ok, error, data }`. When the real backend is ready,
that's the one file to replace (e.g. with `fetch`/WebSocket calls) — no
component needs to change, since they only ever call functions from this file.

Because it's localStorage-based, two different accounts can't chat with each
other in two tabs of the *same* browser (logging out is intentionally synced
across all tabs of one browser, per the spec). To test a real back-and-forth
conversation, open a second **different** browser or an incognito window,
register a second account there, and message the first account from it.

## What's implemented

**From the previous round (بخش ۱-۷):** register/login/logout with
validation, private/group/channel messaging, text + image/video/audio/file
attachments with captions, edit/delete own messages, group owner/channel
managers can delete any message, channel & group create/rename/delete,
topics, the "allow others to add me to groups" toggle, per-channel media
sharing toggle.

**New in this round:**

- **بخش ۸ — Custom channel roles**: channel owners (or anyone with the
  `manageRoles` permission) can create roles with any name, toggle exactly
  which of 6 capabilities each role grants (post, delete others' messages,
  manage members, manage topics, manage channel, manage roles), and assign
  roles to members from the channel's Members panel. Permission changes take
  effect immediately — no re-login needed, since every check reads the live
  role table on each action. Open it via the channel's **Details → Manage
  roles**.
- **بخش ۹ — Search**: a search icon in the chat header filters the open
  conversation's messages (and file names of attachments) as you type.
- **بخش ۱۰ — Profiles**: Settings now edits every profile field except
  username (name, email, bio); other users' profiles are viewable by clicking
  any avatar/name (in messages or member lists) or a DM's header.
- **Award 1 — Live updates, notifications, reconnection resilience**:
  - Messages already appear without a refresh (the store is reactive and
    syncs across browser tabs via `storage` events).
  - A notification bell (nav rail) shows unread count; each notification has
    sender, conversation type, a text preview, a read/unread dot, and clicking
    it jumps straight to that conversation.
  - An offline **outbox**: when you're offline (or you flip **Settings →
    Simulate offline mode**, added specifically so you can test this without
    touching your real network), messages you send are queued locally (shown
    dimmed with a clock icon) and automatically flushed once you're back
    online — no messages are lost, and nothing is ever delivered twice.
- **Award 2 — Scheduled messages**: the clock icon in the composer schedules
  a text message for a future date/time (destination is the conversation
  you're in). The nav rail's clock icon opens **Scheduled messages**, listing
  every scheduled message you've created with its status (Pending / Sent /
  Canceled / Failed) — pending ones can be edited or canceled. A timer in the
  app checks every few seconds and actually delivers messages once due.

### Pragmatic choices worth knowing about

- Scheduled messages are **text-only**, matching the spec's acceptance
  criteria (destination + text + date + time).
- Scheduled delivery only runs while the app tab is open (it's a client-side
  timer, since there's no backend queue yet) — a real backend would use a
  proper job scheduler instead.
- Files are base64 data URLs capped at **4MB**, so everything works with zero
  storage service.
- Demo accounts: `sara_dev` / `ali_designer` / `reza_pm`, password `123456`.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

```bash
npm run build
npm run preview   # serve the production build locally
```

## Copying into your own project

Copy the `src/` folder in, install `react-router-dom` and `lucide-react`,
bring in `src/index.css`, and wire up `<App />` (or copy the `StoreProvider` +
routes pattern) as your root.

## Project structure

```
src/
  db/store.js             the "backend": accounts, groups, channels + roles,
                          topics, messages, notifications, scheduled
                          messages, offline outbox — all in one place
  context/StoreContext.jsx   makes the store reactive to React
  pages/                 RegisterPage, LoginPage, AppShell
  components/
    layout/               NavRail, ListPanel, ChatArea, DetailsPanel
    chat/                 MessageBubble, PendingMessageRow, Composer, TopicTabs
    modals/               every create/manage/settings/profile/roles/
                          notifications/scheduling dialog
    auth/                 AuthCard used by Register/Login
  utils/                  id/time/file helpers
```
