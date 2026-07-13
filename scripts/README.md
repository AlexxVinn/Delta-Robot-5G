# Scripts

| Script | Purpose |
|---|---|
| `dynamic_model.py` | Order-of-magnitude drive feasibility before freezing reduction \(N\) |

```bash
python scripts/dynamic_model.py \
  --torque-nm 0.35 \
  --inertia 5.5e-6 \
  --accel-g 3 \
  --ratio 3 \
  --payload-g 50
```

Use **pull-out torque at the operating speed**, not holding torque. Exit code `2` means FAIL under the requested margin.
