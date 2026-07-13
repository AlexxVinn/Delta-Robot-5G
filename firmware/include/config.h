#pragma once

#include <cstdint>

namespace cfg {

constexpr uint32_t SERIAL_BAUD = 921600;
constexpr uint8_t  PROTOCOL_VERSION = DELTA_PROTOCOL_VERSION;

constexpr uint16_t DEFAULT_STREAM_RATE_HZ = 200;
constexpr uint16_t DEFAULT_STREAM_TIMEOUT_MS = 50;

constexpr uint16_t DEFAULT_IRUN_MA = 1200;  // conservative bring-up; raise after tuning
constexpr uint16_t DEFAULT_IHOLD_MA = 500;

constexpr uint16_t MOTOR_STEPS_PER_REV = 200;
constexpr uint16_t MICROSTEPS = 16;

constexpr uint8_t AXIS_COUNT = 3;

}  // namespace cfg
