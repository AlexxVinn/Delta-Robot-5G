# Protocol

Shared **host ↔ ESP32** wire contract.

| File | Role |
|---|---|
| `messages.yaml` | Machine-readable source of truth (codes, payloads, version) |
| [`../docs/protocol.md`](../docs/protocol.md) | Human explanation, framing, bring-up order |

When you change this directory:

1. Bump `version` in `messages.yaml` if the change is breaking.
2. Update `docs/protocol.md`.
3. Update parsers in `host/src/delta_host/protocol/` **and** `firmware/include/protocol.h` + `firmware/src/protocol/` in the same commit.

Implementations should treat unknown `msg_type` values as `FAULT_PROTOCOL` / ignore, never as crash.
