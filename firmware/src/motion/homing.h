#pragma once

#include <cstdint>

namespace drivers {
class TmcBus;
}

namespace motion {

class Homing {
 public:
  explicit Homing(drivers::TmcBus& tmc) : tmc_(tmc) {}

  // Blocking skeleton: crawl until StallGuard or timeout.
  // Returns true if all requested axes report home.
  bool run(uint8_t axes_mask);

 private:
  drivers::TmcBus& tmc_;
};

}  // namespace motion
