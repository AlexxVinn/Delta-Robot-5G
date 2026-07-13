# Machine + mode configuration

Runtime geometry and motion profiles live here as **data**, not hard-coded
constants in firmware/host.

| File | Tracked? | Role |
|---|---|---|
| `machine.example.yaml` | yes | Template with units, comments, TBD placeholders |
| `machine.yaml` | **no** (gitignored) | Your real calibrated machine — copy from example |
| `modes.yaml` | yes | Speed / Precise planner profiles |

Host loads `machine.yaml` + `modes.yaml`. Firmware keeps a compile-time pin/current
config in `firmware/include/` that must stay consistent with the YAML for anything
that affects motion limits; geometry-heavy work stays on the host.

After changing arm lengths, home offsets, or transmission ratio: re-run IK tests and
update the build log.
