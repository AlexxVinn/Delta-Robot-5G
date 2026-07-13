#pragma once

#include <cstdint>

namespace motion {

class StepExecutor {
 public:
  void begin();
  void zero_positions();
  void queue_targets(int32_t q0, int32_t q1, int32_t q2, uint16_t segment_dt_us);
  void hold();
  void service();  // call from loop / timer — generates step pulses toward targets

  int32_t position(uint8_t axis) const;

 private:
  int32_t pos_[3] = {0, 0, 0};
  int32_t target_[3] = {0, 0, 0};
  uint32_t segment_end_us_ = 0;
  bool active_ = false;
};

}  // namespace motion
