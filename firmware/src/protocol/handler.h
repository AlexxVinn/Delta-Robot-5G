#pragma once

#include "protocol_defs.h"

namespace motion {
class StepExecutor;
class Homing;
}

namespace drivers {
class TmcBus;
}

namespace safety {
class Estop;
class StreamWatchdog;
}

namespace protocol {

struct RobotState {
  bool enabled = false;
  bool homed = false;
  bool streaming = false;
  bool fault = false;
  uint8_t fault_code = 0;
  uint8_t mode_id = 1;  // default Precise
  uint8_t stall_mask = 0;
  int32_t q[3] = {0, 0, 0};
};

class Handler {
 public:
  Handler(motion::StepExecutor& steps, motion::Homing& homing,
          drivers::TmcBus& tmc, safety::Estop& estop,
          safety::StreamWatchdog& watchdog);

  void handle(const proto::Frame& frame);
  void service();  // periodic: watchdog, status emit if needed
  RobotState& state() { return state_; }

 private:
  void send_ack(uint8_t of_type, uint8_t status);
  void send_fault(uint8_t code, uint32_t detail);
  void send_status();
  void write_frame(uint8_t type, const uint8_t* payload, uint8_t len);

  motion::StepExecutor& steps_;
  motion::Homing& homing_;
  drivers::TmcBus& tmc_;
  safety::Estop& estop_;
  safety::StreamWatchdog& watchdog_;
  RobotState state_;
};

}  // namespace protocol
