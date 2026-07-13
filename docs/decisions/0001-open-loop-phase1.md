# ADR-0001: Open-loop joints in Phase 1

## Status

Accepted

## Context

The project wants high acceleration, low latency tracking, and "closed loop." True joint FOC (TMC4671 + AS5047P) costs roughly half the Phase-1 budget and is not the dominant error source for vision pick-and-place.

## Decision

Phase 1 runs **open-loop steppers** (TMC5160 + StallGuard) and closes the loop at the **system level via vision + prediction**. Encoders and FOC are a Phase-2 upgrade that reuses the mechanical build.

## Consequences

- Budget fits ~$400 with own PC + 3D printing.
- Must size motors/reduction so we stay inside the torque envelope (no step loss under planned loads).
- StallGuard provides homing + lost-step detection, not servo correction.
- Documentation must not claim joint closed-loop until Phase 2.
