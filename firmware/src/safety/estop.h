#pragma once

#include <cstdint>

namespace safety {

class Estop {
 public:
  void begin();
  void trip(uint8_t reason);
  void clear();
  bool tripped() const { return tripped_; }
  // Returns true on fresh hardware trip edge.
  bool poll_hardware();

 private:
  bool tripped_ = false;
  bool last_hw_ = false;
};

}  // namespace safety
