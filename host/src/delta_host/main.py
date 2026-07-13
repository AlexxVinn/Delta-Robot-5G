from __future__ import annotations

import argparse
import sys

from delta_host.config import (
    default_machine_path,
    default_modes_path,
    load_geometry,
    load_transmission,
    load_yaml,
)
from delta_host.kinematics import DeltaKinematics, Pose
from delta_host.planner import load_modes
from delta_host.serial_link import SerialLink


def _parse_xyz(s: str) -> Pose:
    parts = [float(p) for p in s.split(",")]
    if len(parts) != 3:
        raise SystemExit("--xyz needs x,y,z")
    return Pose(*parts)


def _parse_theta(s: str) -> list[float]:
    parts = [float(p) for p in s.split(",")]
    if len(parts) != 3:
        raise SystemExit("--theta needs t0,t1,t2")
    return parts


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="delta-host", description="Delta robot host tools")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_hello = sub.add_parser("hello", help="Send HELLO over serial")
    p_hello.add_argument("--port", required=True)
    p_hello.add_argument("--baud", type=int, default=921600)

    p_fk = sub.add_parser("fk", help="Forward kinematics")
    p_fk.add_argument("--theta", required=True, help="rad, comma-separated")

    p_ik = sub.add_parser("ik", help="Inverse kinematics")
    p_ik.add_argument("--xyz", required=True, help="mm, comma-separated")

    sub.add_parser("modes", help="List mode profiles")

    p_cam = sub.add_parser("camera-probe", help="List OpenCV-visible cameras (needs [vision])")
    p_cam.add_argument("--max-index", type=int, default=6)

    args = parser.parse_args(argv)

    if args.cmd == "camera-probe":
        from delta_host.vision import list_cameras

        try:
            cams = list_cameras(args.max_index)
        except RuntimeError as e:
            print(str(e), file=sys.stderr)
            return 2
        if not cams:
            print("no cameras found", file=sys.stderr)
            return 1
        for c in cams:
            print(f"{c.index}: {c.width}x{c.height} @ {c.fps:.1f} fps  backend={c.backend}")
        return 0

    machine = load_yaml(default_machine_path())
    geom = load_geometry(machine)
    kin = DeltaKinematics(geom, z_down_tool=bool(machine.get("frames", {}).get("z_down_tool", True)))

    if args.cmd == "hello":
        with SerialLink(args.port, args.baud) as link:
            link.hello()
            print("HELLO sent", file=sys.stderr)
        return 0

    if args.cmd == "fk":
        import numpy as np

        pose = kin.fk(np.array(_parse_theta(args.theta)))
        print(f"{pose.x:.4f},{pose.y:.4f},{pose.z:.4f}")
        return 0

    if args.cmd == "ik":
        theta = kin.ik(_parse_xyz(args.xyz))
        print(",".join(f"{t:.6f}" for t in theta))
        tx = load_transmission(machine)
        print(
            "microsteps/rad:",
            f"{tx.microsteps_per_rad():.3f}",
            file=sys.stderr,
        )
        return 0

    if args.cmd == "modes":
        modes = load_modes(load_yaml(default_modes_path()))
        for name, m in modes.items():
            print(f"{name}: id={m.id} accel={m.max_accel_g}g vel={m.max_vel_mm_s}mm/s")
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
