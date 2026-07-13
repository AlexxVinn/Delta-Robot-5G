# Host software

Python package `delta_host`: vision, prediction, planner, IK/FK, serial link.

Phase-1 rule: **IK and planning live here**. The MCU only gets timed joint setpoints.

## Setup

```bash
cd host
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

Optional vision extras (OpenCV): `pip install -e ".[dev,vision]"`.

## Layout

```
src/delta_host/
  kinematics/     Clavel IK/FK
  protocol/       framing matching protocol/messages.yaml
  serial_link/    USB/UART transport
  planner/        Speed / Precise profiles + segment generation
  vision/         camera + detector stubs
  config.py       YAML loaders
  main.py         CLI entry
tests/            unit tests (kinematics + protocol CRC/framing)
```

## CLI (skeleton)

```bash
delta-host hello --port /dev/ttyUSB0
delta-host fk --theta 0,0,0
delta-host ik --xyz 0,0,250
```
