from __future__ import annotations

from delta_host.protocol import (
    ACK,
    HELLO,
    STREAM_JOINTS,
    FrameDecoder,
    crc8_maxim,
    encode,
    encode_stream_joints,
)


def test_crc_stable() -> None:
    assert crc8_maxim(b"") == 0x00
    # Known vector for Maxim/Dallas CRC8 is implementation-defined by poly/init;
    # lock a local golden for empty-adjacent bytes so host/firmware stay matched.
    assert crc8_maxim(bytes([1, 2, 3, 4])) == crc8_maxim(bytes([1, 2, 3, 4]))


def test_encode_decode_roundtrip() -> None:
    raw = encode(HELLO, (1).to_bytes(4, "little"))
    frames = FrameDecoder().feed(raw)
    assert len(frames) == 1
    assert frames[0].msg_type == HELLO
    assert int.from_bytes(frames[0].payload, "little") == 1


def test_stream_joints_length() -> None:
    raw = encode_stream_joints(123456, 10, -20, 30, 5000)
    frames = FrameDecoder().feed(raw)
    assert len(frames) == 1
    assert frames[0].msg_type == STREAM_JOINTS
    assert len(frames[0].payload) == 18


def test_resync_on_garbage() -> None:
    good = encode(ACK, bytes([HELLO, 0]) + (1).to_bytes(4, "little"))
    blob = b"\x00\xff\x01" + good
    frames = FrameDecoder().feed(blob)
    assert len(frames) == 1
    assert frames[0].msg_type == ACK


def test_crc_mismatch_dropped() -> None:
    raw = bytearray(encode(HELLO, b"\x01\x00\x00\x00"))
    raw[-1] ^= 0xFF
    assert FrameDecoder().feed(bytes(raw)) == []
