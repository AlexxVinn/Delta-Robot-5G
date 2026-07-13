#include "protocol/handler.h"

#include <Arduino.h>

#include "config.h"
#include "drivers/tmc_bus.h"
#include "motion/homing.h"
#include "motion/step_executor.h"
#include "protocol/framing.h"
#include "safety/estop.h"
#include "safety/watchdog.h"

namespace protocol {

static uint32_t rd_u32(const uint8_t* p) {
  return static_cast<uint32_t>(p[0]) |
         (static_cast<uint32_t>(p[1]) << 8) |
         (static_cast<uint32_t>(p[2]) << 16) |
         (static_cast<uint32_t>(p[3]) << 24);
}

static int32_t rd_i32(const uint8_t* p) {
  return static_cast<int32_t>(rd_u32(p));
}

static uint16_t rd_u16(const uint8_t* p) {
  return static_cast<uint16_t>(p[0] | (p[1] << 8));
}

static void wr_u32(uint8_t* p, uint32_t v) {
  p[0] = v & 0xFF;
  p[1] = (v >> 8) & 0xFF;
  p[2] = (v >> 16) & 0xFF;
  p[3] = (v >> 24) & 0xFF;
}

static void wr_i32(uint8_t* p, int32_t v) { wr_u32(p, static_cast<uint32_t>(v)); }

Handler::Handler(motion::StepExecutor& steps, motion::Homing& homing,
                 drivers::TmcBus& tmc, safety::Estop& estop,
                 safety::StreamWatchdog& watchdog)
    : steps_(steps),
      homing_(homing),
      tmc_(tmc),
      estop_(estop),
      watchdog_(watchdog) {}

void Handler::write_frame(uint8_t type, const uint8_t* payload, uint8_t len) {
  uint8_t buf[2 + 1 + 1 + 2 + proto::MAX_PAYLOAD + 1];
  size_t n = framing_encode(type, payload, len, buf, sizeof(buf));
  if (n) Serial.write(buf, n);
}

void Handler::send_ack(uint8_t of_type, uint8_t status) {
  uint8_t p[6];
  p[0] = of_type;
  p[1] = status;
  wr_u32(&p[2], cfg::PROTOCOL_VERSION);
  write_frame(proto::ACK, p, sizeof(p));
}

void Handler::send_fault(uint8_t code, uint32_t detail) {
  state_.fault = true;
  state_.fault_code = code;
  uint8_t p[5];
  p[0] = code;
  wr_u32(&p[1], detail);
  write_frame(proto::FAULT, p, sizeof(p));
}

void Handler::send_status() {
  uint8_t flags = 0;
  if (state_.enabled) flags |= proto::F_ENABLED;
  if (state_.homed) flags |= proto::F_HOMED;
  if (state_.streaming) flags |= proto::F_STREAMING;
  if (state_.fault) flags |= proto::F_FAULT;

  uint8_t payload[20];
  wr_u32(&payload[0], micros());
  wr_i32(&payload[4], state_.q[0]);
  wr_i32(&payload[8], state_.q[1]);
  wr_i32(&payload[12], state_.q[2]);
  payload[16] = flags;
  payload[17] = state_.stall_mask;
  payload[18] = 0;  // bus_mv LE low (unmeasured)
  payload[19] = 0;  // bus_mv LE high
  write_frame(proto::STATUS, payload, 20);
}

void Handler::handle(const proto::Frame& frame) {
  if (estop_.tripped() && frame.type != proto::ESTOP && frame.type != proto::GET_STATUS &&
      frame.type != proto::HELLO) {
    send_fault(proto::ESTOP_FAULT, 0);
    return;
  }

  switch (frame.type) {
    case proto::HELLO: {
      send_ack(proto::HELLO, 0);
      break;
    }
    case proto::SET_MODE: {
      if (frame.len < 1) {
        send_fault(proto::PROTOCOL, frame.type);
        break;
      }
      state_.mode_id = frame.payload[0];
      send_ack(proto::SET_MODE, 0);
      break;
    }
    case proto::ENABLE: {
      if (frame.len < 1) {
        send_fault(proto::PROTOCOL, frame.type);
        break;
      }
      state_.enabled = frame.payload[0] != 0;
      tmc_.set_enabled(state_.enabled);
      send_ack(proto::ENABLE, 0);
      break;
    }
    case proto::HOME: {
      if (!state_.enabled) {
        send_ack(proto::HOME, 1);
        break;
      }
      const uint8_t mask = frame.len ? frame.payload[0] : 0x07;
      if (homing_.run(mask)) {
        state_.homed = true;
        steps_.zero_positions();
        state_.q[0] = state_.q[1] = state_.q[2] = 0;
        send_ack(proto::HOME, 0);
      } else {
        send_fault(proto::STALL, mask);
      }
      break;
    }
    case proto::STREAM_BEGIN: {
      if (!state_.homed) {
        send_fault(proto::NOT_HOMED, 0);
        break;
      }
      uint16_t rate = cfg::DEFAULT_STREAM_RATE_HZ;
      uint16_t timeout = cfg::DEFAULT_STREAM_TIMEOUT_MS;
      if (frame.len >= 4) {
        rate = rd_u16(&frame.payload[0]);
        timeout = rd_u16(&frame.payload[2]);
      }
      watchdog_.arm(timeout);
      state_.streaming = true;
      send_ack(proto::STREAM_BEGIN, 0);
      (void)rate;
      break;
    }
    case proto::STREAM_JOINTS: {
      if (!state_.streaming) {
        send_fault(proto::PROTOCOL, frame.type);
        break;
      }
      if (frame.len < 18) {
        send_fault(proto::PROTOCOL, frame.type);
        break;
      }
      watchdog_.kick();
      // host_time at [0], q0..q2 at [4],[8],[12], dt at [16]
      const int32_t q0 = rd_i32(&frame.payload[4]);
      const int32_t q1 = rd_i32(&frame.payload[8]);
      const int32_t q2 = rd_i32(&frame.payload[12]);
      const uint16_t dt = rd_u16(&frame.payload[16]);
      steps_.queue_targets(q0, q1, q2, dt);
      state_.q[0] = q0;
      state_.q[1] = q1;
      state_.q[2] = q2;
      break;
    }
    case proto::STREAM_END: {
      state_.streaming = false;
      watchdog_.disarm();
      steps_.hold();
      send_ack(proto::STREAM_END, 0);
      break;
    }
    case proto::GET_STATUS: {
      send_status();
      break;
    }
    case proto::SET_CURRENT: {
      if (frame.len < 5) {
        send_fault(proto::PROTOCOL, frame.type);
        break;
      }
      const uint8_t axis = frame.payload[0];
      const uint16_t irun = rd_u16(&frame.payload[1]);
      const uint16_t ihold = rd_u16(&frame.payload[3]);
      if (axis >= cfg::AXIS_COUNT) {
        send_fault(proto::PROTOCOL, axis);
        break;
      }
      tmc_.set_current(axis, irun, ihold);
      send_ack(proto::SET_CURRENT, 0);
      break;
    }
    case proto::ESTOP: {
      estop_.trip(frame.len ? frame.payload[0] : 0);
      state_.enabled = false;
      state_.streaming = false;
      tmc_.set_enabled(false);
      steps_.hold();
      watchdog_.disarm();
      send_fault(proto::ESTOP_FAULT, 0);
      break;
    }
    default:
      send_fault(proto::PROTOCOL, frame.type);
      break;
  }
}

void Handler::service() {
  if (watchdog_.expired()) {
    state_.streaming = false;
    steps_.hold();
    send_fault(proto::STREAM_TIMEOUT, watchdog_.timeout_ms());
    watchdog_.disarm();
  }
  if (estop_.poll_hardware()) {
    state_.enabled = false;
    state_.streaming = false;
    tmc_.set_enabled(false);
    steps_.hold();
    send_fault(proto::ESTOP_FAULT, 1);
  }
  state_.stall_mask = tmc_.stall_mask();
}

}  // namespace protocol
