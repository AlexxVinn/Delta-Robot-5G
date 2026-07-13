#pragma once

#include <cstddef>
#include <cstdint>

#include "protocol_defs.h"

namespace protocol {

uint8_t crc8_maxim(const uint8_t* data, size_t len);

// Feed bytes; returns true when a full valid frame is in out.
bool framing_feed(uint8_t byte, proto::Frame& out);

// Encode frame into out_buf; returns bytes written, or 0 on error.
size_t framing_encode(uint8_t type, const uint8_t* payload, uint8_t len,
                      uint8_t* out_buf, size_t out_cap);

}  // namespace protocol
