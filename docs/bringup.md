# Bring-up ladder

Do not skip rungs. Each rung has an exit criterion.

## 0 — Software only (now)

```bash
cd host && python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
delta-host modes
delta-host ik --xyz 0,0,250
python ../scripts/protocol_selftest.py
```

Exit: tests green; IK returns three angles.

## 1 — ESP32 firmware builds

```bash
cd firmware && pio run
```

Exit: firmware links. Upload when board arrives: `pio run -t upload`.

## 2 — Serial HELLO (USB only, no 48 V)

Host:

```bash
delta-host hello --port /dev/ttyUSB0   # or COMx on Windows
```

Exit: MCU `ACK` to `HELLO` (see serial monitor / host logs).

## 3 — SPI + enable (48 V on, motors uncoupled optional)

1. Verify bus clamp present ([`safety.md`](safety.md)).
2. `SET_CURRENT` conservative (e.g. 800–1200 mA run).
3. `ENABLE(1)`; drivers cool; no smoke.

Exit: `STATUS` shows enabled; motor shafts hold lightly if coupled.

## 4 — Single-axis crawl

Stream tiny `STREAM_JOINTS` deltas on one axis only at low rate.

Exit: shaft turns the correct direction; DIAG quiet.

## 5 — Homing (StallGuard)

`HOME` with soft current; tune `stallguard_threshold` in machine config later.

Exit: `STATUS` homed bit set; positions zeroed.

## 6 — Coordinated FK motion (no vision)

Host planner → joint stream; Precise mode only.

Exit: smooth TCP motion inside workspace; no stalls.

## 7 — Accel ladder

0.5 g → 1 g → 2 g → 3 g. Watch stalls, bus voltage under decel, joint seating.

Exit: chosen peak accel stable with margin.

## 8 — Camera

```bash
pip install -e ".[vision]"
delta-host camera-probe
```

Exit: frames grab at usable FPS; exposure stable under your lighting.

## 9 — Static vision pick (optional gripper later)

Hand-eye TBD in `machine.yaml`; detect → IK → Precise move.

## 10 — Tracked catch

Speed mode + predictor ([`architecture.md`](architecture.md) latency budget).
