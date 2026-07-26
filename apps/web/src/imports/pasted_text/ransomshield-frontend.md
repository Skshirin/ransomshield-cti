# Master Prompt: RansomShield CTI Platform — Complete Frontend Generation

Copy everything below into your design/generation tool as a single prompt.

---

## PRODUCT CONTEXT

Build the complete multi-page web frontend for **RansomShield**, an ML-based ransomware detection platform with blockchain-verified Cyber Threat Intelligence (CTI) sharing between organizations. This is a B2B security product used by SOC analysts and IT admins at client organizations.

**Product flow:** A Windows agent monitors endpoints, an ML model scores behavior for ransomware likelihood, confirmed detections generate a CTI report, and that report's integrity hash is published to the Polygon blockchain so other organizations can verify shared threat intel hasn't been tampered with.

Generate **every page listed below in one pass**, sharing the same design system, sidebar, and component library throughout.

---

## DESIGN SYSTEM (extracted from existing brand screens — match exactly)

**Brand**
- Name: "RansomShield", subtitle "CTI Platform" — shield icon in a dark rounded-square badge
- Logo subtitle and small labels use a monospace font; all other text uses a clean sans-serif (Inter/similar)

**Color palette**
- Sidebar background: deep navy (`#16232e`–`#1a2332`), white text/icons, active nav item highlighted with a lighter navy rounded rect
- Main content background: white / very light gray (`#f8f9fb`)
- Cards: white, rounded-xl corners, subtle drop shadow, thin colored accent bar along the top edge (purple, red, green, amber — one per KPI card, no fixed meaning, just visual variety)
- Severity badges (pill-shaped, colored bg + darker text of same hue):
  - Critical → red/pink
  - High → orange/amber
  - Medium → yellow
  - Low → gray/blue
- Status badges:
  - Resolved → green
  - False Positive → gray
  - Published → green
  - Draft → gray outline
  - Pending → amber
  - Online → green dot + label
  - Offline → gray dot
  - At Risk → red dot
- Primary buttons: dark navy fill, white text, right-pointing arrow icon
- Secondary buttons: white with border
- Login/Register screens: split-screen layout — left panel dark navy with large marketing headline, supporting copy, and a checklist of 4 value props (checkmark icon + text); right panel white with the form, icon-prefixed rounded input fields (mail icon, lock icon), primary button, "or" divider, secondary outlined button, small demo-credentials hint text at the very bottom

**Layout**
- Persistent left sidebar (nav icons + labels): Dashboard, Endpoints, Detections (with unread-count badge), CTI Center, Audit Logs, Team, Settings — user mini-profile card pinned at sidebar top (avatar initials, name, org) and Log Out pinned at sidebar bottom
- Top bar on every interior page: page title (large bold) on the left, global search bar (with ⌘K hint) + notification bell + user avatar on the right
- KPI summary cards in a 4-column row at the top of Dashboard; content below in a 2-column layout (main content ~65%, side panel ~35%)

---

## COMPLETE BACKEND API CONTRACT

Base URL: `http://localhost:4000/api` (configurable). Auth: JWT access token (`Authorization: Bearer <token>`, 15 min expiry) + httpOnly refresh cookie (7 days, auto-rotated via `/auth/refresh-token`). Real-time: Socket.IO on the same host, auth via `{ auth: { token } }` handshake, client joins an org-scoped room automatically server-side.

### Roles
`ORG_ADMIN`, `SECURITY_ANALYST`, `SUPER_ADMIN` — gate UI actions accordingly (e.g., only ORG_ADMIN can add/remove endpoints, publish CTI is available to any authenticated org member, user management is ORG_ADMIN only).

### Auth
- `POST /auth/register` — body: `{organizationName, adminName, email, password}` → 201
- `POST /auth/login` — body: `{email, password}` → `{accessToken, user: {id, name, email, role, organizationId}}`, sets refresh cookie
- `POST /auth/refresh-token` — cookie-based → `{accessToken}`
- `POST /auth/logout`

### Endpoints (`/endpoints`)
- `GET /` → `{endpoints: [{_id, name, status: PENDING|ONLINE|OFFLINE|AT_RISK, osVersion, agentVersion, lastCheckInAt, cpuUsagePercent, ramUsagePercent, diskUsagePercent, createdAt}]}`
- `GET /:id` → `{endpoint}`
- `POST /` (ORG_ADMIN) — body `{name}` → `{endpoint, activationToken, installInstructions}` — show the raw token once in a copyable modal, warn it's shown only this one time
- `DELETE /:id` (ORG_ADMIN) — soft delete/remove

### Detections (`/detections`)
- `GET /?status=&severity=&endpointId=&from=&to=` → `{detections: [{_id, endpointName, riskScore (0-100), severity: LOW|MEDIUM|HIGH|CRITICAL, status: NEW|INVESTIGATING|RESOLVED|FALSE_POSITIVE, indicators: [{type, description, observedAt}], detectedAt}]}`
- `GET /:id` → full detection detail incl. all indicators
- `PATCH /:id/resolve` — body `{outcome: "RESOLVED"|"FALSE_POSITIVE"}`

