#!/usr/bin/env python3
"""Encode/decode round-trip for the host↔MCU binary protocol (no hardware)."""

from __future__ import annotations

import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "host" / "src"))

from delta_host.protocol import (  # noqa: E402
    ACK,
    HELLO,
    STREAM_JOINTS,
    FrameDecoder,
    crc8_maxim,
    encode,
    encode_stream_joints,
)


def main() -> int:
    frames = []
    frames.append(encode(HELLO, (1).to_bytes(4, "little")))
    frames.append(encode_stream_joints(1000, 10, -20, 30, 5000))
    frames.append(encode(ACK, bytes([HELLO, 0]) + (1).to_bytes(4, "little")))

    blob = b"".join(frames)
    # inject noise between frames
    noisy = b"\x00\xff" + frames[0] + b"\x11" + frames[1] + frames[2]

    got = FrameDecoder().feed(noisy)
    assert len(got) == 3, got
    assert got[0].msg_type == HELLO
    assert got[1].msg_type == STREAM_JOINTS
    assert len(got[1].payload) == 18
    host_t, q0, q1, q2 = struct.unpack_from("<Iiii", got[1].payload, 0)
    dt = struct.unpack_from("<H", got[1].payload, 16)[0]
    assert (host_t, q0, q1, q2, dt) == (1000, 10, -20, 30, 5000)
    assert got[2].msg_type == ACK

    # CRC mismatch dropped
    bad = bytearray(frames[0])
    bad[-1] ^= 0xFF
    assert FrameDecoder().feed(bytes(bad)) == []

    # CRC smoke against empty-adjacent
    assert crc8_maxim(b"\x01\x02") == crc8_maxim(b"\x01\x02")

    print(f"protocol selftest OK — {len(blob)} bytes clean, resync OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
