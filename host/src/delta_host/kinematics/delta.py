from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from delta_host.config import Geometry


class KinematicsError(ValueError):
    """Pose or joints outside the reachable workspace / singular."""


@dataclass(frozen=True)
class Pose:
    x: float
    y: float
    z: float

    def as_array(self) -> np.ndarray:
        return np.array([self.x, self.y, self.z], dtype=float)


class DeltaKinematics:
    """Clavel-type 3-RUU delta IK/FK. Conventions: ``docs/kinematics.md``.

    Internal solver frame: +Z up from the base plane. If ``z_down_tool`` is True,
    user/task Z is positive toward the work surface and is negated at the API boundary.
    Joint zero: upper arm horizontal. Positive θ: upper arm downward.
    """

    def __init__(self, geom: Geometry, z_down_tool: bool = True) -> None:
        self.geom = geom
        self.z_down_tool = z_down_tool
        self.rf = geom.upper_arm_mm
        self.re = geom.forearm_mm
        self.f = geom.base_radius_mm
        self.e = geom.effector_radius_mm
        self.phi = np.array([0.0, 2.0 * np.pi / 3.0, 4.0 * np.pi / 3.0])

    def ik(self, pose: Pose) -> np.ndarray:
        x, y, z = pose.x, pose.y, pose.z
        if self.z_down_tool:
            z = -z
        return np.array([self._ik_leg(x, y, z, float(self.phi[i])) for i in range(3)])

    def fk(self, theta: np.ndarray) -> Pose:
        th = np.asarray(theta, dtype=float)
        if th.shape != (3,):
            raise KinematicsError("theta must have shape (3,)")

        centers: list[np.ndarray] = []
        for i in range(3):
            c, s = np.cos(self.phi[i]), np.sin(self.phi[i])
            jx, jy = self.f * c, self.f * s
            # Elbow position
            ex = jx + self.rf * np.cos(th[i]) * c
            ey = jy + self.rf * np.cos(th[i]) * s
            ez = -self.rf * np.sin(th[i])
            # Sphere center for forearm = elbow minus effector joint offset
            centers.append(np.array([ex - self.e * c, ey - self.e * s, ez], dtype=float))

        x, y, z = self._sphere_intersection(centers[0], centers[1], centers[2], self.re)
        if self.z_down_tool:
            z = -z
        return Pose(float(x), float(y), float(z))

    def _ik_leg(self, x: float, y: float, z: float, phi: float) -> float:
        """IK for one leg in the vertical plane of that motor."""
        c, s = np.cos(phi), np.sin(phi)
        # Rotate so the leg radial axis aligns with +X
        xa = c * x + s * y
        ya = -s * x + c * y
        za = z
        xa = xa - self.f + self.e

        # (-xa)*cosθ + za*sinθ = K, with K derived from forearm length constraint
        # (xa - rf cosθ)^2 + ya^2 + (za + rf sinθ)^2 = re^2
        rf, re = self.rf, self.re
        rhs = (re * re - rf * rf - xa * xa - ya * ya - za * za) / (2.0 * rf)
        # rhs = -xa cosθ + za sinθ
        amp = float(np.hypot(xa, za))
        if amp < 1e-12:
            raise KinematicsError("IK unreachable (amp=0)")
        ratio = rhs / amp
        if abs(ratio) > 1.0 + 1e-9:
            raise KinematicsError("IK unreachable")
        ratio = float(np.clip(ratio, -1.0, 1.0))

        # amp * sin(θ + α) form using: A cosθ + B sinθ = rhs with A=-xa, B=za
        alpha = float(np.arctan2(za, -xa))  # so amp*cos(θ - alpha)? use asin form
        # Better: θ = atan2(za, -xa) ± acos(rhs/amp) is wrong orientation.
        # Solve via: represent as R cos(θ - ψ) ...
        # A cosθ + B sinθ = rhs, A=-xa, B=za
        # = R cos(θ - ψ) where R=hypot(A,B), cosψ=A/R, sinψ=B/R
        a_coef, b_coef = -xa, za
        r = float(np.hypot(a_coef, b_coef))
        psi = float(np.arctan2(b_coef, a_coef))
        delta = float(np.arccos(ratio))  # ratio = rhs/r already clipped
        th_a = psi + delta
        th_b = psi - delta

        def wrap(t: float) -> float:
            return float((t + np.pi) % (2.0 * np.pi) - np.pi)

        candidates = [wrap(th_a), wrap(th_b)]
        # Prefer the configuration with elbow "outward / downward" typical of hanging deltas:
        # sin(θ) >= 0 means elbow below horizontal in our convention.
        candidates.sort(key=lambda t: (0 if np.sin(t) >= -1e-6 else 1, abs(t)))
        return candidates[0]

    @staticmethod
    def _sphere_intersection(
        p1: np.ndarray, p2: np.ndarray, p3: np.ndarray, radius: float
    ) -> tuple[float, float, float]:
        """Trilateration; returns the intersection with smaller Z (tool below elbows)."""
        ex = p2 - p1
        d = float(np.linalg.norm(ex))
        if d < 1e-9:
            raise KinematicsError("FK degenerate (p1=p2)")
        ex = ex / d

        i = float(np.dot(ex, p3 - p1))
        ey = (p3 - p1) - i * ex
        j = float(np.linalg.norm(ey))
        if j < 1e-9:
            raise KinematicsError("FK degenerate (colinear centers)")
        ey = ey / j
        ez = np.cross(ex, ey)

        x = (d * d) / (2.0 * d)
        y = (i * i + j * j - 2.0 * i * x) / (2.0 * j)
        z_sq = radius * radius - x * x - y * y
        if z_sq < -1e-6:
            raise KinematicsError("FK unreachable")
        z = -float(np.sqrt(max(z_sq, 0.0)))
        point = p1 + x * ex + y * ey + z * ez
        return float(point[0]), float(point[1]), float(point[2])
