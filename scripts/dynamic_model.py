#!/usr/bin/env python3
"""First-pass dynamic feasibility check for the delta drive train.

Run this *before* freezing pulley ratio N and before buying "whatever NEMA17".
It is a planar belt+arm approximation — not a full multi-body sim — but it
catches the common "holding torque looked fine, pull-out at speed did not" failure.

Example:
  python scripts/dynamic_model.py --payload-g 50 --accel-g 3 --ratio 3 \\
      --torque-nm 0.45 --inertia 5.5e-6 --pulley-teeth 20
"""

from __future__ import annotations

import argparse
import math
import sys


G = 9.81


def gt2_pitch_radius_mm(teeth: int, pitch_mm: float = 2.0) -> float:
    return (teeth * pitch_mm) / (2.0 * math.pi)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--payload-g", type=float, default=50.0, help="end-effector + object mass (g)")
    p.add_argument("--moving-arm-g", type=float, default=120.0, help="approx moving arm mass (g)")
    p.add_argument("--accel-g", type=float, default=3.0, help="target TCP peak accel in g")
    p.add_argument("--ratio", type=float, default=3.0, help="belt reduction N")
    p.add_argument("--torque-nm", type=float, required=True, help="usable motor torque at speed (N·m)")
    p.add_argument(
        "--holding-torque-nm",
        type=float,
        default=None,
        help="holding torque for contrast (optional); do NOT use this as usable at speed",
    )
    p.add_argument("--inertia", type=float, required=True, help="motor rotor inertia (kg·m²)")
    p.add_argument("--pulley-teeth", type=int, default=20)
    p.add_argument("--upper-arm-mm", type=float, default=120.0, help="rf — lever for joint torque")
    p.add_argument("--margin", type=float, default=1.5, help="required torque margin")
    args = p.parse_args(argv)

    m = (args.payload_g + args.moving_arm_g) / 1000.0
    a = args.accel_g * G
    f_tcp = m * a  # Newton, rough — ignores Jacobian; use as order-of-magnitude

    r_pulley = gt2_pitch_radius_mm(args.pulley_teeth) / 1000.0
    # Torque at motor to produce belt force; joint sees N* that through reduction.
    # Map TCP force through upper-arm lever as a crude worst-case:
    r_arm = args.upper_arm_mm / 1000.0
    tau_joint = f_tcp * r_arm
    tau_motor_load = tau_joint / args.ratio

    # Reflected inertia of mass at arm tip about joint, then to motor:
    # J_joint ≈ m * r_arm^2 ; J_motor_reflected ≈ J_joint / N^2
    j_joint = m * r_arm * r_arm
    j_reflected = j_joint / (args.ratio ** 2)
    j_total = args.inertia + j_reflected

    # Angular accel at joint for TCP accel a ≈ alpha * r_arm  => alpha = a/r_arm
    alpha_joint = a / r_arm
    alpha_motor = alpha_joint * args.ratio
    tau_inertial = j_total * alpha_motor

    tau_needed = tau_motor_load + tau_inertial
    tau_have = args.torque_nm
    ok = tau_have >= args.margin * tau_needed

    print("=== Delta drive feasibility (approximate) ===")
    print(f"mass moving           {m*1000:.1f} g")
    print(f"TCP accel             {args.accel_g:.2f} g  ({a:.1f} m/s²)")
    print(f"reduction N           {args.ratio:.2f}")
    print(f"motor pulley radius   {r_pulley*1000:.2f} mm")
    print(f"tau from TCP force    {tau_motor_load*1000:.1f} mN·m (at motor)")
    print(f"J rotor               {args.inertia:.3e} kg·m²")
    print(f"J reflected           {j_reflected:.3e} kg·m²")
    print(f"tau inertial          {tau_inertial*1000:.1f} mN·m")
    print(f"tau needed (sum)      {tau_needed*1000:.1f} mN·m")
    print(f"tau available         {tau_have*1000:.1f} mN·m  (USE PULL-OUT AT SPEED, not holding)")
    if args.holding_torque_nm is not None:
        print(f"holding (reference)   {args.holding_torque_nm*1000:.1f} mN·m  (do not size from this)")
    print(f"margin required       {args.margin:.2f}x")
    print(f"margin actual         {(tau_have / tau_needed) if tau_needed > 0 else float('inf'):.2f}x")
    print(f"RESULT                {'PASS' if ok else 'FAIL'}")
    print()
    print("Caveats: ignores Jacobian near workspace edges, belt compliance, gravity,")
    print("and the stepper torque-vs-speed curve shape. Re-check at the worst pose.")
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
