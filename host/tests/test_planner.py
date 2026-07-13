from __future__ import annotations

from delta_host.config import Transmission, load_yaml, default_modes_path
from delta_host.planner import Planner, load_modes
from delta_host.config import Geometry
from delta_host.kinematics import DeltaKinematics, Pose


def test_modes_load() -> None:
    modes = load_modes(load_yaml(default_modes_path()))
    assert "speed" in modes and "precise" in modes
    assert modes["speed"].max_accel_g > modes["precise"].max_accel_g
    assert modes["precise"].settle_dwell_ms > 0


def test_planner_emits_segments() -> None:
    geom = Geometry(200.0, 60.0, 120.0, 280.0)
    kin = DeltaKinematics(geom, z_down_tool=True)
    tx = Transmission(ratio=3.0, motor_steps_per_rev=200, microsteps=16)
    modes = load_modes(load_yaml(default_modes_path()))
    planner = Planner(kin, tx, modes["precise"], sample_hz=50.0)
    segs = list(planner.move_line(Pose(0, 0, 250), Pose(20, 0, 240)))
    assert len(segs) >= 1
    assert all(len(s.q_microsteps) == 3 for s in segs)
