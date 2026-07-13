# Kinematics

Clavel 3-RUU. IK/FK on host only.

| | |
|---|---|
| `f` | base triangle side |
| `e` | effector side |
| `rf` | upper arm |
| `re` | forearm |

Task frame: Z+ down (pick-and-place). θ=0 = upper arm horizontal, +θ down.

Belt: `θ = φ_motor / N`. Microsteps/rad from `config` transmission block.

Match forearm rods to <0.1 mm. Check reach at workspace edges, not just center.

Code: `host/src/delta_host/kinematics/`
