/**
 * Approximate hybrid stepper electrical / torque model.
 *
 * At standstill, torque ~ holding torque at rated current.
 * At speed, phase current is limited by the RL impedance seen by the
 * chopper/bus: I_avail ≈ min(I_rated, V / sqrt(R^2 + (ω_e L)^2)).
 * Electrical frequency ω_e = 2π * (steps/rev) * (rev/s) for full-step equivalent
 * (microstepping raises PWM rate but the fundamental torque envelope still
 * tracks this order of magnitude).
 */
export function motorModel(p) {
  const stepsPerRev = 200; // 1.8°
  const kt = p.holdTorqueNm / p.ratedCurrentA; // N·m / A (rough)
  const L = p.inductanceH;
  const R = p.resistanceOhm;
  const V = p.voltageV;
  const Irated = p.ratedCurrentA;

  function torqueAtRevPerSec(n) {
    const fMech = Math.max(n, 0);
    const fElec = fMech * stepsPerRev; // Hz electrical fundamental (full-step)
    const we = 2 * Math.PI * fElec;
    const z = Math.sqrt(R * R + (we * L) * (we * L));
    const iAvail = Math.min(Irated, V / Math.max(z, 1e-9));
    // mild viscous / iron loss roll-off
    const loss = 1 / (1 + (fMech / 40) * (fMech / 40));
    return kt * iAvail * loss;
  }

  function electricalTimeConstantMs() {
    return (L / R) * 1000;
  }

  function currentRiseFraction(tSec) {
    return 1 - Math.exp((-R * tSec) / L);
  }

  /** Max rev/s where available current still ≈ rated (within 5%). */
  function speedAtCurrentDrop(frac = 0.95) {
    // V / sqrt(R^2+(we L)^2) = frac * Irated
    const iTarget = frac * Irated;
    if (V <= iTarget * R) return 0;
    const we = Math.sqrt((V / iTarget) ** 2 - R * R) / L;
    const fElec = we / (2 * Math.PI);
    return fElec / stepsPerRev;
  }

  return {
    kt,
    torqueAtRevPerSec,
    electricalTimeConstantMs,
    currentRiseFraction,
    speedAtCurrentDrop,
    stepsPerRev,
  };
}

export const PRESETS = {
  bom: {
    voltageV: 48,
    ratedCurrentA: 2.0,
    resistanceOhm: 1.2,
    inductanceH: 0.0016,
    holdTorqueNm: 0.45,
    inertiaGcm2: 54,
    bodyLenMm: 48,
    microsteps: 16,
  },
  generic: {
    voltageV: 24,
    ratedCurrentA: 1.5,
    resistanceOhm: 2.0,
    inductanceH: 0.003,
    holdTorqueNm: 0.4,
    inertiaGcm2: 57,
    bodyLenMm: 48,
    microsteps: 16,
  },
  hot: {
    voltageV: 48,
    ratedCurrentA: 2.5,
    resistanceOhm: 0.9,
    inductanceH: 0.0014,
    holdTorqueNm: 0.5,
    inertiaGcm2: 68,
    bodyLenMm: 48,
    microsteps: 16,
  },
};