### CTI (`/cti`)
- `GET /` → org's own reports: `{reports: [{_id, detectionId, attackSummary, indicatorsOfCompromise: [string], recommendedActions: [string], analystNotes, status: DRAFT|PUBLISHED|FAILED, transactionHash, blockNumber, verificationStatus: VERIFIED|PENDING|FAILED, publishedAt}]}`
- `GET /feed` → cross-org public feed of published reports (org identity stripped — show as "Anonymous Organization")
- `GET /:id` → single report detail
- `POST /` — body `{detectionId}` → auto-generates a draft
- `PATCH /:id` — body `{analystNotes?, attackSummary?}` — edit a draft
- `POST /:id/publish` → triggers real blockchain transaction, returns updated report with `transactionHash`/`blockNumber`; show a "Publishing to Polygon..." loading state (real network call, several seconds)
- `DELETE /:id` — discard a draft

### Users/Team (`/users`)
- `GET /` → org's team members: `{users: [{_id, name, email, role, isActive, lastLoginAt}]}`
- `POST /` (ORG_ADMIN) — invite: `{name, email, temporaryPassword, role}`
- `PATCH /:id/role` (ORG_ADMIN) — `{role}`
- `PATCH /:id/deactivate` / `PATCH /:id/reactivate` (ORG_ADMIN)

### Audit Logs (`/audit-logs`) — ORG_ADMIN only
- `GET /?action=&userId=&from=&to=` → `{logs: [{_id, userEmail, action, method, path, statusCode, success, ipAddress, createdAt}]}`

### Real-time WebSocket events (org-scoped room)
- `detection:new` → full detection object — show a toast + live-update the dashboard/detections list
- `detection:resolved` → full detection object — update list item status live
- `cti:published` → full report object — update CTI list live, show a success toast with a "View on Polygonscan" link using `transactionHash`

---

## PAGES TO GENERATE (all, in one pass)

1. **Login** — per design system above; error state for invalid credentials
2. **Register Organization** — org name, admin name, email, password, confirm password
3. **Dashboard** — 4 KPI cards (Total Endpoints, Active Detections, CTI Published, Endpoints Offline), Recent Detections list (severity badge, endpoint name, risk score, indicator type, status badge, "View all" link), Endpoint Status side panel (name + online/offline/pending dot), Recently Published Intelligence section (title, published date, "Blockchain verified" tag)
4. **Endpoints** — table/grid of all endpoints (name, status badge, OS version, last check-in, CPU/RAM/disk mini-bars), "Add Endpoint" button opening a modal (name input → shows activation token + install instructions on success, with a copy button and one-time-visibility warning), row click → detail view, remove action (ORG_ADMIN only)
5. **Endpoint Detail** — endpoint metadata, live resource usage, list of detections tied to this endpoint
6. **Detections** — filterable table (status, severity, endpoint, date range), severity badges, click-through to detail
7. **Detection Detail** — full indicator list with timestamps, risk score, "Generate CTI Report" button (if none exists yet), "Mark Resolved" / "Mark False Positive" action buttons with confirmation
8. **CTI Center** — tabs: "My Organization's Reports" (draft/published list, edit draft, publish button with loading state, discard draft) and "Global CTI Feed" (published reports from all orgs, anonymized, each showing transaction hash + "Verify on Polygonscan" link + a copy-hash button)
9. **CTI Draft Editor** — attack summary (editable textarea), indicators of compromise (list), recommended actions (list), analyst notes (editable textarea), Publish / Discard buttons
10. **Blockchain Verification Tool** — input a report ID or transaction hash, call verify logic, show VERIFIED/FAILED result visually (green check / red x), link out to Polygonscan
11. **Audit Logs** (ORG_ADMIN only) — filterable table: timestamp, user email, action, method+path, status code, success/fail icon, IP address
12. **Team** (ORG_ADMIN only) — member list (name, email, role badge, active/inactive), "Invite Member" modal (name, email, temp password, role dropdown), role-change dropdown per row, deactivate/reactivate toggle
13. **Settings** — organization name (read-only or admin-editable), current user profile, password change, CTI sharing preference toggle if applicable

---

## INTERACTION NOTES

- Every list screen should have an empty state (e.g., "No detections yet — your endpoints are all clear")
- Every destructive action (remove endpoint, discard draft, deactivate user) needs a confirm step
- Toasts for: new real-time detection, CTI published success, errors
- Loading skeletons for all data-fetching states, not blank screens
- Role-gate UI elements client-side too (hide, don't just disable, actions the current role can't perform) — but the real enforcement is server-side already

Generate all pages now, fully wired to this API contract, in the exact visual style of the reference screenshots.