# Architecture

Host = brain (vision, predict, plan, IK).  
ESP32 = muscle (timed joint steps, TMC SPI, StallGuard, e-stop).

```
cam → host → USB serial → ESP32 → TMC5160 ×3 → motors
```

Wired serial only. Joint stream is microsteps, not XYZ.

Modes (Speed / Precise) are planner profiles in `config/modes.yaml`.

Phase 2: encoders + FOC if we still care. Not now.

Latency ballpark wired: ~15–30 ms end-to-end → predict, don’t chase.
