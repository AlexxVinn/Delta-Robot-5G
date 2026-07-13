import { DeltaKinematics, sampleWorkspace } from "./delta.js";

const $ = (id) => document.getElementById(id);

const state = {
  mode: "joint", // joint | tcp
  workspace: [],
  kin: null,
  pose: null,
  theta: [0.5, 0.5, 0.5],
};

function geomFromUi() {
  return {
    baseSide: +$("baseSide").value,
    effectorSide: +$("effectorSide").value,
    upperArm: +$("upperArm").value,
    forearm: +$("forearm").value,
    zDownTool: true,
  };
}

function syncLabels() {
  $("v-base").textContent = $("baseSide").value;
  $("v-eff").textContent = $("effectorSide").value;
  $("v-rf").textContent = $("upperArm").value;
  $("v-re").textContent = $("forearm").value;
  $("v-t0").textContent = (+$("t0").value).toFixed(1);
  $("v-t1").textContent = (+$("t1").value).toFixed(1);
  $("v-t2").textContent = (+$("t2").value).toFixed(1);
  $("v-x").textContent = $("x").value;
  $("v-y").textContent = $("y").value;
  $("v-z").textContent = $("z").value;
  $("v-res").textContent = $("res").value;
}

function setStatus(text, ok = true) {
  const el = $("status");
  el.textContent = text;
  el.className = "status " + (ok ? "ok" : "bad");
}

function deg2rad(d) {
  return (d * Math.PI) / 180;
}
function rad2deg(r) {
  return (r * 180) / Math.PI;
}

function rebuildKin() {
  state.kin = new DeltaKinematics(geomFromUi());
}

function rebuildWorkspace() {
  const steps = +$("res").value;
  state.workspace = sampleWorkspace(state.kin, { steps });
  setStatus(`workspace samples: ${state.workspace.length} (steps=${steps})`);
}

function updatePose() {
  rebuildKin();
  if (state.mode === "joint") {
    state.theta = [deg2rad(+$("t0").value), deg2rad(+$("t1").value), deg2rad(+$("t2").value)];
    const fk = state.kin.fk(state.theta);
    if (!fk.ok) {
      state.pose = null;
      setStatus(`FK failed: ${fk.error}`, false);
      drawAll();
      return;
    }
    state.pose = fk;
    // mirror TCP sliders (no event loop)
    $("x").value = Math.round(fk.x);
    $("y").value = Math.round(fk.y);
    $("z").value = Math.round(fk.z);
    setStatus(
      `FK  TCP mm  x=${fk.x.toFixed(1)}  y=${fk.y.toFixed(1)}  z=${fk.z.toFixed(1)}\n` +
        `θ deg     ${state.theta.map((t) => rad2deg(t).toFixed(1)).join(", ")}`
    );
  } else {
    const x = +$("x").value;
    const y = +$("y").value;
    const z = +$("z").value;
    const ik = state.kin.ik(x, y, z);
    if (!ik.ok) {
      state.pose = null;
      setStatus(`IK failed: ${ik.error}`, false);
      drawAll();
      return;
    }
    state.theta = ik.theta;
    $("t0").value = rad2deg(ik.theta[0]).toFixed(1);
    $("t1").value = rad2deg(ik.theta[1]).toFixed(1);
    $("t2").value = rad2deg(ik.theta[2]).toFixed(1);
    const fk = state.kin.fk(ik.theta);
    state.pose = fk.ok ? fk : null;
    setStatus(
      `IK  target  x=${x}  y=${y}  z=${z}\n` +
        `θ deg     ${ik.theta.map((t) => rad2deg(t).toFixed(1)).join(", ")}`
    );
  }
  syncLabels();
  drawAll();
}

function fitScale(canvas, spanMm) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const margin = 28;
  const scale = Math.min((w - 2 * margin) / spanMm, (h - 2 * margin) / spanMm);
  return { ctx, w, h, margin, scale };
}

