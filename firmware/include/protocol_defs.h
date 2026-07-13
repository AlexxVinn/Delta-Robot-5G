#pragma once

#include <cstdint>

// Mirrors protocol/messages.yaml — keep in sync; bump DELTA_PROTOCOL_VERSION on breaks.

namespace proto {

constexpr uint8_t SYNC0 = 0xA5;
constexpr uint8_t SYNC1 = 0x5A;
constexpr uint8_t VERSION = DELTA_PROTOCOL_VERSION;
constexpr uint8_t MAX_PAYLOAD = 64;

enum Msg : uint8_t {
  HELLO = 0x01,
  SET_MODE = 0x02,
  HOME = 0x10,
  ENABLE = 0x11,
  STREAM_BEGIN = 0x20,
  STREAM_JOINTS = 0x21,
  STREAM_END = 0x22,
  GET_STATUS = 0x30,
  SET_CURRENT = 0x31,
  ESTOP = 0x7F,

  ACK = 0x81,
  STATUS = 0x82,
  FAULT = 0x83,
  PONG = 0x84,
};

enum Fault : uint8_t {
  STREAM_TIMEOUT = 1,
  STALL = 2,
  PROTOCOL = 3,
  NOT_HOMED = 4,
  ESTOP_FAULT = 5,
  DRIVER = 6,
};

enum Flag : uint8_t {
  F_ENABLED = 1 << 0,
  F_HOMED = 1 << 1,
  F_STREAMING = 1 << 2,
  F_FAULT = 1 << 3,
};

struct Frame {
  uint8_t type;
  uint8_t len;
  uint8_t payload[MAX_PAYLOAD];
};

}  // namespace proto
