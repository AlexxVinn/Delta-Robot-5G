# Bring-up

Don’t skip steps.

0. Soft only: `pytest`, `protocol_selftest.py`, `delta-host ik --xyz 0,0,250`
1. `cd firmware && pio run` (upload when board is there)
2. USB only, no 48 V: `delta-host hello --port …`
3. 48 V on, clamp fitted, low current, `ENABLE`
4. One axis crawl
5. `HOME` (StallGuard)
6. Slow coordinated moves (Precise)
7. Accel up: 0.5 → 1 → 2 → 3 g
8. Cam: `delta-host camera-probe`
9. Vision pick, then tracking

Details live in code + [`safety.md`](safety.md). If something smokes, you skipped a rung.
