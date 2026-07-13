# Procurement — first buy (AliExpress)

Buy only the long-lead, hard-to-substitute parts first. Frame, CF tubes, belts, and printables can wait until motor datasheet numbers are in `config/motors/` and `scripts/dynamic_model.py` passes with margin.

## Buy now (order)

| Priority | Part | Qty | Why now |
|---:|---|---:|---|
| 1 | NEMA 17 low-inductance steppers | 3 | Spec lies are common; need real L/τ/J before freezing ratio \(N\) |
| 2 | TMC5160 **HV** SPI drivers | 3 | Must actually take 48 V; fakes are rampant |
| 3 | Arducam / OV9281 USB global shutter | 1 | Vision path depends on this exact sensor class |
| 4 | 48 V 350–400 W PSU | 1 | Needed for any meaningful torque-at-speed test |
| 5 | ESP32 DevKit V1 | 1 | Cheap; get it with the drivers |

**Defer:** extrusion, CF, magnets/balls, belts/pulleys, vacuum, encoders, FOC drivers.

## Acceptance filters (read the listing)

### NEMA 17 (all 3 identical)

Must show **all** of:

- Body **~48 mm** (not 60 mm unless you accept more inertia)
- **1.8°** / 200 steps
- Rated current **2.0–2.5 A**
- Holding torque **~0.45–0.5 N·m**
- Phase inductance **≤ 1.8 mH** (hard filter)
- **Dual shaft** 5 mm (Phase-2 encoder path)

Reject if: inductance missing, only “high torque” marketing, single-shaft only, mixed models across the 3 pcs.

On arrival: measure/record into `config/motors/motor.yaml` (copy from example). Prefer a PDF datasheet from the seller.

**Search seeds:** `NEMA17 2.5A 1.6mH dual shaft`, `LDO 42STH48 2504`, `low inductance NEMA17 48mm`.

### TMC5160 HV

Must show:

- **48 V** (or 50–60 V) bus rating on the product page / PCB silkscreen photos
- **SPI** (not UART-only silent boards unless you know what you bought)
- Heatsink / exposed MOSFETs sized for ~2 A continuous

Reject if: “5160” with 24–36 V only, no SPI header, no sense resistor value.

Wire plan: [`wiring.md`](wiring.md).

### OV9281 camera

Must show:

- **OV9281** by name
- **Global shutter**
- **USB UVC** (host PC)
- Monochrome preferred

Reject: generic rolling-shutter “1080p USB camera”.

## Arrival checklist (before soldering power)

1. Photograph every board/motor + label.
2. Fill `config/motors/motor.yaml` from datasheet (L, R, I, τ_hold, J).
3. Run:

```bash
python scripts/dynamic_model.py --motor config/motors/motor.yaml --accel-g 3 --ratio 3
```

4. If FAIL: raise \(N\), cut moving mass, or pick a lower accel target — **do not** order pulleys until this passes with margin ≥ 1.5.
5. Flash ESP32 firmware smoke build (`cd firmware && pio run`) while waiting on mechanics.
6. Plug camera into host: `delta-host camera-probe` (needs OpenCV extra).

## Money discipline

Do **not** buy the magnetic joints / CF / belts in the same cart as the first order. Geometry and \(N\) are still free parameters until the motor model is real.
