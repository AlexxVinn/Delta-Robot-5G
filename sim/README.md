# Simulators

Interactive approximations under `sim/`. Open the HTML files in a browser (no build).

| Simulator | Open | What |
|---|---|---|
| [kinematics/](kinematics/index.html) | `kinematics/index.html` | **3D** Clavel delta: robot + reachable cloud in one scene, drag TCP, waypoint path playback |
| [nema17/](nema17/index.html) | `nema17/index.html` | **3D** NEMA 17 + torque/voltage model, `?` tooltips, red–green–red range gauges |

## Delta 3D controls

- Drag background → orbit · scroll → zoom
- Drag the **orange TCP handle** (transform gizmo) → move end effector (IK live)
- **Add waypoint** / **Demo square** / **Play path** → Cartesian motion along a path
- Workspace cloud lives in the **same** 3D space (toggle / rebuild density)

## Motor gauges

White tick on each parameter bar: left red = too low for this project, green = typical OK band, right red = too high / wasteful.
