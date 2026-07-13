# Build Log

Project journal. Keep entries short, dated, and tied to **verifiable results** — not vibes.

## Template

```markdown
## YYYY-MM-DD — <title>

**Goal:**
**Done:**
**Measured / observed:**
**Blocked by:**
**Next:**
**BOM / config changes:** (link commit or note none)
```

## Entries

<!-- Add newest entries at the top -->

## 2026-07-13 — Repository foundation

**Goal:** Stand up a real development skeleton before buying/building.
**Done:** Architecture, protocol contract, kinematics conventions, safety rules, ADRs, firmware + host stubs, machine/mode config, dynamic-model script.
**Measured / observed:** n/a (docs/code structure only).
**Blocked by:** Dynamic model needs real motor datasheet numbers before pulley ratio is frozen.
**Next:** Pick motors to the BOM inductance/torque targets; fill `config/machine.yaml` geometry when frame is designed.
**BOM / config changes:** BOM v1.0 already in `docs/BOM.md`.
