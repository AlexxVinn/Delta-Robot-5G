# Wiring

Pins match `firmware/include/pins.h`. Change both if you remapped.

## Power

```
48 V PSU → bulk cap + brake/OV clamp → TMC5160 VM
         → common GND with ESP32
```

ESP32 stays on USB/5 V. Never put 48 V on the DevKit.

Clamp goes on **before** any hard decel.

## SPI / step

| | GPIO |
|---|---:|
| SCK / MISO / MOSI | 18 / 19 / 23 |
| CS 0,1,2 | 5, 17, 16 |
| ENN (all) | 4 |
| STEP 0,1,2 | 32, 33, 25 |
| DIR 0,1,2 | 26, 27, 14 |
| DIAG 0,1,2 | 34, 35, 39 |
| ESTOP | 13 → GND when hit |

Host: USB serial to ESP32 + USB cam. No WiFi on motion.

Bring-up order: [`bringup.md`](bringup.md)
