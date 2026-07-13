# System Architecture

## Goal

A magnetic-joint parallelogram delta robot that:

- reaches **~3 g peak** acceleration in Speed mode (Precise mode is slower, settle-focused)
- tracks moving targets with **prediction** (not chase-the-last-frame)
- keeps **joint control open-loop** in Phase 1; closes the loop at the **system level via vision**
- upgrades later to joint FOC closed loop without redesigning the mechanics

## Control topology (Phase 1)

```
┌─────────────────────────────────────────────────────────┐
│  HOST PC                                                │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌───────┐ │
│  │ Vision   │→ │ Predictor  │→ │ Planner  │→ │ IK    │ │
│  │ (OV9281) │  │ (pos+vel)  │  │ modes    │  │       │ │
│  └──────────┘  └────────────┘  └──────────┘  └───┬───┘ │
│                                                   │     │
│                              timed joint setpoints│     │
└───────────────────────────────────────────────────┼─────┘
                                                    │ USB serial / UART
                                                    │ (NO WiFi on this path)
                                                    ▼
┌─────────────────────────────────────────────────────────┐
│  ESP32                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Protocol RX  │→ │ Step executor│→ │ TMC5160 SPI   │ │
│  │ + watchdog   │  │ (joint space)│  │ config/stall  │ │
│  └──────────────┘  └──────────────┘  └───────┬───────┘ │
└──────────────────────────────────────────────┼─────────┘
                                               │ step/dir × 3
                                               ▼
                                         NEMA 17 × 3
```

### Responsibility split

| Layer | Owns | Does **not** own |
|---|---|---|
| **Host** | Camera, detection, prediction, IK/FK, trajectory planning, mode profiles, logging | Hard real-time step pulses |
| **ESP32** | Timed joint setpoint execution, SPI driver config, StallGuard homing/watchdog, E-stop response | Vision, IK, path planning |
| **Drivers** | Current regulation, microstepping, StallGuard diagnostics | Position servo loop (Phase 1) |

This split exists because an ESP32 is not a USB-host UVC machine and cannot run 120–210 FPS vision + 3-axis hard servo simultaneously. The host is the brain; the ESP32 is a deterministic muscle interface.

## Latency budget (wired)

| Stage | Typical |
|---|---|
| Exposure (1/200 s) | ~5 ms |
| USB transfer | ~2–5 ms |
| Detection | ~2–10 ms |
| IK + plan | ~1–3 ms |
| Host → ESP32 serial | ~1–2 ms |
| Step execution | ~1 ms |
| **Total (wired)** | **~15–30 ms** |

At conveyor speed \(v\), 25 ms of latency is \(v \times 0.025\) of position error if you aim at *where the object was*. Fix: velocity feed-forward / prediction. Track position **and** velocity, timestamp frames, command the intercept pose.

## Software modes

Modes are **parameter sets**, not hardware features.

| Parameter | Speed | Precise |
|---|---|---|
| Max accel | ~3 g class | ~0.5–1 g |
| Jerk profile | aggressive trapezoid | S-curve / jerk-limited |
| Blending | blend through waypoints | full stop + settle dwell |
| Vision role | predict + intercept | optional visual confirm before final approach |
| Use | tracking / catching | placement |

Defined in `config/modes.yaml`, consumed by the host planner.

## Repo map

| Path | Role |
|---|---|
| `docs/` | Architecture, protocol, kinematics, safety, ADRs, BOM |
| `config/` | Machine geometry + mode profiles (data, not code) |
| `protocol/` | Host↔MCU message schema (shared contract) |
| `firmware/` | ESP32 PlatformIO project (executor) |
| `host/` | Python package (vision, planner, IK, serial link) |
| `hardware/` | CAD, printable parts, drawings |
| `scripts/` | Analysis tools (dynamic model, helpers) |

## Phase 2 (not Phase 1)

Joint FOC closed loop (AS5047P + TMC4671, or integrated servo-steppers) reuses the mechanical build. Encoders are deferred until they have a driver that can close on them. See `docs/BOM.md` §6 and `docs/decisions/`.
