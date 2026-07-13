#pragma once

#include <cstdint>

namespace drivers {

class TmcBus {
 public:
  void begin();
  bool ok() const { return ok_; }

  void set_enabled(bool enabled);
  void set_current(uint8_t axis, uint16_t ma_run, uint16_t ma_hold);
  uint8_t stall_mask() const;

 private:
  bool ok_ = false;
  bool enabled_ = false;
};

}  // namespace drivers
