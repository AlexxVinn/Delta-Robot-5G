from delta_host.vision import Detection, Predictor


def test_predictor_constant_velocity() -> None:
    det = Detection(x_mm=0.0, y_mm=10.0, z_mm=200.0, vx_mm_s=100.0, vy_mm_s=-50.0, timestamp_us=0)
    out = Predictor().predict(det, horizon_ms=40)
    assert out.x_mm == 4.0
    assert out.y_mm == 8.0
    assert out.z_mm == 200.0
    assert out.timestamp_us == 40_000
