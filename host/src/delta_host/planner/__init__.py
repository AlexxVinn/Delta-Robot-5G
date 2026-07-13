from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterator

import numpy as np

from delta_host.config import Transmission
from delta_host.kinematics import DeltaKinematics, Pose


@dataclass(frozen=True)
class ModeProfile:
    name: str
    id: int
    max_vel_mm_s: float
    max_accel_g: float
    max_jerk_mm_s3: float
    path_blend: bool
    settle_dwell_ms: int
    use_prediction: bool
    predict_horizon_ms: int
    confirm_before_place: bool

    @property
    def max_accel_mm_s2(self) -> float:
        return self.max_accel_g * 9810.0


def load_modes(modes_yaml: dict[str, Any]) -> dict[str, ModeProfile]:
    out: dict[str, ModeProfile] = {}
    for name, m in modes_yaml["modes"].items():
        vis = m.get("vision", {})
        out[name] = ModeProfile(
            name=name,
            id=int(m["id"]),
            max_vel_mm_s=float(m["max_vel_mm_s"]),
            max_accel_g=float(m["max_accel_g"]),
            max_jerk_mm_s3=float(m["max_jerk_mm_s3"]),
            path_blend=bool(m["path_blend"]),
            settle_dwell_ms=int(m["settle_dwell_ms"]),
            use_prediction=bool(vis.get("use_prediction", False)),
            predict_horizon_ms=int(vis.get("predict_horizon_ms", 0)),
            confirm_before_place=bool(vis.get("confirm_before_place", False)),
        )
    return out


@dataclass(frozen=True)
class JointSegment:
    q_microsteps: tuple[int, int, int]
    dt_us: int


class Planner:
    """Cartesian point-to-point → joint microstep segments.

    Skeleton: trapezoidal-ish sampling in Cartesian, then IK per sample.
    Replace with proper S-curve / blend later; keep the interface stable.
    """

    def __init__(
        self,
        kin: DeltaKinematics,
        transmission: Transmission,
        mode: ModeProfile,
        sample_hz: float = 200.0,
    ) -> None:
        self.kin = kin
        self.tx = transmission
        self.mode = mode
        self.sample_hz = sample_hz

    def joints_to_microsteps(self, theta_rad: np.ndarray) -> tuple[int, int, int]:
        scale = self.tx.microsteps_per_rad()
        q = np.rint(theta_rad * scale).astype(int)
        return int(q[0]), int(q[1]), int(q[2])

    def move_line(self, start: Pose, goal: Pose) -> Iterator[JointSegment]:
        dx = goal.x - start.x
        dy = goal.y - start.y
        dz = goal.z - start.z
        dist = float(np.sqrt(dx * dx + dy * dy + dz * dz))
        if dist < 1e-6:
            theta = self.kin.ik(goal)
            q = self.joints_to_microsteps(theta)
            dwell = max(self.mode.settle_dwell_ms, 0)
            yield JointSegment(q_microsteps=q, dt_us=max(dwell, 1) * 1000)
            return

        v = self.mode.max_vel_mm_s
        a = self.mode.max_accel_mm_s2
        # Time estimate with triangular velocity profile if distance is short
        t_accel = v / a
        d_accel = 0.5 * a * t_accel * t_accel
        if 2.0 * d_accel >= dist:
            t_total = 2.0 * np.sqrt(dist / a)
        else:
            t_cruise = (dist - 2.0 * d_accel) / v
            t_total = 2.0 * t_accel + t_cruise

        n = max(int(np.ceil(t_total * self.sample_hz)), 1)
        dt_us = int(1e6 / self.sample_hz)
        for i in range(1, n + 1):
            s = i / n  # TODO: replace with real accel-limited s(t)
            pose = Pose(
                start.x + dx * s,
                start.y + dy * s,
                start.z + dz * s,
            )
            theta = self.kin.ik(pose)
            q = self.joints_to_microsteps(theta)
            yield JointSegment(q_microsteps=q, dt_us=dt_us)

        if self.mode.settle_dwell_ms > 0:
            theta = self.kin.ik(goal)
            q = self.joints_to_microsteps(theta)
            yield JointSegment(q_microsteps=q, dt_us=self.mode.settle_dwell_ms * 1000)
