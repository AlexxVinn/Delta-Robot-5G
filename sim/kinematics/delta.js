/**
 * Clavel-type 3-RUU delta IK/FK (mm, rad).
 * Conventions match docs/kinematics.md:
 *   solver frame +Z up; zDownTool flips API Z (positive toward table).
 *   θ=0 upper arm horizontal; +θ arm downward.
 */
export class DeltaKinematics {
  constructor(opts) {
    this.setGeometry(opts);
  }

  setGeometry({ baseSide, effectorSide, upperArm, forearm, zDownTool = true }) {
    this.baseSide = baseSide;
    this.effectorSide = effectorSide;
    this.rf = upperArm;
    this.re = forearm;
    this.zDownTool = zDownTool;
    this.f = baseSide / Math.sqrt(3);
    this.e = effectorSide / Math.sqrt(3);
    this.phi = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
  }

  /** Convert solver-frame point (+Z up) to task frame. */
  _toTask(p) {
    return {
      x: p.x,
      y: p.y,
      z: this.zDownTool ? -p.z : p.z,
    };
  }

  ik(x, y, z) {
    const zz = this.zDownTool ? -z : z;
    const theta = [];
    for (let i = 0; i < 3; i++) {
      const r = this._ikLeg(x, y, zz, this.phi[i]);
      if (!r.ok) return r;
      theta.push(r.theta);
    }
    return { ok: true, theta };
  }

  fk(theta) {
    const elbowsSol = [];
    const jointsSol = [];
    const centers = [];

    for (let i = 0; i < 3; i++) {
      const c = Math.cos(this.phi[i]);
      const s = Math.sin(this.phi[i]);
      const jx = this.f * c;
      const jy = this.f * s;
      const th = theta[i];
      const ex = jx + this.rf * Math.cos(th) * c;
      const ey = jy + this.rf * Math.cos(th) * s;
      const ez = -this.rf * Math.sin(th);
      jointsSol.push({ x: jx, y: jy, z: 0 });
      elbowsSol.push({ x: ex, y: ey, z: ez });
      centers.push({ x: ex - this.e * c, y: ey - this.e * s, z: ez });
    }

    const hit = this._trilaterate(centers[0], centers[1], centers[2], this.re);
    if (!hit.ok) return hit;

    const tcpSol = { x: hit.x, y: hit.y, z: hit.z };
    const effectorSol = this.phi.map((ph) => {
      const c = Math.cos(ph);
      const s = Math.sin(ph);
      return { x: tcpSol.x + this.e * c, y: tcpSol.y + this.e * s, z: tcpSol.z };
    });

    const tcp = this._toTask(tcpSol);
    return {
      ok: true,
      ...tcp,
      joints: jointsSol.map((p) => this._toTask(p)),
      elbows: elbowsSol.map((p) => this._toTask(p)),
      effectorJoints: effectorSol.map((p) => this._toTask(p)),
    };
  }

  _ikLeg(x, y, z, phi) {
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    let xa = c * x + s * y;
    const ya = -s * x + c * y;
    const za = z;
    xa = xa - this.f + this.e;

    const { rf, re } = this;
    const rhs = (re * re - rf * rf - xa * xa - ya * ya - za * za) / (2 * rf);
    const aCoef = -xa;
    const bCoef = za;
    const r = Math.hypot(aCoef, bCoef);
    if (r < 1e-12) return { ok: false, error: "IK unreachable" };
    let ratio = rhs / r;
    if (Math.abs(ratio) > 1 + 1e-9) return { ok: false, error: "IK unreachable" };
    ratio = Math.max(-1, Math.min(1, ratio));
    const psi = Math.atan2(bCoef, aCoef);
    const delta = Math.acos(ratio);
    const wrap = (t) => {
      let v = ((t + Math.PI) % (2 * Math.PI)) - Math.PI;
      if (v <= -Math.PI) v += 2 * Math.PI;
      return v;
    };
    const cands = [wrap(psi + delta), wrap(psi - delta)];
    cands.sort((a, b) => {
      const sa = Math.sin(a) >= -1e-6 ? 0 : 1;
      const sb = Math.sin(b) >= -1e-6 ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return Math.abs(a) - Math.abs(b);
    });
    return { ok: true, theta: cands[0] };
  }

  _trilaterate(p1, p2, p3, radius) {
    const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
    const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
    const mul = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
    const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
    const cross = (a, b) => ({
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    });
    const norm = (a) => Math.hypot(a.x, a.y, a.z);

    let ex = sub(p2, p1);
    const d = norm(ex);
    if (d < 1e-9) return { ok: false, error: "FK degenerate" };
    ex = mul(ex, 1 / d);
    const i = dot(ex, sub(p3, p1));
    let ey = sub(sub(p3, p1), mul(ex, i));
    const j = norm(ey);
    if (j < 1e-9) return { ok: false, error: "FK degenerate" };
    ey = mul(ey, 1 / j);
    const ez = cross(ex, ey);
    const x = d / 2;
    const y = (i * i + j * j - 2 * i * x) / (2 * j);
    const zSq = radius * radius - x * x - y * y;
    if (zSq < -1e-6) return { ok: false, error: "FK unreachable" };
    const z = -Math.sqrt(Math.max(zSq, 0));
    const point = add(add(add(p1, mul(ex, x)), mul(ey, y)), mul(ez, z));
    return { ok: true, x: point.x, y: point.y, z: point.z };
  }
}

/** Sweep joint space via FK to map reachable TCP samples. */
export function sampleWorkspace(kin, { thMin = -0.15, thMax = 1.15, steps = 16 } = {}) {
  const pts = [];
  for (let i0 = 0; i0 <= steps; i0++) {
    const t0 = thMin + ((thMax - thMin) * i0) / steps;
    for (let i1 = 0; i1 <= steps; i1++) {
      const t1 = thMin + ((thMax - thMin) * i1) / steps;
      for (let i2 = 0; i2 <= steps; i2++) {
        const t2 = thMin + ((thMax - thMin) * i2) / steps;
        const r = kin.fk([t0, t1, t2]);
        if (r.ok) pts.push({ x: r.x, y: r.y, z: r.z });
      }
    }
  }
  return pts;
}
