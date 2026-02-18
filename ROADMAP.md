# BriefMe Roadmap

## MVP now (ship and test)
- Multi-source people profiles (LinkedIn + Bluesky + more) in one person record.
- Avatar fetch for Bluesky profiles to improve list scanning.
- One-click "Refresh posts now" button in dashboard.
- Daily/weekly cadence controls and free-form tagging.
- Magic-link sign in.
- Landing page + dashboard ready for external testing.
- Per-user private workspace auto-creation on first login.
- Client-specific brief generation from recent tracked posts.
- New-user onboarding checklist in dashboard.
- Optional client-to-voice linking for tighter relevance.
- Attachment uploads on digest items (5 MB per file).
- One-click "Run full daily brief now" (ingest + brief + email) from dashboard.
- Bulk import for watchlists (paste many links/handles in one step).
- Run Health page with success/failure history.
- Daily owner signup summary email.
- Per-client digest email delivery controls (recipient list + on/off).
- Per-client “send test digest email” action.
- Recipient validation guardrails (invalid/typo warnings).

## Near-term improvements (2-4 weeks)
- Gmail ingestion for LinkedIn notification emails.
- LinkedIn email parser endpoint for subject/body webhook ingestion (MVP).
- Setup checklist for first-time users.
- Better duplicate handling and source quality checks.
- Bulk import (paste many links/handles at once).
- Client-level filters and saved views.
- Delivery preferences (daily send time + timezone picker).
- Daily run analytics card (success rate and failure reasons).
- Richer email format with per-client sections and top linked sources.
- In-app run history page (with downloadable error logs).
- Beta owner daily signup summary email (new-user alert automation).
- SMTP bounce/complaint tracking and auto-disable bad recipient addresses.

## Product value layer (next phase)
- Automatic daily brief generation by client.
- Priority scoring by relevance.
- Suggested response drafts.
- Shareable client digest exports.

## Longer-term roadmap
- Team workspaces and permissions.
- Billing and plan limits.
- Cross-network identity suggestions (link likely profiles for same person).
- Scheduled background ingestion jobs.
- Monitoring, retry logic, and audit logs.
- Move attachments to object storage with signed URLs.
- Admin controls for beta approvals and upgrade requests.

## Source Expansion Plan
- Phase 1 (already live): Bluesky + LinkedIn-notification-email pipeline.
- Phase 2: Threads connector (official API path first; no unofficial scraping).
- Phase 3: Instagram connector for professional accounts where API access is supported.
- Add source health checks: auth state, rate-limit state, and last successful sync.
- Add source-level toggles per person so users can pause specific channels.
