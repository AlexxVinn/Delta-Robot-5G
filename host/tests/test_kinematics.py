from __future__ import annotations

import numpy as np
import pytest

from delta_host.config import Geometry
from delta_host.kinematics import DeltaKinematics, KinematicsError, Pose


@pytest.fixture
def kin() -> DeltaKinematics:
    geom = Geometry(
        base_side_mm=200.0,
        effector_side_mm=60.0,
        upper_arm_mm=120.0,
        forearm_mm=280.0,
    )
    return DeltaKinematics(geom, z_down_tool=True)


def test_ik_fk_roundtrip_center(kin: DeltaKinematics) -> None:
    # A plausible hanging-delta TCP under the base center.
    # With z_down_tool, +Z is downward toward the table.
    target = Pose(0.0, 0.0, 250.0)
    theta = kin.ik(target)
    assert theta.shape == (3,)
    assert np.all(np.isfinite(theta))
    back = kin.fk(theta)
    assert back.x == pytest.approx(target.x, abs=1.0)
    assert back.y == pytest.approx(target.y, abs=1.0)
    assert back.z == pytest.approx(target.z, abs=1.0)


def test_ik_fk_roundtrip_offset(kin: DeltaKinematics) -> None:
    target = Pose(40.0, -25.0, 220.0)
    theta = kin.ik(target)
    back = kin.fk(theta)
    assert back.x == pytest.approx(target.x, abs=1.5)
    assert back.y == pytest.approx(target.y, abs=1.5)
    assert back.z == pytest.approx(target.z, abs=1.5)


def test_ik_unreachable_raises(kin: DeltaKinematics) -> None:
    with pytest.raises(KinematicsError):
        kin.ik(Pose(0.0, 0.0, 5000.0))
