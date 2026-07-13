from __future__ import annotations

import struct
from dataclasses import dataclass

# Keep in lockstep with protocol/messages.yaml and firmware protocol_defs.h
SYNC0 = 0xA5
SYNC1 = 0x5A
VERSION = 1
MAX_PAYLOAD = 64

HELLO = 0x01
SET_MODE = 0x02
HOME = 0x10
ENABLE = 0x11
STREAM_BEGIN = 0x20
STREAM_JOINTS = 0x21
STREAM_END = 0x22
GET_STATUS = 0x30
SET_CURRENT = 0x31
ESTOP = 0x7F

ACK = 0x81
STATUS = 0x82
FAULT = 0x83
PONG = 0x84


def crc8_maxim(data: bytes) -> int:
    crc = 0x00
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if crc & 0x80:
                crc = ((crc << 1) ^ 0x31) & 0xFF
            else:
                crc = (crc << 1) & 0xFF
    return crc


@dataclass(frozen=True)
class Frame:
    msg_type: int
    payload: bytes


def encode(msg_type: int, payload: bytes = b"") -> bytes:
    if len(payload) > MAX_PAYLOAD:
        raise ValueError("payload too large")
    header = bytes([VERSION, msg_type, len(payload) & 0xFF, (len(payload) >> 8) & 0xFF])
    body = header + payload
    return bytes([SYNC0, SYNC1]) + body + bytes([crc8_maxim(body)])


def encode_stream_joints(
    host_time_us: int, q0: int, q1: int, q2: int, segment_dt_us: int
) -> bytes:
    payload = struct.pack("<Iiii", host_time_us, q0, q1, q2) + struct.pack(
        "<H", segment_dt_us & 0xFFFF
    )
    return encode(STREAM_JOINTS, payload)


class FrameDecoder:
    """Incremental binary frame decoder."""

    def __init__(self) -> None:
        self._buf = bytearray()

    def feed(self, data: bytes) -> list[Frame]:
        self._buf.extend(data)
        frames: list[Frame] = []
        while True:
            frame = self._try_pop()
            if frame is None:
                break
            frames.append(frame)
        return frames

    def _try_pop(self) -> Frame | None:
        buf = self._buf
        # Find sync
        while len(buf) >= 2 and not (buf[0] == SYNC0 and buf[1] == SYNC1):
            # resync
            if buf[0] != SYNC0:
                del buf[0]
            elif len(buf) >= 2 and buf[1] != SYNC1:
                del buf[0]
            else:
                break
        if len(buf) < 6:
            return None
        if buf[0] != SYNC0 or buf[1] != SYNC1:
            return None
        version = buf[2]
        msg_type = buf[3]
        length = buf[4] | (buf[5] << 8)
        if version != VERSION or length > MAX_PAYLOAD:
            del buf[0]
            return None
        total = 6 + length + 1
        if len(buf) < total:
            return None
        payload = bytes(buf[6 : 6 + length])
        crc_region = bytes(buf[2 : 6 + length])
        crc = buf[6 + length]
        del buf[:total]
        if crc != crc8_maxim(crc_region):
            return None
        return Frame(msg_type=msg_type, payload=payload)
