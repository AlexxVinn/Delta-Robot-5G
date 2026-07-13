# Common tasks

.PHONY: test host-install firmware-build model selftest help

help:
	@echo "make host-install  - editable install of host package"
	@echo "make test          - run host unit tests"
	@echo "make selftest      - protocol encode/decode (no hardware)"
	@echo "make model         - dynamic_model.py with example motor yaml"
	@echo "make firmware-build - PlatformIO build (requires pio)"

host-install:
	cd host && python3 -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"

test:
	cd host && . .venv/bin/activate && pytest -q

selftest:
	python3 scripts/protocol_selftest.py

firmware-build:
	cd firmware && pio run

model:
	python3 scripts/dynamic_model.py --motor config/motors/motor.example.yaml --accel-g 3 --ratio 3
