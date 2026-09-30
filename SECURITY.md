# Security

TeamInbox MailView is intentionally designed with a minimal attack and privacy surface.

## Design constraints

- No remote executable code.
- No analytics or telemetry.
- No RedPandaOne backend.
- No email-content persistence.
- No `cookies`, `history`, `tabs`, `webRequest`, `downloads`, `clipboardRead`, or broad `<all_urls>` permission.
- UI preference storage only.

## Reporting a security issue

Please contact RedPandaOne through https://redpanda.one rather than publishing sensitive exploit details in a public issue.
