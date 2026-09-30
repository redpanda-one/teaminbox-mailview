# TeamInbox MailView

A privacy-first Chrome extension by **RedPandaOne** that gives Zoho TeamInbox a mail-style reading pane inspired by the practical layout of Zoho Mail.

## What it does

- Starts TeamInbox in a clean, full-width conversation-list view.
- Opens the native TeamInbox conversation preview when a thread is selected.
- Presents the preview as a single vertical flow for header and message/thread content.
- Adds a draggable divider for preview width.
- Remembers only the chosen UI width locally.
- Provides a close-preview control and supports Escape to return to list-only view.

## Privacy

TeamInbox MailView is designed to operate entirely inside the browser.

- No analytics.
- No telemetry.
- No advertising SDKs.
- No remote APIs operated by RedPandaOne.
- No collection, logging, storage, sale, or transmission of email subjects, senders, recipients, bodies, attachments, tags, or other TeamInbox content.
- No cookies, browsing history, clipboard, downloads, or web-request permissions.
- The only persistent extension data is a local UI preference: the preview-pane width.

The extension's content script necessarily runs on `https://teaminbox.zoho.com/*` so it can adjust the TeamInbox interface. It interacts with page structure and UI events but is not designed to extract or retain message content.

See `PRIVACY.md` for the full privacy statement.

## Permissions

`storage` is used only for the preview-pane width.

The content script is limited by the manifest to:

`https://teaminbox.zoho.com/*`

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the extension folder.
6. Reload Zoho TeamInbox.

## Security and auditability

The source is intentionally small and unobfuscated so its behavior can be inspected. The project contains no remote executable code and no RedPandaOne network endpoint.

## Publisher

**RedPandaOne**  
Website: https://redpanda.one

## Source repository

Canonical source repository: https://github.com/redpanda-one/teaminbox-mailview

## License

Copyright © 2026 RedPandaOne. All rights reserved.

This repository is source-available for inspection and security review. It is not an open-source license. See `LICENSE.txt`.
