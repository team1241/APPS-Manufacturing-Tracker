# APPS Manufacturing Tracker

A read-only shop-floor display for the **Mfg/Mech Tracker** Monday board. Update items directly in monday.com; this app reads the board and displays its current state. No application database or edit key is required.

## Run locally

Use Node.js 24 LTS and npm:

```bash
nvm use
npm ci
npm run dev
```

Open [localhost:3050](http://localhost:3050). Development and production servers use port 3050. Without Monday credentials, the display shows labeled sample parts and notes.

## Using the display

- Five category queues plus an In progress lane, sorted Critical → High → Normal → Low.
- Each compact card shows quantity and status beside the part number, followed by the description, priority, category, assignee, and file buttons. Drawing status is searchable but is not displayed as a separate line. There is no item dialog or save action.
- Each file button opens its PDF in a separate tab. Parts with multiple PDFs show one button per file. Parts without a PDF show a placeholder.
- The prominent search field matches part numbers, descriptions, categories, statuses, priorities, quantities, assignee names, drawing status, and filenames. Search ignores case; multiple words can match different fields, in any order.
- Search results include completed parts and show the number of matches. Clear search to return to the queues. Search stays available in TV mode.
- All completed parts remain available in the expandable history. Recent completions appear in the scrolling ticker when they have a completion date in the configured time window.
- Robot progress counts completed records / all active board records, independently of search and required quantities. Older completions stay in that total.
- TV mode shows up to four cards per lane and rotates pages every 15 seconds. Shorter screens allow scrolling within each lane. Pause stops page rotation and the ticker. File contents load only when their button is opened.
- Optional shop notes and dates can come from a second Monday board.

## Typography

Fonts are self-hosted from `src/app/fonts` using `next/font/local`: Geist for the UI and body, and Space Grotesk for the header brand. Nunito Sans is configured as `font-heading` and Geist Mono as `font-mono`, with neither currently applied. Their font files are not preloaded. Font licenses are included beside the files.

## Monday connection

Copy `.env.example` to `.env.local` **only for a new setup**; preserve existing credentials when updating this project. Set `MONDAY_API_TOKEN` and the numeric `MONDAY_BOARD_ID` from the board URL. API tokens stay on the server and must not use a `NEXT_PUBLIC_` prefix. `.env.local` is gitignored.

The provided column IDs match Mfg/Mech Tracker:

| Environment variable | Column ID | Monday type |
| --- | --- | --- |
| `MONDAY_CATEGORY_COLUMN_ID` | `status` | Status |
| `MONDAY_STATUS_COLUMN_ID` | `status_mkkz36j4` | Status |
| `MONDAY_PRIORITY_COLUMN_ID` | `color_mm8zxr84` | Status |
| `MONDAY_DRAWING_COLUMN_ID` | `files_mkmcj69m` | Files |
| `MONDAY_COMPLETED_COLUMN_ID` | `date_mm8zvxe8` | Date |
| `MONDAY_DESCRIPTION_COLUMN_ID` (optional) | `long_text_mkkz1t29` | Long text |
| `MONDAY_QUANTITY_COLUMN_ID` (optional) | `numbers_mkmdycs` | Numbers |
| `MONDAY_DRAWING_STATUS_COLUMN_ID` (optional) | `color_mm07ej71` | Status |
| `MONDAY_ASSIGNEE_COLUMN_ID` (optional) | `multiple_person_mm8zvc1c` | People or Text |

Configured mappings must reference distinct columns of the expected type. The optional assignee mapping accepts a People or Text column. All assigned names are displayed; empty values show Unassigned. Assign people directly in Monday. For a different board, run `npm run monday:inspect` to see IDs, types, and status labels. The helper never prints the token. Restart the app after changing environment settings.

The adapter pins API version `2026-10`. It contains no Monday mutations, and there is no item-update endpoint. A token with read access to this board is sufficient. [Monday authentication](https://developer.monday.com/api-reference/docs/authentication)

## Labels and completion dates

Category matching ignores capitalization and accepts the five queue names, labels ending in ` Parts`, `LATHE`, and `3D PRINTER`.

| Monday status | Display grouping |
| --- | --- |
| Pending, Saw Cut, Ready, Not started, empty | Category queue |
| Working on it, Final Machining, In progress | In progress |
| Stuck, Blocked | Category queue, marked blocked |
| Done, Completed | Completed |
| Other labels | Category queue with the original status and a warning |

Medium and blank priorities sort as Normal. The Normal badge is hidden; Critical, High, and Low remain visible. Sorting and Monday data are unchanged.

To capture completions, configure **When Status changes to Done → set Completed Date to today** in Monday, or set the date manually. Clear the date if reopening a part. This display does not modify dates. Automation availability depends on the Monday plan.

The ticker uses the explicit completion date. Date-only values are interpreted as midnight UTC. Missing dates exclude a completed part from the recent ticker but preserve it in history and overall progress. Keep completed records active in Monday if they should count; archived/deleted items are not returned.

Uploaded PDF assets in the Files column appear as file buttons that open in a new tab. A read-only asset route streams them with an inline disposition, resolves IDs only from the configured board, and supports byte-range requests. Files in item updates, Monday docs, and external-storage links are not displayed. Signed drawing URLs are refreshed with each successful board fetch. [Monday Files API](https://developer.monday.com/api-reference/reference/files-1)

## Refresh and optional notes

`MONDAY_POLL_SECONDS` controls automatic polling and the shared server cache (60–3600 seconds, default 300). Manual refresh bypasses the polling cache with a shared 10-second cooldown. Failed refreshes retain the last successful browser snapshot. Account API limits still apply; notes and pagination add requests.

`COMPLETED_RETENTION_HOURS` controls the ticker window (1–720 hours, default 48). Items are never archived or deleted when they leave the ticker.

For notes, set `MONDAY_NOTES_BOARD_ID` to a second board with one note per item name, and optionally set `MONDAY_NOTES_DATE_COLUMN_ID` to its Date column. Dated notes are ordered earliest first, followed by undated notes.

The read endpoint has no login and exposes board details and temporary drawing links to anyone who can reach the app. Use the shop network or existing organizational access control for private board data.

## Checks and production

```bash
npm test
npm run typecheck
npm run lint
npm run build -- --webpack
npm start
```

Tests cover mapping, search, priority sorting, completion retention, pagination, caching, API errors, and the read-only adapter. The production build includes TypeScript checks.

## Project structure

- `src/components/manufacturing-board.tsx`: display, file buttons, search, polling, and TV controls.
- `src/lib/manufacturing.ts`: data types, search, ordering, progress, and retention.
- `src/lib/monday-mapping.ts`: normalize column values and drawing assets.
- `src/lib/monday.ts`: server-only read access, pagination, and caching.
- `src/app/api/board/route.ts`: normalized live or demo board data.
- `src/app/api/drawings/[assetId]/route.ts`: read-only inline PDF streaming for board assets.
- `.env.example`: connection settings without credentials.
