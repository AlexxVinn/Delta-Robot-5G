# Wiring (Phase 1)

Matches `firmware/include/pins.h`. Change the header **and this doc** together if you reassign pins.

## Power topology

```
AC mains
  └─ 48 V PSU (350–400 W)
        ├─ DC+ ──┬── bulk cap 4700 µF / 63 V (at driver bus)
        │        ├── brake/OV clamp (TVS + MOSFET + power resistor)
        │        └── VM / VS on each TMC5160
        └─ DC− ──┬── driver PGND
                 └── ESP32 GND (common ground — mandatory)
```

Logic to ESP32 is **3.3 V only**. Do not feed 48 V anywhere near the DevKit 5 V/3V3 pins.

**Before first fast decel:** clamp/brake path installed. Regen without it kills HV drivers.

## ESP32 ↔ TMC5160 (×3)

Shared SPI bus, separate chip-selects.

| Signal | ESP32 GPIO | Driver |
|---|---:|---|
| SCK | 18 | SCK |
| MISO | 19 | SDO / MISO |
| MOSI | 23 | SDI / MOSI |
| CS0 / CS1 / CS2 | 5 / 17 / 16 | CSN (one each) |
| EN (active low) | 4 | ENN (tie all three) |
| STEP0 / 1 / 2 | 32 / 33 / 25 | STEP |
| DIR0 / 1 / 2 | 26 / 27 / 14 | DIR |
| DIAG0 / 1 / 2 | 34 / 35 / 39 | DIAG (StallGuard) |
| ESTOP in | 13 | to GND when pressed (INPUT_PULLUP) |

Axis index: `0` at base φ=0, then +120°, +240° (see `docs/kinematics.md`).

### Driver board mode straps (typical TMC5160 module)

Confirm on **your** carrier silkscreen:

- SPI mode enabled (SPI_MODE / SD_MODE as required by that board)
- CLK to GND if using internal clock
- VCC_IO = 3.3 V from ESP32 3V3
- VM/VS = 48 V bus

## Host PC

| Link | Use |
|---|---|
| USB serial to ESP32 | Motion protocol (`docs/protocol.md`) — **wired only** |
| USB UVC OV9281 | Vision on host |

## First-power sequence

Documented in [`bringup.md`](bringup.md). Short version:

1. No motors connected; 48 V off; USB-only ESP32 flash + `HELLO`
2. SPI read/write smoke at low current settings
3. Attach one motor; crawl step; watch temperature
4. Then all three axes; then mechanics
