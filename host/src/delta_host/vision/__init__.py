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


@dataclass
class CameraInfo:
    index: int
    width: int
    height: int
    fps: float
    backend: str


def list_cameras(max_index: int = 6) -> list[CameraInfo]:
    """Probe local camera indices. Requires opencv (`pip install -e ".[vision]"`)."""
    try:
        import cv2
    except ImportError as e:  # pragma: no cover
        raise RuntimeError(
            "OpenCV not installed. Run: pip install -e \".[vision]\""
        ) from e

    found: list[CameraInfo] = []
    for i in range(max_index):
        cap = cv2.VideoCapture(i)
        if not cap.isOpened():
            cap.release()
            continue
        ok, frame = cap.read()
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
        backend = cap.getBackendName() if hasattr(cap, "getBackendName") else "unknown"
        cap.release()
        if ok and frame is not None:
            found.append(CameraInfo(index=i, width=w, height=h, fps=fps, backend=backend))
    return found


class Detector:
    """Vision front-end.

    Phase-1 intent: OV9281 grab → cheap threshold/contour → pixel→base via
    hand-eye from machine.yaml. ``grab`` stays a stub until calibration exists.
    """

    def __init__(self, camera_index: int = 0) -> None:
        self.camera_index = camera_index
        self._cap = None

    def open(self) -> None:
        try:
            import cv2
        except ImportError as e:  # pragma: no cover
            raise RuntimeError(
                "OpenCV not installed. Run: pip install -e \".[vision]\""
            ) from e
        self._cap = cv2.VideoCapture(self.camera_index)
        if not self._cap.isOpened():
            raise RuntimeError(f"cannot open camera index {self.camera_index}")

    def close(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    def grab_frame(self):
        """Return raw BGR frame (numpy array) or None."""
        if self._cap is None:
            return None
        ok, frame = self._cap.read()
        return frame if ok else None

    def grab(self) -> Detection | None:
        # Detection pipeline not calibrated yet.
        return None
