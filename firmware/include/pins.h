#pragma once

// Default ESP32 DevKit V1 proposal — CHANGE to match your wiring before power-up.
// Step/dir are independent; SPI is shared (separate CS per driver).

namespace pins {

// Shared SPI (VSPI defaults)
constexpr int SPI_SCK  = 18;
constexpr int SPI_MISO = 19;
constexpr int SPI_MOSI = 23;

constexpr int TMC_CS[3]   = {5, 17, 16};
constexpr int TMC_EN_N    = 4;   // active low enable to drivers (wired in parallel OK)

constexpr int STEP[3]     = {32, 33, 25};
constexpr int DIR[3]      = {26, 27, 14};
constexpr int DIAG[3]     = {34, 35, 39}; // input-only pins on ESP32; StallGuard DIAG

constexpr int ESTOP_IN    = 13;  // active low recommended with internal pull-up

}  // namespace pins
