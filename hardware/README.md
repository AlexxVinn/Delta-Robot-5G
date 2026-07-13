# Hardware

Mechanical design sources. Licensed **CERN-OHL-W v2** (see `/LICENSE-HARDWARE`).

## Layout

```
cad/            native CAD / STEP exports (assemblies, parts)
printable/      STL/3MF for 3D-printed parts (mounts, sectors, effector, …)
drawings/       dimensioned PDFs / manufacturing notes
```

## Printable parts expected (Phase 1)

| Part | Qty | Notes |
|---|---:|---|
| Motor mount | 3 | Rigid; aligns NEMA17 to upper-arm pivot |
| Arm sector / driven pulley | 3 | Sets reduction \(N\) with 20T motor pulley |
| Idler / tensioner bracket | 3 | Belt path |
| Upper-arm blank / clamp | 3 | Interface motor sector → elbow magnets |
| End effector plate | 1 | Three ball cups + optional vacuum port |
| Camera mount | 1 | Rigid relative to base frame |

Geometry that affects IK (`base_side`, `effector_side`, arm lengths, \(N\)) must match `config/machine.yaml` after measurement.

## Rules

1. Do not commit huge scratch exports — keep canonical STEP + printables.
2. Version filenames when geometry that affects kinematics changes (`effector_v2.stl`).
3. Note measured vs designed values in `docs/build-log.md`.
