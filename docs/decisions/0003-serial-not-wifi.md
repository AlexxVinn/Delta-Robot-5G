# ADR-0003: Wired serial only on the motion path

## Status

Accepted

## Context

Tracking error under latency is \(v \times t_{delay}\). WiFi adds 5–20 ms and jitter. That destroys intercept accuracy for moving targets.

## Decision

Motion and supervision use **USB-CDC / UART only**. WiFi/BLE are not used for setpoint streaming in Phase 1.

## Consequences

- Physical tether required during operation.
- Protocol can assume relatively stable delivery (still needs stream timeout).
- Simpler bring-up and deterministic latency budget (~15–30 ms end-to-end wired).
