/**
 * Hybrid stepper approximate model (bipolar, 1.8°).
 *
 * Physics used:
 * - Holding torque τ_hold at rated current I_r
 * - Torque constant Kt ≈ τ_hold / I_r
 * - Chopper drives from bus V into phase R, L
 * - Available phase current at electrical freq ω_e:
 *     I = min(I_r, V / sqrt(R² + (ω_e L)²))
 * - ω_e = 2π · (steps/rev) · n   (n = rev/s), full-step fundamental
 * - Extra high-speed roll-off for iron / eddy losses (empirical)
 * - Detent torque ≈ 5–10% of holding (subtracted as ripple floor)
 *
 * Good for comparing bus voltage and inductance. Not a lab pull-out curve.
 */

export function motorModel(p) {
  const stepsPerRev = 200;
  const polesPairsEquiv = stepsPerRev / 4; // for intuition only
  const kt = p.holdTorqueNm / Math.max(p.ratedCurrentA, 1e-6);
  const L = p.inductanceH;
  const R = Math.max(p.resistanceOhm, 1e-6);
  const V = p.voltageV;
  const Irated = p.ratedCurrentA;
  const detent = p.holdTorqueNm * 0.07;

  function impedance(we) {
    return Math.sqrt(R * R + (we * L) * (we * L));
  }

  function currentAtRevPerSec(n) {
    const fElec = Math.max(n, 0) * stepsPerRev;
    const we = 2 * Math.PI * fElec;
    return Math.min(Irated, V / impedance(we));
  }

  function torqueAtRevPerSec(n) {
    const i = currentAtRevPerSec(n);
    const iron = 1 / (1 + (n / 35) ** 2);
    const tau = Math.max(0, kt * i * iron - detent * (n > 0.05 ? 0.25 : 0));
    return tau;
  }

  function electricalTimeConstantMs() {
    return (L / R) * 1000;
  }

  /** Mechanical time constant for inertia J under Kt/R damping approx */
  function mechTimeConstantMs(inertiaKgM2) {
    // τ_m ≈ (J R) / Kt²  for brushed DC analogue — rough stepper intuition only
    return ((inertiaKgM2 * R) / (kt * kt)) * 1000;
  }

  function speedAtCurrentDrop(frac = 0.95) {
    const iTarget = frac * Irated;
    if (V <= iTarget * R) return 0;
    const we = Math.sqrt((V / iTarget) ** 2 - R * R) / L;
    return we / (2 * Math.PI) / stepsPerRev;
  }

  /** Power into one phase at op point (approx) */
  function copperLossW(n) {
    const i = currentAtRevPerSec(n);
    return i * i * R;
  }

  function backEmfPerPhaseV(n) {
    // Ke ~ Kt in SI for ideal; ω_m = 2π n
    return kt * (2 * Math.PI * Math.max(n, 0));
  }

  return {
    kt,
    detent,
    polesPairsEquiv,
    stepsPerRev,
    currentAtRevPerSec,
    torqueAtRevPerSec,
    electricalTimeConstantMs,
    mechTimeConstantMs,
    speedAtCurrentDrop,
    copperLossW,
    backEmfPerPhaseV,
    impedance,
  };
}

/** Typical bands for red-green-red gauges (project context: high-speed delta). */
export const GAUGE_BANDS = {
  voltageV: { low: 12, good0: 36, good1: 48, high: 52, unit: "V" },
  ratedCurrentA: { low: 0.8, good0: 1.5, good1: 2.5, high: 3.0, unit: "A" },
  resistanceOhm: { low: 0.3, good0: 0.7, good1: 1.8, high: 3.5, unit: "Ω" },
  inductancemH: { low: 0.8, good0: 1.0, good1: 2.2, high: 5.5, unit: "mH" },
  holdTorqueNm: { low: 0.2, good0: 0.35, good1: 0.55, high: 0.75, unit: "N·m" },
  inertiaGcm2: { low: 30, good0: 35, good1: 70, high: 95, unit: "g·cm²" },
  bodyLenMm: { low: 34, good0: 40, good1: 52, high: 62, unit: "mm" },
  microsteps: { low: 1, good0: 8, good1: 32, high: 64, unit: "" },
  speedRps: { low: 0, good0: 2, good1: 12, high: 28, unit: "rev/s" },
};

export function gaugePos(band, value) {
  const { low, good0, good1, high } = band;
  if (value <= low) return 0.04;
  if (value >= high) return 0.96;
  if (value < good0) return 0.04 + 0.3 * ((value - low) / Math.max(good0 - low, 1e-9));
  if (value <= good1) return 0.34 + 0.32 * ((value - good0) / Math.max(good1 - good0, 1e-9));
  return 0.66 + 0.3 * ((value - good1) / Math.max(high - good1, 1e-9));
}

export const TIPS = {
  voltageV: "Driver bus voltage. Higher V = better torque at speed. We want ~48 V.",
  ratedCurrentA: "Max phase current. Torque ≈ Kt · I.",
  resistanceOhm: "Phase R. Sets heating and DC current limit V/R.",
  inductancemH: "Phase L. Big L kills high-speed torque. Want ≤~2 mH.",
  holdTorqueNm: "Standstill torque. Don’t size fast moves from this alone.",
  inertiaGcm2: "Rotor inertia. Lower = snappier accel.",
  bodyLenMm: "NEMA17 face ~42 mm; length trades torque vs inertia. ~48 mm is fine.",
  microsteps: "Driver µstep setting. Smoother motion, higher pulse rate.",
  speedRps: "Shaft speed for the operating-point marker on the curve.",
};

export const PRESETS = {
  bom: {
    label: "BOM target — low-L 2.0 A / 48 V",
    voltageV: 48,
    ratedCurrentA: 2.0,
    resistanceOhm: 1.15,
    inductanceH: 0.0016,
    holdTorqueNm: 0.45,
    inertiaGcm2: 54,
    bodyLenMm: 48,
    microsteps: 16,
  },
  generic: {
    label: "Generic 1.5 A / ~3 mH / 24 V",
    voltageV: 24,
    ratedCurrentA: 1.5,
    resistanceOhm: 2.1,
    inductanceH: 0.0032,
    holdTorqueNm: 0.4,
    inertiaGcm2: 57,
    bodyLenMm: 48,
    microsteps: 16,
  },
  hot: {
    label: "High-current 2.5 A / ~1.4 mH / 48 V",
    voltageV: 48,
    ratedCurrentA: 2.5,
    resistanceOhm: 0.85,
    inductanceH: 0.00135,
    holdTorqueNm: 0.52,
    inertiaGcm2: 68,
    bodyLenMm: 48,
    microsteps: 16,
  },
};
