# Host ↔ ESP32 Protocol

**Transport:** USB-CDC or UART, **wired only**. Default baud: `921600`.
**Framing:** binary, little-endian, versioned.
**Source of truth:** `protocol/messages.yaml` (this doc is the human readable companion).

## Design rules

1. Motion path is **streamed timed joint setpoints**, not Cartesian poses. IK lives on the host.
2. Every motion-related frame carries a **host timestamp** (µs since host epoch) so the MCU can detect gaps.
3. If the MCU receives no valid motion frame for `stream_timeout_ms` (default 50 ms) while streaming, it **holds position** and raises `FAULT_STREAM_TIMEOUT`.
4. E-stop is a dedicated message **and** a hardware input. Either triggers immediate coast/brake per config.
5. WiFi / BLE are **forbidden** on the control path. Debug telemetry may use them later; motion may not.

## Frame layout

```
Offset  Size  Field
0       1     sync0 = 0xA5
1       1     sync1 = 0x5A
2       1     version (currently 1)
3       1     msg_type
4       2     length (payload bytes, uint16 LE)
6       N     payload
6+N     1     CRC8 (Dallas/Maxim, poly 0x31, init 0x00) over version..payload inclusive
```

Max payload: 64 bytes. Frames larger than that are invalid.

## Message types

### Host → MCU

| Type | Code | Payload | Notes |
|---|---:|---|---|
| `HELLO` | 0x01 | `u32 host_proto_version` | Expect `ACK` with MCU version + caps |
| `SET_MODE` | 0x02 | `u8 mode_id` (0=Speed, 1=Precise) | Informational for MCU limits; host still sends setpoints |
| `HOME` | 0x10 | `u8 axes_mask` | StallGuard / limit homing |
| `ENABLE` | 0x11 | `u8 enable` (0/1) | Driver enable |
| `STREAM_BEGIN` | 0x20 | `u16 rate_hz`, `u16 timeout_ms` | Start accepting joint stream |
| `STREAM_JOINTS` | 0x21 | see below | Timed joint targets |
| `STREAM_END` | 0x22 | — | End stream; hold |
| `ESTOP` | 0x7F | `u8 reason` | Immediate stop |
| `GET_STATUS` | 0x30 | — | Request `STATUS` |
| `SET_CURRENT` | 0x31 | `u8 axis, u16 ma_run, u16 ma_hold` | Tuning |

#### `STREAM_JOINTS` payload

```
u32 host_time_us
i32 q0_microsteps   # joint 0 absolute target
i32 q1_microsteps
i32 q2_microsteps
u16 segment_dt_us   # time allotted to reach these targets from previous
```

Joints are **absolute microsteps from home**. Host is responsible for feasible segments (no instantaneous jumps beyond MCU rate limits).

### MCU → Host

| Type | Code | Payload | Notes |
|---|---:|---|---|
| `ACK` | 0x81 | `u8 of_type`, `u8 status`, `u32 mcu_proto_version` | status 0 = OK |
| `STATUS` | 0x82 | see below | Periodic or on request |
| `FAULT` | 0x83 | `u8 code`, `u32 detail` | Latched until cleared |
| `PONG` | 0x84 | `u32 host_time_echo` | Latency probe |

#### `STATUS` payload

```
u32 mcu_time_us
i32 q0, q1, q2          # commanded joint positions (microsteps)
u8  flags               # bit0 enabled, bit1 homed, bit2 streaming, bit3 fault
u8  stall_mask          # bit per axis StallGuard trip
u16 bus_mv              # optional, 0 if unmeasured
```

## Fault codes

| Code | Name | MCU action |
|---:|---|---|
| 1 | `FAULT_STREAM_TIMEOUT` | Hold / disable per config |
| 2 | `FAULT_STALL` | Hold affected axes |
| 3 | `FAULT_PROTOCOL` | Ignore frame |
| 4 | `FAULT_NOT_HOMED` | Reject motion |
| 5 | `FAULT_ESTOP` | Drivers disabled |
| 6 | `FAULT_DRIVER` | Drivers disabled |

## Bring-up order

1. `HELLO` / `ACK` — confirm protocol versions match
2. `SET_CURRENT` — safe currents
3. `ENABLE(1)`
4. `HOME`
5. `STREAM_BEGIN` → `STREAM_JOINTS`… → `STREAM_END`
6. Keep `GET_STATUS` / periodic `STATUS` for supervision

## Non-goals (Phase 1)

- Cartesian streaming
- Encoder feedback frames
- WiFi transport
- Multi-robot addressing
