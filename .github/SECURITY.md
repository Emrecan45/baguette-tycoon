# Security policy

## Supported versions

Only the latest version receives fixes.

| Version | Supported |
| --- | --- |
| Latest | Yes |
| Older | No |

## Reporting a vulnerability

Do not publish exploitable security details in an issue. Use [GitHub private vulnerability reporting](https://github.com/Emrecan45/baguette-tycoon/security/advisories/new) so the details reach the maintainer privately.

Include the affected version, browser, reproduction steps and potential impact. Do not include personal saves, account tokens or credentials.

## Scope

This is a single-player browser game. Script injection, unsafe external resource handling, exposure of credentials, and misuse of SDK callbacks are relevant. Local currency and progress are client-controlled, so editing a browser save by itself is not a server-side security boundary. There is no multiplayer backend in this repository.
