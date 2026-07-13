#include "motion/step_executor.h"

#include <Arduino.h>

#include "config.h"
#include "pins.h"

namespace motion {

void StepExecutor::begin() {
  for (uint8_t i = 0; i < cfg::AXIS_COUNT; ++i) {
    pinMode(pins::STEP[i], OUTPUT);
    pinMode(pins::DIR[i], OUTPUT);
    digitalWrite(pins::STEP[i], LOW);
    digitalWrite(pins::DIR[i], LOW);
  }
}

void StepExecutor::zero_positions() {
  for (uint8_t i = 0; i < cfg::AXIS_COUNT; ++i) {
    pos_[i] = 0;
    target_[i] = 0;
  }
  active_ = false;
}

void StepExecutor::queue_targets(int32_t q0, int32_t q1, int32_t q2,
                                 uint16_t segment_dt_us) {
  target_[0] = q0;
  target_[1] = q1;
  target_[2] = q2;
  segment_end_us_ = micros() + segment_dt_us;
  active_ = true;
}

void StepExecutor::hold() { active_ = false; }

int32_t StepExecutor::position(uint8_t axis) const {
  return axis < cfg::AXIS_COUNT ? pos_[axis] : 0;
}

// Skeleton: blocking-ish linear interpolation in software.
// Replace with MCPWM / RMT / timed ISR pulse train before high-rate use.
void StepExecutor::service() {
  if (!active_) return;

  const uint32_t now = micros();
  // Emit up to a small burst per loop to avoid starving serial.
  constexpr int kMaxPulses = 32;
  int pulses = 0;

  while (pulses < kMaxPulses) {
    bool moved = false;
    for (uint8_t i = 0; i < cfg::AXIS_COUNT; ++i) {
      const int32_t err = target_[i] - pos_[i];
      if (err == 0) continue;
      digitalWrite(pins::DIR[i], err > 0 ? HIGH : LOW);
      digitalWrite(pins::STEP[i], HIGH);
      delayMicroseconds(2);
      digitalWrite(pins::STEP[i], LOW);
      pos_[i] += (err > 0) ? 1 : -1;
      moved = true;
      ++pulses;
    }
    if (!moved) {
      active_ = false;
      break;
    }
    if (static_cast<int32_t>(now - segment_end_us_) >= 0 &&
        pos_[0] == target_[0] && pos_[1] == target_[1] && pos_[2] == target_[2]) {
      active_ = false;
      break;
    }
    // Crude pacing — real implementation must schedule by segment_dt_us.
    delayMicroseconds(5);
  }
}

}  // namespace motion
