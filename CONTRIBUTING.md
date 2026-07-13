# Contributing

Read `docs/architecture.md` and `docs/protocol.md` before touching control flow.

- Protocol change → bump version in `protocol/messages.yaml` + host + firmware together
- No WiFi on motion
- Phase 1 stays open-loop at the joints
- Geometry/modes live in `config/`, not magic numbers

```bash
cd host && pip install -e ".[dev]" && pytest
cd firmware && pio run
```

MIT software · CERN-OHL-W hardware · CC-BY-4.0 docs
