from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class Geometry:
    base_side_mm: float
    effector_side_mm: float
    upper_arm_mm: float
    forearm_mm: float

    @property
    def base_radius_mm(self) -> float:
        # Circumradius of equilateral triangle with side f: f / sqrt(3)
        return self.base_side_mm / (3.0**0.5)

    @property
    def effector_radius_mm(self) -> float:
        return self.effector_side_mm / (3.0**0.5)


@dataclass(frozen=True)
class Transmission:
    ratio: float
    motor_steps_per_rev: int
    microsteps: int

    def microsteps_per_rad(self) -> float:
        return (self.motor_steps_per_rev * self.microsteps * self.ratio) / (2.0 * 3.141592653589793)


def load_yaml(path: Path | str) -> dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, dict):
        raise ValueError(f"expected mapping in {path}")
    return data


def load_geometry(machine: dict[str, Any]) -> Geometry:
    g = machine["geometry"]
    return Geometry(
        base_side_mm=float(g["base_side_mm"]),
        effector_side_mm=float(g["effector_side_mm"]),
        upper_arm_mm=float(g["upper_arm_mm"]),
        forearm_mm=float(g["forearm_mm"]),
    )


def load_transmission(machine: dict[str, Any]) -> Transmission:
    t = machine["transmission"]
    return Transmission(
        ratio=float(t["ratio"]),
        motor_steps_per_rev=int(t["motor_steps_per_rev"]),
        microsteps=int(t["microsteps"]),
    )


def default_machine_path() -> Path:
    """Prefer local machine.yaml; fall back to example."""
    root = Path(__file__).resolve().parents[3]
    local = root / "config" / "machine.yaml"
    if local.is_file():
        return local
    return root / "config" / "machine.example.yaml"


def default_modes_path() -> Path:
    return Path(__file__).resolve().parents[3] / "config" / "modes.yaml"
