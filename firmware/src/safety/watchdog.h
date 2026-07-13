#pragma once

#include <cstdint>

namespace safety {

class StreamWatchdog {
 public:
  void arm(uint16_t timeout_ms);
  void disarm();
  void kick();
  bool expired() const;
  uint16_t timeout_ms() const { return timeout_ms_; }

 private:
  bool armed_ = false;
  uint16_t timeout_ms_ = 50;
  uint32_t last_kick_ms_ = 0;
};

}  // namespace safety
