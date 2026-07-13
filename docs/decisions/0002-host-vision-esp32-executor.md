# ADR-0002: Host brain / ESP32 executor

ESP32 can’t do UVC + 200 FPS vision + hard planning well.

→ Host: vision, predict, IK, plan. MCU: joint stream + drivers.
