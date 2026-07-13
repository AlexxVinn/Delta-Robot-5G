# ADR-0002: Host does vision + planning; ESP32 executes steps

## Status

Accepted

## Context

ESP32 cannot be a USB UVC host for OV9281, cannot run 120–210 FPS vision, and cannot also run hard multi-axis planning. Stuffing everything onto one MCU produces a mediocre everything.

## Decision

- **Host PC:** camera, detection, prediction, IK/FK, trajectory planning, mode profiles.
- **ESP32:** protocol RX, timed joint setpoint execution, TMC5160 SPI config, StallGuard, E-stop.
- Host streams **joint-space** timed targets; MCU does not run IK.

## Consequences

- Clear module boundaries in the repo (`host/`, `firmware/`).
- Protocol becomes a first-class contract (`protocol/`, `docs/protocol.md`).
- Latency is dominated by vision + USB + serial — prediction is mandatory for tracking.
- Debugging splits cleanly: vision/plan bugs on host, timing/driver bugs on MCU.
