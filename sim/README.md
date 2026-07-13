# Simulators

Rough interactive approximations under `sim/`. Not production digital twins — enough to feel the kinematics workspace and the stepper torque/voltage tradeoffs before buying parts.

| Simulator | Open | What it does |
|---|---|---|
| [kinematics/](kinematics/index.html) | open `kinematics/index.html` in a browser | Clavel delta IK/FK, arm visualization, reachable workspace map |
| [nema17/](nema17/index.html) | open `nema17/index.html` in a browser | NEMA 17 body (primitives), electrical/mechanical params, torque–speed vs bus voltage |

No build step. Geometry defaults match `config/machine.example.yaml`. Motor defaults match the BOM low-inductance NEMA17 target class.
