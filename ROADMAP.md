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

## Near-term improvements (2-4 weeks)
- Gmail ingestion for LinkedIn notification emails.
- Setup checklist for first-time users.
- Better duplicate handling and source quality checks.
- Bulk import (paste many links/handles at once).
- Client-level filters and saved views.
- Inline edit/delete for voice profiles (name, tags, sources).

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

## Source Expansion Plan
- Phase 1 (already live): Bluesky + LinkedIn-notification-email pipeline.
- Phase 2: Threads connector (official API path first; no unofficial scraping).
- Phase 3: Instagram connector for professional accounts where API access is supported.
- Add source health checks: auth state, rate-limit state, and last successful sync.
- Add source-level toggles per person so users can pause specific channels.