function drawSide() {
  const canvas = $("side");
  const span = Math.max(state.kin.baseSide, state.kin.rf + state.kin.re) * 1.35;
  const { ctx, w, h, scale } = fitScale(canvas, span);
  ctx.clearRect(0, 0, w, h);

  const origin = { x: w * 0.5, y: h * 0.18 };
  const tx = (x, z) => ({ x: origin.x + x * scale, y: origin.y + z * scale });

  // base line
  ctx.strokeStyle = "#8aa0ae";
  ctx.lineWidth = 2;
  const half = state.kin.f;
  const a = tx(-half * 1.2, 0);
  const b = tx(half * 1.2, 0);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  if (!state.pose) return;
  const { joints, elbows, effectorJoints, x, z } = state.pose;

  // draw all three legs projected onto XZ (true X, ignore Y for side sketch — also draw depth-faded)
  for (let i = 0; i < 3; i++) {
    const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(state.kin.phi[i]));
    ctx.globalAlpha = alpha;
    const j = joints[i];
    const e = elbows[i];
    const f = effectorJoints[i];
    const pj = tx(j.x, j.z);
    const pe = tx(e.x, e.z);
    const pf = tx(f.x, f.z);

    ctx.strokeStyle = "#0b6e6e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pj.x, pj.y);
    ctx.lineTo(pe.x, pe.y);
    ctx.stroke();

    ctx.strokeStyle = "#c45c26";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pe.x, pe.y);
    ctx.lineTo(pf.x, pf.y);
    ctx.stroke();

    for (const p of [pj, pe, pf]) {
      ctx.fillStyle = "#14212b";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // effector platform + TCP
  ctx.fillStyle = "#c45c26";
  const tcp = tx(x, z);
  ctx.beginPath();
  ctx.arc(tcp.x, tcp.y, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#c45c26";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const p = tx(effectorJoints[i].x, effectorJoints[i].z);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.fillStyle = "#5a6b78";
  ctx.font = "12px IBM Plex Mono, monospace";
  ctx.fillText("Z↓", 12, h - 14);
  ctx.fillText("X→", w - 36, h - 14);
}

function drawTop() {
  const canvas = $("top");
  const span = Math.max(state.kin.baseSide, state.kin.rf * 2) * 1.4;
  const { ctx, w, h, scale } = fitScale(canvas, span);
  ctx.clearRect(0, 0, w, h);
  const o = { x: w / 2, y: h / 2 };
  const tx = (x, y) => ({ x: o.x + x * scale, y: o.y - y * scale });

  // base triangle
  ctx.strokeStyle = "#8aa0ae";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const ph = state.kin.phi[i];
    const p = tx(state.kin.f * Math.cos(ph), state.kin.f * Math.sin(ph));
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.stroke();

  if (!state.pose) return;
  const { joints, elbows, effectorJoints, x, y } = state.pose;

  for (let i = 0; i < 3; i++) {
    const pj = tx(joints[i].x, joints[i].y);
    const pe = tx(elbows[i].x, elbows[i].y);
    const pf = tx(effectorJoints[i].x, effectorJoints[i].y);
    ctx.strokeStyle = "#0b6e6e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pj.x, pj.y);
    ctx.lineTo(pe.x, pe.y);
    ctx.stroke();
    ctx.strokeStyle = "#c45c26";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pe.x, pe.y);
    ctx.lineTo(pf.x, pf.y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#c45c26";
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const p = tx(effectorJoints[i].x, effectorJoints[i].y);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.stroke();

  const tcp = tx(x, y);
  ctx.fillStyle = "#c45c26";
  ctx.beginPath();
  ctx.arc(tcp.x, tcp.y, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawMap() {
  const canvas = $("map");
  const pts = state.workspace;
  const span = Math.max(state.kin.baseSide, 200) * 1.1;
  const { ctx, w, h, scale } = fitScale(canvas, span * 1.2);
  ctx.clearRect(0, 0, w, h);
  const o = { x: w / 2, y: h / 2 };

  // grid
  ctx.strokeStyle = "#d5dee5";
  ctx.lineWidth = 1;
  for (let g = -200; g <= 200; g += 50) {
    const a = { x: o.x + g * scale, y: o.y - (-span) * scale };
    const b = { x: o.x + g * scale, y: o.y - span * scale };
    ctx.beginPath();
    ctx.moveTo(a.x, 16);
    ctx.lineTo(b.x, h - 16);
    ctx.stroke();
  }

  if (!pts.length) return;
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const p of pts) {
    zMin = Math.min(zMin, p.z);
    zMax = Math.max(zMax, p.z);
  }

  for (const p of pts) {
    const t = zMax === zMin ? 0.5 : (p.z - zMin) / (zMax - zMin);
    // shallow (near base / small z-down) → teal; deep → orange
    const r = Math.round(11 + t * 185);
    const g = Math.round(110 - t * 40);
    const b = Math.round(110 - t * 70);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(o.x + p.x * scale - 1.2, o.y - p.y * scale - 1.2, 2.4, 2.4);
  }

  if (state.pose) {
    ctx.strokeStyle = "#14212b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(o.x + state.pose.x * scale, o.y - state.pose.y * scale, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  // legend
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.fillStyle = "#5a6b78";
  ctx.fillText(`Z ${zMin.toFixed(0)}→${zMax.toFixed(0)} mm (down)`, 12, h - 12);
}

function drawAll() {
  drawSide();
  drawTop();
  drawMap();
}

function setMode(mode) {
  state.mode = mode;
  $("jointControls").hidden = mode !== "joint";
  $("tcpControls").hidden = mode !== "tcp";
  $("modeJoint").className = mode === "joint" ? "" : "secondary";
  $("modeTcp").className = mode === "tcp" ? "" : "secondary";
  updatePose();
}

function bind() {
  for (const id of [
    "baseSide",
    "effectorSide",
    "upperArm",
    "forearm",
    "t0",
    "t1",
    "t2",
    "x",
    "y",
    "z",
  ]) {
    $(id).addEventListener("input", () => {
      syncLabels();
      updatePose();
    });
  }
  $("res").addEventListener("input", syncLabels);
  $("rebuild").addEventListener("click", () => {
    rebuildKin();
    rebuildWorkspace();
    drawAll();
  });
  $("modeJoint").addEventListener("click", () => setMode("joint"));
  $("modeTcp").addEventListener("click", () => setMode("tcp"));
  window.addEventListener("resize", drawAll);
}

rebuildKin();
bind();
syncLabels();
rebuildWorkspace();
setMode("joint");
