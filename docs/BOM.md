# Delta Robot — Bill of Materials

**Project:** High-speed vision-tracked delta robot (pick-and-place)
**BOM version:** v1.0 — Phase 1 (open-loop)
**Controller:** ESP32 (step executor) + host PC (vision + motion planning)
**Realistic target:** ~3 g peak acceleration, ±0.2 mm class repeatability, two software modes (Speed / Precise)
**Budget:** ~$400 USD for Phase 1

> Prices are rough estimates in USD and will vary by supplier/region. This document is the human source of truth for what to buy — update the version number and changelog when it changes. Machine-readable mirror: [`bom.csv`](bom.csv).

---

## 0. Design summary (read before buying)

This is a **magnetic-joint parallelogram delta**. Motors are fixed to the frame; only the carbon-fiber arms and the end effector move, which is what makes high acceleration possible.

Phase 1 is deliberately **open-loop at the joint level**. The control loop is closed at the **system level by the camera** (vision correction + motion prediction), and the stepper drivers use StallGuard for homing and lost-step detection. True joint-level closed loop (encoders + FOC) is a **Phase 2 upgrade** that reuses 100% of the mechanical build — see [§6](#6-phase-2-closed-loop-upgrade-path).

**Two hard assumptions that make the ~$400 budget work:**

1. **You use your own PC/laptop as the vision + planning host** (not on the BOM).
2. **You 3D-print the structural plastic** (motor mounts, arm sectors, carriage, end effector, idler brackets). Without a printer, add ~$30–50 or use a print service.

**Two non-negotiable safety items** (both included below — do not skip):

- **DC-bus over-voltage clamp** — installed *before* the first fast decel, or regen will kill a driver.
- **Magnetic-joint retention springs** — installed *before* any high-accel move, or joints detach mid-flight.

---

## 1. Motion & Power ("the muscle")

| Component | Spec / notes | Qty | Est. $ |
|---|---|---:|---:|
| NEMA 17 stepper (low-inductance) | See [§4](#4-motor-selection-detail). Target: 48 mm body, ~0.45–0.5 N·m, **≤1.8 mH**, 2.0–2.5 A, 1.8°, **dual-shaft**. Buy all 3 from the same batch. | 3 | 60 |
| TMC5160 driver (HV, SPI) | On a proper carrier ("T"/Pro-class) with heatsink; supports 48 V bus. StallGuard = free homing + lost-step watchdog. | 3 | 60 |
| ESP32 DevKit V1 | Step-pulse executor only (not the brain). | 1 | 6 |
| 48 V PSU, 350–400 W | 48 V is what gives torque at speed. Keeper across all phases. | 1 | 32 |
| DC-bus cap 4700 µF / 63 V **+ over-voltage clamp** | TVS + MOSFET + brake resistor across the DC bus. **Mandatory** for regen survival at high decel. | 1 set | 10 |
| Driver cooling fan | Small 40 mm fan over the 3 drivers; they run hot at 2+ A. | 1 | 3 |
| **Subtotal** | | | **~171** |

---

## 2. Feedback & Vision ("the eyes")

| Component | Spec / notes | Qty | Est. $ |
|---|---|---:|---:|
| Arducam OV9281 (USB) | **Global shutter**, monochrome, 120–210 FPS. Global shutter is mandatory for motion tracking. | 1 | 50 |
| Machine-vision lighting | DC / high-frequency LED bar or ring (flicker-free); enables high FPS. | 1 | 18 |
| Host computer | **Your existing PC/laptop.** Runs OpenCV detection + prediction + delta IK + planning. | — | 0 |
| **Subtotal** | | | **~68** |

> Encoders (AS5047P) are intentionally **deferred to Phase 2** — they only pay off paired with a closed-loop driver. Phase 1 uses StallGuard instead.

---

## 3. Mechanical Hardware ("the skeleton")

| Component | Spec / notes | Qty | Est. $ |
|---|---|---:|---:|
| Carbon-fiber tubes | 3K pultruded, 6 mm OD / 4 mm ID. Match forearm rod lengths to **<0.1 mm**. | 6 | 18 |
| N52 magnets | 10–12 mm countersunk neodymium (ball-joint cups). | 12 | 15 |
| Chrome steel balls | 10 mm precision steel balls. | 12 | 10 |
| **Joint retention springs / elastic** | Preloads the magnetic joints so they don't detach at ~3 g. **Mandatory.** | 1 set | 5 |
| GT2 belt, 9 mm | Fiber-reinforced (Gates PowerGrip style). Reduction stage. | 5 m | 15 |
| Motor pulleys, 20T | 9 mm width, 5 mm bore (motor side). | 3 | 9 |
| Arm-side pulleys/sectors + idlers/tensioners | **3D-printed** to your chosen reduction ratio N (~3:1 is a sane start). Do the dynamic model first. | 3 sets | 8 |
| Arm pivot bearings | Small ball bearings for the upper-arm pivots. | set | 10 |
| **Subtotal** | | | **~90** |

---

## 4. Frame & Tooling ("the body")

| Component | Spec / notes | Qty | Est. $ |
|---|---|---:|---:|
| Aluminum extrusion 2040 | 600 mm pillars + 300 mm base/top rings. Upsize pillars to 3030 if budget allows — stiffness = precision. | 9 | 50 |
| Fastener kit | M5 bolts, T-nuts, corner brackets; triangulate base + top. | 1 | 15 |
| **Subtotal** | | | **~65** |

### Deferred to Phase 2 (do NOT buy now)

| Component | Reason | Est. $ |
|---|---|---:|
| Vacuum pump (12/24 V diaphragm) + 3-way solenoid | Gripper not needed to commission motion + vision. Keep pump frame-mounted, never on the moving platform. | 22 |
| AS5047P encoders (×3) + diametric magnets | Only useful paired with a closed-loop driver (Phase 2). | 54 |

---

## Phase 1 total

| Section | Est. $ |
|---|---:|
| Motion & Power | 171 |
| Feedback & Vision | 68 |
| Mechanical | 90 |
| Frame & Tooling | 65 |
| **Total** | **~394** |

Leaves a small buffer for shipping/consumables. If you add the vacuum gripper in Phase 1, trim elsewhere or accept ~$415.

---

## 5. Motor selection detail

The motors are the most important reusable investment (they carry into future projects), so pick deliberately. There is a real tension: the delta wants low inductance + low inertia; general reuse wants torque. The compromise class below satisfies both.

| Spec | Target | Why |
|---|---|---|
| Frame / length | NEMA 17, **48 mm** | Torque for reuse without the inertia penalty of 60 mm motors. |
| Holding torque | **0.45–0.5 N·m** | Useful in most future NEMA-17 builds; not so high it forces a heavy rotor. |
| **Inductance** | **≤ 1.8 mH** (hard requirement) | *Decides whether you get high accel.* Low L = current rises fast on 48 V = torque holds at speed. |
| Rated current | **2.0–2.5 A** | Torque headroom; can be run below rated for gentler projects. TMC5160 + 48 V handle it. |
| Rotor inertia | as low as available | Directly limits achievable acceleration. |
| Step angle | **1.8°** (200 steps) | Fewer commutations at speed than 0.9°, usually lower inductance too. Microstep via TMC. |
| Shaft | **dual-shaft, 5 mm** | Rear shaft is where the Phase-2 encoder mounts. Cheap future-proofing. |

**Decision rule:** when two motors are similar price, take the lower-inductance one. Inductance can't be fixed later with tuning; torque can be traded via the reduction ratio.

> Note: microstepping buys *smoothness*, not true accuracy. Accuracy comes from arm-length matching, joint preload, belt tension, and kinematic calibration — don't overpay for 0.9° motors chasing "resolution."

---

## 6. Phase 2 closed-loop upgrade path

When budget allows, add **true joint-level closed loop** without wasting any Phase-1 part. Everything mechanical, the motors, frame, PSU, and camera all carry over — the only item replaced is the driver (keep the TMC5160s as spares).

| Upgrade | Adds | Est. $ |
|---|---|---:|
| AS5047P encoders (SPI, 14-bit) + diametric magnets | Absolute joint feedback; mount on the rear motor shaft. | ~54 |
| TMC4671 FOC drivers (×3) | True field-oriented closed-loop servo control. | ~180 |
| Vacuum gripper (pump + 3-way solenoid) | Pick-and-place tooling. | ~22 |

**Budget alternative to A+B:** integrated closed-loop servo-steppers (MKS SERVO42/57-class, ~$22–30 each) put motor + encoder + FOC in one unit — genuine joint closed loop inside a tight budget. Trade-offs: verify the model's voltage/torque rating (many are 24 V-class), and the control loop is closed firmware (not user-tunable).

---

## 7. Build & buying order

1. **Freeze the spec:** payload, stroke, peak-vs-sustained accel, target precision.
2. **Do the dynamic model** (motor torque-vs-speed at 48 V, reduction ratio N, reflected inertia) and confirm ~3 g closes with margin — *then* buy motors and pick the pulley ratio.
3. **Buy keepers first:** frame, motors, PSU, camera, mechanical. The TMC5160 is a reusable general-purpose driver, not a throwaway.
4. **Assembly order:** rigid frame → transmission → matched arms + spring-preloaded joints → power with bus cap + clamp installed → slow electronics bring-up → ramp accel 1→2→3 g watching StallGuard/joints/resonance → vision calibration → static pick → tracked catch with prediction.

**Two warnings worth repeating:** install the over-voltage clamp before the first fast decel, and spring-preload the magnetic joints before any high-accel move.

---

## Changelog

- **v1.0** — Initial Phase-1 (open-loop) BOM. Assumes existing PC as host and 3D-printer access. Encoders + FOC + gripper deferred to Phase 2.
