# ADR-0004: Dual software modes (Speed / Precise)

## Status

Accepted

## Context

Peak accel for catching and settle behavior for placement fight each other if forced into one profile.

## Decision

Two host-side mode profiles in `config/modes.yaml`:

- **Speed:** high accel, blend-through, prediction-first — tracking/catching.
- **Precise:** low accel, S-curve, settle dwell — placement.

Same hardware. Mode is a planner parameter set, not a firmware personality (MCU may apply caps, but host owns the profile).

## Consequences

- Zero added BOM cost.
- Clear demo contrast and safer bring-up path (commission in Precise first).
- Mode id is still sent to MCU for limit awareness (`SET_MODE`).
