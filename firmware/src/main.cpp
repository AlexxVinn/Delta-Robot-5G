#include <Arduino.h>

#include "config.h"
#include "drivers/tmc_bus.h"
#include "motion/homing.h"
#include "motion/step_executor.h"
#include "protocol/framing.h"
#include "protocol/handler.h"
#include "safety/estop.h"
#include "safety/watchdog.h"

namespace {
drivers::TmcBus tmc;
motion::StepExecutor steps;
motion::Homing homing(tmc);
safety::Estop estop;
safety::StreamWatchdog watchdog;
protocol::Handler handler(steps, homing, tmc, estop, watchdog);
proto::Frame rx_frame;
}  // namespace

void setup() {
  Serial.begin(cfg::SERIAL_BAUD);
  delay(200);

  estop.begin();
  steps.begin();
  tmc.begin();

  Serial.println();
  Serial.println(F("delta-robot firmware — Phase 1 executor"));
  Serial.print(F("protocol v"));
  Serial.println(cfg::PROTOCOL_VERSION);
  Serial.println(F("waiting for HELLO"));
}

void loop() {
  while (Serial.available() > 0) {
    const uint8_t b = static_cast<uint8_t>(Serial.read());
    if (protocol::framing_feed(b, rx_frame)) {
      handler.handle(rx_frame);
    }
  }

  steps.service();
  handler.service();
}
