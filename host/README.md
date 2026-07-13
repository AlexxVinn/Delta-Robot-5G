# Host

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
delta-host ik --xyz 0,0,250
```

Camera: `pip install -e ".[vision]" && delta-host camera-probe`
