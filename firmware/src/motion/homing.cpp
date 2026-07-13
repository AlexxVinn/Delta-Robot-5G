#include "motion/homing.h"

#include <Arduino.h>

#include "config.h"
#include "drivers/tmc_bus.h"

namespace motion {

bool Homing::run(uint8_t axes_mask) {
  // Placeholder: real StallGuard homing moves each axis slowly into a hard stop
  // or mechanical end, watches DIAG, then backs off and sets zero.
  // For skeleton bring-up without mechanics, treat success as "SPI alive".
  if (!tmc_.ok()) return false;

  for (uint8_t i = 0; i < cfg::AXIS_COUNT; ++i) {
    if (((axes_mask >> i) & 1) == 0) continue;
    // TODO: crawl + stall detect on DIAG[i]
    (void)i;
  }
  return true;
}

}  // namespace motion
