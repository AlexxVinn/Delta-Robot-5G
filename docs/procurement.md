# Buy first

Motors, HV drivers, camera. Everything else waits until the motor datasheet is in `config/motors/` and the dynamic model doesn’t fail.

| # | Part | Qty |
|---|---|---:|
| 1 | NEMA17 low-L (~48 mm, ≤1.8 mH, 2–2.5 A, dual shaft) | 3 |
| 2 | TMC5160 **48 V / HV**, SPI | 3 |
| 3 | OV9281 global shutter USB | 1 |
| 4 | 48 V 350–400 W PSU | 1 |
| 5 | ESP32 DevKit | 1 |

Skip for now: frame, CF, belts, magnets, vacuum, encoders.

## Filters

**Motor** — need L, I, torque, dual shaft on the listing. No L listed → skip. Same model ×3.

**TMC5160** — must say 48 V (or higher). SPI. Skip 24–36 V boards.

**Camera** — OV9281 + global shutter + UVC. Skip random rolling-shutter webcams.

## When it arrives

1. Fill `config/motors/motor.yaml` from datasheet
2. `python scripts/dynamic_model.py --motor config/motors/motor.yaml --accel-g 3 --ratio 3`
3. Only then order pulleys / belts

Wiring: [`wiring.md`](wiring.md)
