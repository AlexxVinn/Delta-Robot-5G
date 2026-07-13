# Kinematics & Frames

Phase-1 delta is a **Clavel-type 3-RUU** (revolute actuated upper arms, universal/spherical parallelogram forearms). IK and FK run on the **host**. The MCU only ever sees joint microsteps.

## Notation

| Symbol | Meaning | Config key |
|---|---|---|
| \(f\) | Base equilateral triangle side length | `geometry.base_side_mm` |
| \(e\) | End-effector equilateral triangle side | `geometry.effector_side_mm` |
| \(rf\) | Upper arm length (motor axis → elbow) | `geometry.upper_arm_mm` |
| \(re\) | Forearm length (elbow → effector joint) | `geometry.forearm_mm` |
| \(\theta_i\) | Actuated joint angle, \(i \in \{0,1,2\}\) | joint space |
| \((x,y,z)\) | Tool center point in base frame | task space |

Alternative radius form (equivalent, sometimes clearer):

- \(R_f = f / \sqrt{3}\) — base circumradius to joint
- \(R_e = e / \sqrt{3}\) — effector circumradius to joint

## Frames

```
        Z↑  (up, away from table if robot hangs; see mounting)
        |
        o──→ Y
       /
      ↙ X

Base frame origin: centroid of the three motor axes, in the motor-axis plane.
Joint 0 lies on the +X side of the base (rotate +120° / −120° for joints 1 and 2).
```

**Mounting convention (this project):** robot hangs from the top plate (standard pick-and-place). Tool \(+Z\) points **down toward the work surface** in world coordinates used by vision, OR we keep robot-frame \(+Z\) up and negate in the vision→robot transform. Pick one and document it in `config/machine.yaml` as `frames.z_down_tool: true/false`. Default in example config: **tool Z positive downward** for pick-and-place convenience.

## Joint zero

\(\theta = 0\) when the upper arm is **horizontal** (parallel to the base plane), elbow outward. Homing establishes this (or a calibrated offset stored in config as `joints.home_offset_rad`).

Positive rotation: upper arm moving **downward** toward the work volume (right-hand rule about the motor axis, axis tangent to the base circle).

## Transmission

Motors are not direct-drive. Belt reduction \(N\) maps motor angle \(\phi\) to joint angle \(\theta\):

\[
\theta = \phi / N
\]

Config:

- `transmission.ratio` = \(N\) (e.g. 3.0 for 20T → 60T equivalent sector)
- `transmission.motor_steps_per_rev` = 200
- `transmission.microsteps` = 16 (or whatever TMC is set to)

Microsteps per joint radian:

\[
\mu = \frac{\text{steps/rev} \times \text{microsteps} \times N}{2\pi}
\]

## IK / FK

Implemented in `host/src/delta_host/kinematics/`.

- **FK:** \(\theta_{0,1,2} \rightarrow (x,y,z)\) — intersection of three sphere constraints (numeric or closed form).
- **IK:** \((x,y,z) \rightarrow \theta_{0,1,2}\) — per-leg planar solution then assemble; returns unreachable if outside workspace.

Both must:

1. use millimeters and radians internally
2. reject NaN / out-of-bounds with a clear error
3. match the frame and joint-zero conventions above

Calibration (arm length bias, home offset) lives in config, not hard-coded.

## Workspace & singularities

Check accel and reach **near workspace edges**, not only at center — the Jacobian is worst there. Numerical singularity / stretched configurations must be flagged by the planner before streaming.

## Parallelogram forearms

Each forearm is two matched rods (6 pieces of CF tube total). Rod length mismatch > ~0.1 mm introduces a permanent geometric error the IK model cannot absorb without per-leg calibration. Measure and match before assembly.
