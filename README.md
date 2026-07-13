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
config/          machine geometry + Speed/Precise profiles
protocol/        host↔MCU message schema (shared contract)
firmware/        ESP32 PlatformIO executor
host/            Python: kinematics, vision, planner, serial link
hardware/        CAD + printable parts
docs/            architecture, protocol, kinematics, safety, ADRs, BOM
scripts/         analysis tools (dynamic model, …)
```

## Documentation index

| Doc | What |
|---|---|
| [`docs/BOM.md`](docs/BOM.md) | Parts list, motor selection, Phase-2 upgrade path |
| [`docs/architecture.md`](docs/architecture.md) | Control topology, latency budget, repo map |
| [`docs/protocol.md`](docs/protocol.md) | Serial framing and message catalog |
| [`docs/kinematics.md`](docs/kinematics.md) | Frames, joint zero, IK/FK conventions |
| [`docs/safety.md`](docs/safety.md) | Non-negotiable electrical/mechanical rules |
| [`docs/decisions/`](docs/decisions/) | Architecture Decision Records |
| [`docs/build-log.md`](docs/build-log.md) | Dated engineering journal |

## Quick start (dev skeleton)

**Host**

```bash
cd host
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

**Firmware** (requires [PlatformIO](https://platformio.org/))

```bash
cd firmware
pio run
```

**Dynamic model** (run before freezing pulley ratio)

```bash
python scripts/dynamic_model.py --help
```

Copy `config/machine.example.yaml` → `config/machine.yaml` and fill real geometry (local `machine.yaml` is gitignored).

## Licenses

| Tree | License |
|---|---|
| Software (`firmware/`, `host/`, `protocol/`, `scripts/`) | MIT |
| Hardware (`hardware/`) | CERN-OHL-W v2 |
| Docs (`docs/`) | CC-BY-4.0 |

## Status

Foundation / bring-up scaffolding. Mechanics and calibrated machine parameters are not frozen until the dynamic model and frame design are done — see the build log.
