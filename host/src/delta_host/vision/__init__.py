from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Detection:
    """Object in camera/pixel or already-transformed base frame."""

    x_mm: float
    y_mm: float
    z_mm: float
    vx_mm_s: float = 0.0
    vy_mm_s: float = 0.0
    timestamp_us: int = 0


class Predictor:
    """Constant-velocity predictor. Swap for α-β / Kalman later."""

    def predict(self, det: Detection, horizon_ms: float) -> Detection:
        dt = horizon_ms / 1000.0
        return Detection(
            x_mm=det.x_mm + det.vx_mm_s * dt,
            y_mm=det.y_mm + det.vy_mm_s * dt,
            z_mm=det.z_mm,
            vx_mm_s=det.vx_mm_s,
            vy_mm_s=det.vy_mm_s,
            timestamp_us=det.timestamp_us + int(horizon_ms * 1000),
        )


class Detector:
    """Vision front-end stub.

    Real implementation: OV9281 grab → threshold/contour (keep it light) →
    pixel→base via hand-eye from machine.yaml.
    """

    def grab(self) -> Detection | None:
        return None
