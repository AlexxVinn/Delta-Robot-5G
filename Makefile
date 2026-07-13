# Common tasks

.PHONY: test host-install firmware-build model help

help:
	@echo "make host-install  - editable install of host package"
	@echo "make test          - run host unit tests"
	@echo "make firmware-build - PlatformIO build (requires pio)"
	@echo "make model         - example dynamic_model.py run"

host-install:
	cd host && python3 -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"

test:
	cd host && . .venv/bin/activate && pytest -q

firmware-build:
	cd firmware && pio run

model:
	python3 scripts/dynamic_model.py --torque-nm 0.35 --inertia 5.5e-6 --accel-g 3 --ratio 3
