from __future__ import annotations

import serial

from delta_host.protocol import (
    ENABLE,
    ESTOP,
    GET_STATUS,
    HELLO,
    HOME,
    SET_MODE,
    STREAM_BEGIN,
    STREAM_END,
    FrameDecoder,
    encode,
    encode_stream_joints,
)


class SerialLink:
    """Thin USB/UART client. Wired only — see ADR-0003."""

    def __init__(self, port: str, baud: int = 921600, timeout: float = 0.2) -> None:
        self._ser = serial.Serial(port=port, baudrate=baud, timeout=timeout)
        self._dec = FrameDecoder()

    def close(self) -> None:
        self._ser.close()

    def __enter__(self) -> SerialLink:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def write_raw(self, data: bytes) -> None:
        self._ser.write(data)
        self._ser.flush()

    def send(self, msg_type: int, payload: bytes = b"") -> None:
        self.write_raw(encode(msg_type, payload))

    def read_frames(self, max_bytes: int = 256) -> list:
        data = self._ser.read(max_bytes)
        if not data:
            return []
        return self._dec.feed(data)

    def hello(self, host_version: int = 1) -> None:
        self.send(HELLO, host_version.to_bytes(4, "little"))

    def enable(self, on: bool) -> None:
        self.send(ENABLE, bytes([1 if on else 0]))

    def home(self, axes_mask: int = 0x07) -> None:
        self.send(HOME, bytes([axes_mask & 0xFF]))

    def set_mode(self, mode_id: int) -> None:
        self.send(SET_MODE, bytes([mode_id & 0xFF]))

    def stream_begin(self, rate_hz: int = 200, timeout_ms: int = 50) -> None:
        payload = rate_hz.to_bytes(2, "little") + timeout_ms.to_bytes(2, "little")
        self.send(STREAM_BEGIN, payload)

    def stream_joints(
        self, host_time_us: int, q0: int, q1: int, q2: int, segment_dt_us: int
    ) -> None:
        self.write_raw(encode_stream_joints(host_time_us, q0, q1, q2, segment_dt_us))

    def stream_end(self) -> None:
        self.send(STREAM_END)

    def get_status(self) -> None:
        self.send(GET_STATUS)

    def estop(self, reason: int = 0) -> None:
        self.send(ESTOP, bytes([reason & 0xFF]))


def open_port(port: str, baud: int = 921600) -> SerialLink:
    return SerialLink(port=port, baud=baud)
