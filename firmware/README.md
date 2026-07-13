# Firmware (ESP32)

PlatformIO project: **step executor + TMC5160 SPI + protocol RX**.

Does **not** run vision or IK. Host streams joint setpoints; this firmware times steps.

## Build

```bash
pio run
pio run -t upload
pio device monitor
```

## Layout

```
include/          pins, compile-time config, protocol constants
src/main.cpp      setup/loop orchestration only
src/protocol/     framing + command handler
src/motion/       step executor + StallGuard homing
src/drivers/      TMC5160 bus wrapper
src/safety/       E-stop + stream watchdog
```

## Bring-up

1. Wire per `include/pins.h` (edit to match your carrier).
2. Confirm HV TMC5160 + bus clamp installed (`docs/safety.md`).
3. Flash, open serial, expect boot banner.
4. Host `HELLO` → `ENABLE` → `HOME` before any `STREAM_*`.

## Pin map

Default pins in `include/pins.h` are a **starting proposal** for an ESP32 DevKit V1 — verify against your PCB/wiring before applying 48 V.
