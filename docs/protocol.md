# Protocol

USB/UART, 921600. Binary frames. Source: `protocol/messages.yaml`.

```
A5 5A | ver | type | len_le | payload | crc8
```

CRC = Maxim/Dallas over ver..payload. Max payload 64.

Host→MCU: `HELLO 01`, `SET_MODE 02`, `HOME 10`, `ENABLE 11`, `STREAM_BEGIN 20`, `STREAM_JOINTS 21`, `STREAM_END 22`, `GET_STATUS 30`, `SET_CURRENT 31`, `ESTOP 7F`

MCU→Host: `ACK 81`, `STATUS 82`, `FAULT 83`, `PONG 84`

`STREAM_JOINTS`: `u32 t_us, i32 q0,q1,q2, u16 dt_us` — absolute microsteps from home.

Stream timeout (default 50 ms) → hold + fault. No motion until homed.

Bump `version` + both parsers if you break the layout.
