# Scripts

| Script | Purpose |
|---|---|
| `dynamic_model.py` | Drive feasibility before freezing reduction \(N\) |
| `protocol_selftest.py` | Host protocol encode/decode + resync (no hardware) |

```bash
# After motor datasheet arrives:
python scripts/dynamic_model.py \
  --motor config/motors/motor.example.yaml \
  --accel-g 3 --ratio 3 --payload-g 50

python scripts/protocol_selftest.py
```

Use **pull-out torque at operating speed**, not holding torque. Exit code `2` = FAIL under margin.
