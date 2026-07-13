#include "protocol/framing.h"

namespace protocol {

uint8_t crc8_maxim(const uint8_t* data, size_t len) {
  uint8_t crc = 0x00;
  for (size_t i = 0; i < len; ++i) {
    crc ^= data[i];
    for (int b = 0; b < 8; ++b) {
      if (crc & 0x80) {
        crc = static_cast<uint8_t>((crc << 1) ^ 0x31);
      } else {
        crc <<= 1;
      }
    }
  }
  return crc;
}

enum class RxState : uint8_t {
  Sync0,
  Sync1,
  Version,
  Type,
  Len0,
  Len1,
  Payload,
  Crc,
};

static RxState state = RxState::Sync0;
static proto::Frame building{};
static uint16_t length = 0;
static uint16_t got = 0;
static uint8_t crc_buf[3 + 1 + 2 + proto::MAX_PAYLOAD];
static size_t crc_len = 0;

static void reset() {
  state = RxState::Sync0;
  length = 0;
  got = 0;
  crc_len = 0;
}

bool framing_feed(uint8_t byte, proto::Frame& out) {
  switch (state) {
    case RxState::Sync0:
      if (byte == proto::SYNC0) state = RxState::Sync1;
      break;
    case RxState::Sync1:
      if (byte == proto::SYNC1) {
        state = RxState::Version;
        crc_len = 0;
      } else {
        state = (byte == proto::SYNC0) ? RxState::Sync1 : RxState::Sync0;
      }
      break;
    case RxState::Version:
      if (byte != proto::VERSION) {
        reset();
        break;
      }
      crc_buf[crc_len++] = byte;
      state = RxState::Type;
      break;
    case RxState::Type:
      building.type = byte;
      crc_buf[crc_len++] = byte;
      state = RxState::Len0;
      break;
    case RxState::Len0:
      length = byte;
      crc_buf[crc_len++] = byte;
      state = RxState::Len1;
      break;
    case RxState::Len1:
      length |= static_cast<uint16_t>(byte) << 8;
      crc_buf[crc_len++] = byte;
      if (length > proto::MAX_PAYLOAD) {
        reset();
        break;
      }
      building.len = static_cast<uint8_t>(length);
      got = 0;
      state = (length == 0) ? RxState::Crc : RxState::Payload;
      break;
    case RxState::Payload:
      building.payload[got++] = byte;
      crc_buf[crc_len++] = byte;
      if (got >= length) state = RxState::Crc;
      break;
    case RxState::Crc:
      if (byte == crc8_maxim(crc_buf, crc_len)) {
        out = building;
        reset();
        return true;
      }
      reset();
      break;
  }
  return false;
}

size_t framing_encode(uint8_t type, const uint8_t* payload, uint8_t len,
                      uint8_t* out_buf, size_t out_cap) {
  if (len > proto::MAX_PAYLOAD) return 0;
  const size_t need = 2 + 1 + 1 + 2 + len + 1;
  if (out_cap < need) return 0;

  size_t i = 0;
  out_buf[i++] = proto::SYNC0;
  out_buf[i++] = proto::SYNC1;
  out_buf[i++] = proto::VERSION;
  out_buf[i++] = type;
  out_buf[i++] = static_cast<uint8_t>(len & 0xFF);
  out_buf[i++] = static_cast<uint8_t>((len >> 8) & 0xFF);
  for (uint8_t p = 0; p < len; ++p) out_buf[i++] = payload[p];

  uint8_t crc_region[1 + 1 + 2 + proto::MAX_PAYLOAD];
  size_t c = 0;
  crc_region[c++] = proto::VERSION;
  crc_region[c++] = type;
  crc_region[c++] = static_cast<uint8_t>(len & 0xFF);
  crc_region[c++] = static_cast<uint8_t>((len >> 8) & 0xFF);
  for (uint8_t p = 0; p < len; ++p) crc_region[c++] = payload[p];
  out_buf[i++] = crc8_maxim(crc_region, c);
  return i;
}

}  // namespace protocol
