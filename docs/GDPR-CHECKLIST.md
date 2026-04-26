# GDPR-checklista for Airnest (IPP)

This checklist is adapted to the current app architecture (Expo app + Supabase Auth + local Arduino control).

## Must Have (minimum before production)

- [ ] Publish a privacy notice in-app and/or on web:
  - What is collected (`email`, `alias`, technical logs if any)
  - Why it is collected (authentication, app personalization, diagnostics)
  - Legal basis (typically contract/legitimate interest, depending on use)
  - Retention periods
  - Contact route for privacy requests
- [ ] Ensure Data Processing Agreement (DPA) with Supabase is accepted and documented.
- [ ] Define retention policy:
  - Auth profile data retention
  - Local app data retention (paired SSID/IP, program state)
  - Any future logs
- [ ] Implement user rights handling process:
  - Access/export request
  - Rectification request
  - Deletion request
- [ ] Implement account deletion flow (self-service or support route) including linked data cleanup.
- [ ] Add incident response process for personal data incidents (72h assessment flow).

## Should Have (strongly recommended)

- [ ] Separate alias from real-name semantics consistently in UI and docs.
- [ ] Add explicit language that alias does not need to be real identity.
- [ ] Keep input normalization for alias/email (trim, lowercase email, remove control chars).
- [ ] Minimize local persistence where possible (only store what is needed).
- [ ] Add simple audit logging for critical commands (start/stop, mode changes), without logging unnecessary personal data.
- [ ] Restrict device command access better on LAN (shared token/key, pairing secret, or signed command scheme).

## Security and Ethics Notes (IoT-specific)

- [ ] Document that Arduino command endpoints are local-network accessible.
- [ ] Add clear ownership model for shared devices (who may control one cabinet).
- [ ] Add fail-safe behavior documentation for relay/heater/fan controls.

## Current Status Snapshot (from this codebase)

- Implemented:
  - Alias-based metadata (`full_name` used as alias)
  - Input normalization for alias/email
  - Basic in-app explanation at registration
- Still needed for "GDPR-ready" claim:
  - Formal privacy policy
  - DPA documentation and retention policy
  - Account deletion/rights workflow
  - Incident process

