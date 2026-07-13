#include "safety/watchdog.h"

#include <Arduino.h>

namespace safety {

void StreamWatchdog::arm(uint16_t timeout_ms) {
  timeout_ms_ = timeout_ms ? timeout_ms : 50;
  armed_ = true;
  last_kick_ms_ = millis();
}

void StreamWatchdog::disarm() { armed_ = false; }

void StreamWatchdog::kick() { last_kick_ms_ = millis(); }

bool StreamWatchdog::expired() const {
  if (!armed_) return false;
  return (millis() - last_kick_ms_) > timeout_ms_;
}

}  // namespace safety
