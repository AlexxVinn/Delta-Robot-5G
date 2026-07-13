# Contributing

This is an engineering project, not a dump of vibes. Contributions should
match the architecture in `docs/architecture.md` and the decisions in
`docs/decisions/`.

## Ground rules

1. **Read before changing control flow:** `docs/architecture.md`, `docs/protocol.md`, `docs/safety.md`.
2. **Protocol is a contract.** If you change frame layout or message types, bump the protocol version in `protocol/messages.yaml` **and** update both `host/` and `firmware/` parsers in the same change.
3. **No WiFi on the motion path.** See ADR-0003.
4. **Phase 1 is open-loop at the joints.** Don't half-add encoder servo code without an ADR and a real FOC driver path (Phase 2).
5. **Config is data.** Machine geometry and mode profiles live in `config/`, not scattered magic numbers.
6. **Safety first.** Anything that weakens the bus clamp bring-up rule, joint retention requirement, or stream timeout needs an explicit safety review note in the PR.

## Repo layout (where code goes)

| Change type | Put it in |
|---|---|
| MCU step execution, TMC5160, homing | `firmware/` |
| Vision, prediction, IK, planner, serial client | `host/` |
| Wire format | `protocol/` + `docs/protocol.md` |
| Geometry / modes | `config/` |
| CAD / printables | `hardware/` |
| Design decisions | `docs/decisions/NNNN-title.md` |
| Parts list | `docs/BOM.md` (bump version + changelog) |

## Host (Python)

```bash
cd host
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

## Firmware (PlatformIO)

```bash
cd firmware
pio run
# pio run -t upload
```

## Commit style

Imperative, specific: `Add STREAM_JOINTS CRC check on MCU`, not `Update stuff`.
Keep host/firmware protocol changes atomic when they must stay compatible.

## License

- Software: MIT (`LICENSE`)
- Hardware: CERN-OHL-W v2 (`LICENSE-HARDWARE`)
- Docs: CC-BY-4.0 (`LICENSE-DOCS`)
