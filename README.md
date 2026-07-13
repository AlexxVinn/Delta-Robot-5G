# Delta-Robot-5G

Vision-tracked delta. Host does camera + IK + planning. ESP32 just runs step pulses to 3× TMC5160. Phase 1 is open-loop joints; closed-loop FOC later if needed.

| | Phase 1 |
|---|---|
| Accel | ~3 g speed mode |
| Link | USB serial only |
| Budget | ~$400 (own PC + printer) |

```
OV9281 → Host ──serial──► ESP32 → TMC5160 ×3 → NEMA17 ×3
```

## Layout

`config/` `firmware/` `host/` `hardware/` `sim/` `docs/` `scripts/` `protocol/`

## Docs worth opening

- [`docs/procurement.md`](docs/procurement.md) — what to buy first
- [`docs/wiring.md`](docs/wiring.md) — pin map
- [`docs/bringup.md`](docs/bringup.md) — power-on order
- [`docs/BOM.md`](docs/BOM.md) — parts list
- [`sim/`](sim/) — browser sims

## Run now

```bash
cd host && python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]" && pytest
python ../scripts/protocol_selftest.py
python ../scripts/dynamic_model.py --motor ../config/motors/motor.example.yaml --accel-g 3
```

Firmware: `cd firmware && pio run`  
Sims: open the HTML under `sim/`

MIT code · CERN-OHL-W hardware · CC-BY-4.0 docs
