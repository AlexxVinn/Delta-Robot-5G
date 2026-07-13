#include "safety/estop.h"

#include <Arduino.h>

#include "pins.h"

namespace safety {

void Estop::begin() {
  pinMode(pins::ESTOP_IN, INPUT_PULLUP);
  tripped_ = false;
  last_hw_ = digitalRead(pins::ESTOP_IN) == LOW;
}

void Estop::trip(uint8_t reason) {
  (void)reason;
  tripped_ = true;
}

void Estop::clear() { tripped_ = false; }

bool Estop::poll_hardware() {
  const bool hw = digitalRead(pins::ESTOP_IN) == LOW;
  const bool edge = hw && !last_hw_;
  last_hw_ = hw;
  if (edge) tripped_ = true;
  return edge;
}

}  // namespace safety
