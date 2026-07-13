# ADR-0001: Open-loop Phase 1

FOC (4671 + encoders) blows the budget and isn’t the main error source for vision P&P.

→ Open-loop TMC5160 + StallGuard now. Vision closes the outer loop. FOC later if needed.
