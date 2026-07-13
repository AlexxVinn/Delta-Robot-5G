# Delta-Robot-5G

High-speed, vision-tracked **delta robot** (pick-and-place).

Phase 1 closes the loop with a **camera + motion prediction** on a host PC and an **ESP32 step executor** driving three TMC5160s. Joint FOC closed loop is a later upgrade that reuses the mechanical build.

| Target | Phase 1 |
|---|---|
| Peak accel | ~3 g (Speed mode); Precise mode is slower on purpose |
| Repeatability | ~±0.2 mm class after calibration |
| Budget | ~$400 (own PC + 3D printer assumed) |
| Control link | Wired USB/UART only |

## Architecture (one paragraph)

Host runs vision → prediction → planner → IK and streams **timed joint setpoints** over serial. ESP32 executes steps, configures TMC5160 over SPI, homes with StallGuard, and faults on stream gaps. Details: [`docs/architecture.md`](docs/architecture.md).

```
OV9281 → Host (detect / predict / plan / IK) ──USB serial──► ESP32 → TMC5160 ×3 → NEMA17 ×3
```

## Repository layout

```
config/          machine + motor profiles + Speed/Precise modes
protocol/        host↔MCU message schema (shared contract)
firmware/        ESP32 PlatformIO executor
host/            Python: kinematics, vision, planner, serial link
hardware/        CAD + printable parts
sim/             browser kinematics + NEMA 17 rough simulators
docs/            architecture, procurement, wiring, bring-up, BOM, …
scripts/         dynamic model, protocol self-test
```

## Documentation index

| Doc | What |
|---|---|
| [`docs/procurement.md`](docs/procurement.md) | **Buy first** — AliExpress filters + arrival checklist |
| [`docs/wiring.md`](docs/wiring.md) | ESP32 ↔ TMC5160 pin map + 48 V bus |
| [`docs/bringup.md`](docs/bringup.md) | Power-on ladder from software-only → tracked catch |
| [`docs/BOM.md`](docs/BOM.md) | Parts list, motor selection, Phase-2 upgrade path |
| [`docs/architecture.md`](docs/architecture.md) | Control topology, latency budget |
| [`docs/protocol.md`](docs/protocol.md) | Serial framing and message catalog |
| [`docs/kinematics.md`](docs/kinematics.md) | Frames, joint zero, IK/FK conventions |
| [`docs/safety.md`](docs/safety.md) | Non-negotiable electrical/mechanical rules |
| [`docs/decisions/`](docs/decisions/) | Architecture Decision Records |
| [`docs/build-log.md`](docs/build-log.md) | Dated engineering journal |
| [`sim/`](sim/) | Browser kinematics + NEMA 17 simulators |

## Quick start (right now, before parcels)

```bash
cd host
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
delta-host ik --xyz 0,0,250
python ../scripts/protocol_selftest.py
python ../scripts/dynamic_model.py --motor ../config/motors/motor.example.yaml --accel-g 3
```

When the camera arrives: `pip install -e ".[vision]" && delta-host camera-probe`.

**Firmware** (requires [PlatformIO](https://platformio.org/)): `cd firmware && pio run`

**Simulators:** open [`sim/kinematics/index.html`](sim/kinematics/index.html) / [`sim/nema17/index.html`](sim/nema17/index.html)

Copy `config/machine.example.yaml` → `config/machine.yaml` when geometry is measured. After motor datasheets arrive, copy `config/motors/motor.example.yaml` → `config/motors/motor.yaml` and re-run the dynamic model **before** ordering pulleys.

## Licenses

| Tree | License |
|---|---|
| Software (`firmware/`, `host/`, `protocol/`, `scripts/`) | MIT |
| Hardware (`hardware/`) | CERN-OHL-W v2 |
| Docs (`docs/`) | CC-BY-4.0 |

## Status

Procurement phase: buy motors / HV TMC5160 / OV9281 first ([`docs/procurement.md`](docs/procurement.md)). Mechanics not frozen until dynamic model passes on real motor numbers.
