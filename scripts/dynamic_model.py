#!/usr/bin/env python3
"""First-pass dynamic feasibility check for the delta drive train.

Prefer loading a real datasheet profile:

  python scripts/dynamic_model.py --motor config/motors/motor.example.yaml \\
      --accel-g 3 --ratio 3 --payload-g 50

Or pass torques manually (legacy):

  python scripts/dynamic_model.py --torque-nm 0.35 --inertia 5.5e-6 --accel-g 3
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    yaml = None


G = 9.81


def gt2_pitch_radius_mm(teeth: int, pitch_mm: float = 2.0) -> float:
    return (teeth * pitch_mm) / (2.0 * math.pi)


def load_motor_yaml(path: Path) -> dict:
    if yaml is None:
        raise SystemExit("PyYAML required: pip install pyyaml")
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise SystemExit(f"invalid motor yaml: {path}")
    return data


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--motor", type=Path, help="path to config/motors/*.yaml")
    p.add_argument("--payload-g", type=float, default=50.0, help="end-effector + object mass (g)")
    p.add_argument("--moving-arm-g", type=float, default=120.0, help="approx moving arm mass (g)")
    p.add_argument("--accel-g", type=float, default=3.0, help="target TCP peak accel in g")
    p.add_argument("--ratio", type=float, default=None, help="belt reduction N (overrides yaml)")
    p.add_argument("--torque-nm", type=float, default=None, help="usable motor torque at speed (N·m)")
    p.add_argument("--holding-torque-nm", type=float, default=None)
    p.add_argument("--inertia", type=float, default=None, help="motor rotor inertia (kg·m²)")
    p.add_argument("--pulley-teeth", type=int, default=None)
    p.add_argument("--upper-arm-mm", type=float, default=120.0, help="rf — lever for joint torque")
    p.add_argument("--margin", type=float, default=1.5, help="required torque margin")
    args = p.parse_args(argv)

    motor_name = "manual"
    inductance_mH = None
    supply_v = None

    if args.motor:
        m = load_motor_yaml(args.motor)
        motor_name = m.get("meta", {}).get("name", args.motor.name)
        elec = m.get("electrical", {})
        mech = m.get("mechanical", {})
        drive = m.get("drive", {})
        inductance_mH = float(elec.get("phase_inductance_mH", 0) or 0) or None
        supply_v = float(elec.get("supply_v_nominal", 0) or 0) or None
        hold = float(mech["holding_torque_nm"])
        torque = float(mech.get("pullout_torque_nm_at_speed", hold * 0.7))
        inertia_gcm2 = float(mech["rotor_inertia_g_cm2"])
        inertia = inertia_gcm2 * 1e-7
        ratio = float(args.ratio if args.ratio is not None else drive.get("reduction_ratio", 3.0))
        pulley = int(args.pulley_teeth if args.pulley_teeth is not None else drive.get("motor_pulley_teeth", 20))
        holding = hold
    else:
        if args.torque_nm is None or args.inertia is None:
            raise SystemExit("provide --motor YAML, or both --torque-nm and --inertia")
        torque = float(args.torque_nm)
        inertia = float(args.inertia)
        ratio = float(args.ratio if args.ratio is not None else 3.0)
        pulley = int(args.pulley_teeth if args.pulley_teeth is not None else 20)
        holding = args.holding_torque_nm

    m = (args.payload_g + args.moving_arm_g) / 1000.0
    a = args.accel_g * G
    f_tcp = m * a

    r_pulley = gt2_pitch_radius_mm(pulley) / 1000.0
    r_arm = args.upper_arm_mm / 1000.0
    tau_joint = f_tcp * r_arm
    tau_motor_load = tau_joint / ratio

    j_joint = m * r_arm * r_arm
    j_reflected = j_joint / (ratio ** 2)
    j_total = inertia + j_reflected

    alpha_joint = a / r_arm
    alpha_motor = alpha_joint * ratio
    tau_inertial = j_total * alpha_motor

    tau_needed = tau_motor_load + tau_inertial
    tau_have = torque
    ok = tau_have >= args.margin * tau_needed

    print("=== Delta drive feasibility (approximate) ===")
    print(f"motor                 {motor_name}")
    if inductance_mH is not None:
        print(f"inductance            {inductance_mH:.2f} mH")
    if supply_v is not None:
        print(f"bus (nominal)         {supply_v:.0f} V")
    print(f"mass moving           {m*1000:.1f} g")
    print(f"TCP accel             {args.accel_g:.2f} g  ({a:.1f} m/s²)")
    print(f"reduction N           {ratio:.2f}")
    print(f"motor pulley radius   {r_pulley*1000:.2f} mm")
    print(f"tau from TCP force    {tau_motor_load*1000:.1f} mN·m (at motor)")
    print(f"J rotor               {inertia:.3e} kg·m²")
    print(f"J reflected           {j_reflected:.3e} kg·m²")
    print(f"tau inertial          {tau_inertial*1000:.1f} mN·m")
    print(f"tau needed (sum)      {tau_needed*1000:.1f} mN·m")
    print(f"tau available         {tau_have*1000:.1f} mN·m  (USE PULL-OUT AT SPEED, not holding)")
    if holding is not None:
        print(f"holding (reference)   {holding*1000:.1f} mN·m  (do not size from this)")
    print(f"margin required       {args.margin:.2f}x")
    print(f"margin actual         {(tau_have / tau_needed) if tau_needed > 0 else float('inf'):.2f}x")
    print(f"RESULT                {'PASS' if ok else 'FAIL'}")
    if inductance_mH is not None and inductance_mH > 1.8:
        print("WARN                  inductance > 1.8 mH — high-speed torque will suffer on 48 V")
    print()
    print("Caveats: ignores Jacobian near workspace edges, belt compliance, gravity,")
    print("and the stepper torque-vs-speed curve shape. Re-check at the worst pose.")
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
