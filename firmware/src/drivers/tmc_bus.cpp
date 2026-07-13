#include "drivers/tmc_bus.h"

#include <Arduino.h>
#include <SPI.h>

#include "config.h"
#include "pins.h"

// Skeleton wrapper. Wire TMCStepper (lib_deps) here once carriers are on the bench.
// Do not claim stealthchop/stall tuning is done until measured on hardware.

namespace drivers {

void TmcBus::begin() {
  pinMode(pins::TMC_EN_N, OUTPUT);
  digitalWrite(pins::TMC_EN_N, HIGH);  // disabled

  for (uint8_t i = 0; i < cfg::AXIS_COUNT; ++i) {
    pinMode(pins::TMC_CS[i], OUTPUT);
    digitalWrite(pins::TMC_CS[i], HIGH);
    pinMode(pins::DIAG[i], INPUT);
  }

  SPI.begin(pins::SPI_SCK, pins::SPI_MISO, pins::SPI_MOSI);
  // TODO: TMC5160 ctor per CS, push IHOLD_IRUN, CHOPCONF, PWMCONF, TPOWERDOWN…
  ok_ = true;
  enabled_ = false;
}

void TmcBus::set_enabled(bool enabled) {
  enabled_ = enabled;
  digitalWrite(pins::TMC_EN_N, enabled ? LOW : HIGH);
}

void TmcBus::set_current(uint8_t axis, uint16_t ma_run, uint16_t ma_hold) {
  if (axis >= cfg::AXIS_COUNT) return;
  // TODO: translate mA → IRUN/IHOLD register fields using sense_res from machine config
  (void)ma_run;
  (void)ma_hold;
}

uint8_t TmcBus::stall_mask() const {
  uint8_t mask = 0;
  for (uint8_t i = 0; i < cfg::AXIS_COUNT; ++i) {
    if (digitalRead(pins::DIAG[i]) == HIGH) mask |= (1u << i);
  }
  return mask;
}

}  // namespace drivers
