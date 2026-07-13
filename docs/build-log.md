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

## 2026-07-13 — Procurement / bring-up prep

**Goal:** Unblock AliExpress first buy and software-only verification while parcels ship.
**Done:** `docs/procurement.md`, `docs/wiring.md`, `docs/bringup.md`; motor profile YAML; dynamic model loads YAML; protocol self-test script; `delta-host camera-probe`; predictor unit test.
**Measured / observed:** host pytest green; protocol selftest OK; example motor YAML at 3 g / N=3 still FAIL on pull-out 0.35 N·m (expected — forces honest ratio/torque choice after real datasheet).
**Blocked by:** Real motor inductance/torque/inertia from purchased units.
**Next:** Order motors + HV TMC5160 + OV9281 per procurement filters; fill `config/motors/motor.yaml`; re-run dynamic model before belts/pulleys.
**BOM / config changes:** none to BOM totals; added `config/motors/motor.example.yaml`.

## 2026-07-13 — Repository foundation

**Goal:** Stand up a real development skeleton before buying/building.
**Done:** Architecture, protocol contract, kinematics conventions, safety rules, ADRs, firmware + host stubs, machine/mode config, dynamic-model script, sims.
**Measured / observed:** n/a (docs/code structure only).
**Blocked by:** Dynamic model needs real motor datasheet numbers before pulley ratio is frozen.
**Next:** Pick motors to the BOM inductance/torque targets; fill `config/machine.yaml` geometry when frame is designed.
**BOM / config changes:** BOM v1.0 already in `docs/BOM.md`.
