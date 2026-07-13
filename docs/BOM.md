# Delta BOM — Phase 1

Open-loop steppers + vision outer loop. ~$400 if you already have a PC and printer.

Assumes: own PC as host, 3D-printed mounts/sectors.

**Must-haves:** bus OV clamp, joint retention springs.

## Motion

| Part | Qty | ~$ |
|---|---:|---:|
| NEMA17 low-L (≤1.8 mH, 2–2.5 A, ~0.45 N·m, 48 mm, dual shaft) | 3 | 60 |
| TMC5160 HV SPI | 3 | 60 |
| ESP32 DevKit | 1 | 6 |
| 48 V 350–400 W PSU | 1 | 32 |
| 4700 µF/63 V + OV clamp | 1 | 10 |
| Driver fan | 1 | 3 |

## Vision

| Part | Qty | ~$ |
|---|---:|---:|
| OV9281 USB global shutter mono | 1 | 50 |
| LED lighting (DC / HF) | 1 | 18 |
| Host PC | — | 0 |

## Mech

| Part | Qty | ~$ |
|---|---:|---:|
| CF tube 6/4 mm | 6 | 18 |
| N52 + 10 mm balls | 12+12 | 25 |
| Joint springs | 1 | 5 |
| GT2 9 mm belt 5 m | 1 | 15 |
| 20T pulleys | 3 | 9 |
| Printed sectors + idlers + bearings | 1 | 18 |

## Frame

| Part | Qty | ~$ |
|---|---:|---:|
| 2040 extrusion | 9 | 50 |
| Fastener kit | 1 | 15 |

**Phase 1 ≈ $394**

## Later (Phase 2)

AS5047P ×3, TMC4671 or closed-loop steppers, vacuum gripper.

## Motors

Want: 48 mm, ≤1.8 mH, 2–2.5 A, ~0.45 N·m, 1.8°, dual shaft. Same batch ×3. Lower L wins over extra holding torque.

CSV: [`bom.csv`](bom.csv)
