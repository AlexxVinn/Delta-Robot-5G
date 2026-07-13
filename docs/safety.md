# Safety & Bring-up Rules

These are not suggestions. Skipping them fries drivers or launches steel balls.

## Electrical

1. **48 V bus capacitor + over-voltage clamp** must be installed before any high-accel move. Regen on fast decel will spike the bus past TMC5160 abs-max (~60 V) without a brake/clamp path.
2. Confirm TMC5160 carriers are **HV-rated** for 48 V (some clones are ~35 V only).
3. Common ground between PSU, drivers, and ESP32 logic. Do not float the ESP32 ground relative to driver GND.
4. First power-up: drivers at **low current**, no motion commands, verify SPI communication and temperatures.
5. Keep a physical E-stop that cuts driver enable / bus as designed. Software `ESTOP` is necessary but not sufficient.

## Mechanical

1. **Magnetic joint retention springs/elastic** installed and tensioned before any high-accel move. Magnets alone will detach under ~3 g class loads.
2. Match forearm rod lengths to **< 0.1 mm**.
3. Frame must be squared and triangulated. Delta accuracy is unforgiving of a skewed frame.
4. Belt tension: too loose → skip/backlash; too tight → bearing wear and friction. Tension after the dynamic model picks \(N\).

## Motion bring-up ladder

Do not jump to 3 g.

1. Enable + SPI alive, current set conservatively
2. Single-axis crawl
3. Homing via StallGuard / limits
4. Coordinated slow Cartesian moves (host IK)
5. Ramp peak accel: 0.5 g → 1 g → 2 g → 3 g
6. At each step watch: StallGuard flags, joint seating, frame resonance, driver temperature, bus voltage under decel

## Control path

1. **Wired serial only** for motion. No WiFi on the control path.
2. Stream timeout armed whenever streaming. Gap → hold/fault.
3. Reject motion if not homed.
4. Precise mode for placement; Speed mode only when the mechanical ladder above has been cleared.

## Vision

1. Global shutter camera only for tracking (OV9281 class).
2. Flicker-free lighting (DC / high-frequency LED).
3. Predict object motion; do not aim at the last detection alone.
