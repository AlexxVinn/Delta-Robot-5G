import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  GAUGE_BANDS,
  PRESETS,
  TIPS,
  gaugePos,
  motorModel,
} from "./motor.js";

const $ = (id) => document.getElementById(id);

const ui = {
  voltage: $("voltage"),
  current: $("current"),
  resistance: $("resistance"),
  inductance: $("inductance"),
  holdTorque: $("holdTorque"),
  inertia: $("inertia"),
  bodyLen: $("bodyLen"),
  microsteps: $("microsteps"),
  speed: $("speed"),
  preset: $("preset"),
};

let motorGroup = null;
let rotor = null;
let renderer, scene, camera, controls;
let spinAngle = 0;

function paramsFromUi() {
  return {
    voltageV: +ui.voltage.value,
    ratedCurrentA: +ui.current.value,
    resistanceOhm: +ui.resistance.value,
    inductanceH: +ui.inductance.value / 1000,
    holdTorqueNm: +ui.holdTorque.value,
    inertiaGcm2: +ui.inertia.value,
    bodyLenMm: +ui.bodyLen.value,
    microsteps: +ui.microsteps.value,
    speedRps: +ui.speed.value,
  };
}

function syncLabelsAndGauges() {
  const p = paramsFromUi();
  $("v-v").textContent = String(p.voltageV);
  $("v-i").textContent = p.ratedCurrentA.toFixed(2);
  $("v-r").textContent = p.resistanceOhm.toFixed(2);
  $("v-l").textContent = (p.inductanceH * 1000).toFixed(2);
  $("v-th").textContent = p.holdTorqueNm.toFixed(2);
  $("v-j").textContent = String(p.inertiaGcm2);
  $("v-len").textContent = String(p.bodyLenMm);
  $("v-ms").textContent = String(p.microsteps);
  $("v-spd").textContent = p.speedRps.toFixed(1);

  const values = {
    voltageV: p.voltageV,
    ratedCurrentA: p.ratedCurrentA,
    resistanceOhm: p.resistanceOhm,
    inductancemH: p.inductanceH * 1000,
    holdTorqueNm: p.holdTorqueNm,
    inertiaGcm2: p.inertiaGcm2,
    bodyLenMm: p.bodyLenMm,
    microsteps: p.microsteps,
    speedRps: p.speedRps,
  };
  document.querySelectorAll(".field[data-key]").forEach((field) => {
    const key = field.dataset.key;
    const band = GAUGE_BANDS[key];
    const g = field.querySelector(".gauge");
    if (!band || !g) return;
    g.style.setProperty("--pos", `${gaugePos(band, values[key]) * 100}%`);
  });
}

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  ui.voltage.value = p.voltageV;
  ui.current.value = p.ratedCurrentA;
  ui.resistance.value = p.resistanceOhm;
  ui.inductance.value = p.inductanceH * 1000;
  ui.holdTorque.value = p.holdTorqueNm;
  ui.inertia.value = p.inertiaGcm2;
  ui.bodyLen.value = p.bodyLenMm;
  ui.microsteps.value = p.microsteps;
  syncLabelsAndGauges();
  rebuildMotorMesh();
  updateStats();
  drawCurve();
}

function buildNema17(bodyLenMm) {
  const g = new THREE.Group();
  const mm = 0.01;
  const face = 42.3 * mm;
  const len = bodyLenMm * mm;
  const holePitch = 31.0 * mm;
  const holeR = 1.55 * mm;
  const bossR = 11.0 * mm;
  const bossH = 2.0 * mm;
  const shaftR = 2.5 * mm;
  const shaftFront = 24 * mm;
  const shaftRear = 14 * mm;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xb7c0c8,
    metalness: 0.6,
    roughness: 0.38,
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x171c21,
    metalness: 0.25,
    roughness: 0.65,
  });
  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0xd8e0e7,
    metalness: 0.88,
    roughness: 0.22,
  });
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xb87333,
    metalness: 0.72,
    roughness: 0.32,
  });

  g.add(new THREE.Mesh(new THREE.BoxGeometry(face, face, len), bodyMat));

  const bellGeo = new THREE.BoxGeometry(face * 1.02, face * 1.02, 3.2 * mm);
  const frontBell = new THREE.Mesh(bellGeo, blackMat);
  frontBell.position.z = len / 2 + 1.6 * mm;
  const rearBell = frontBell.clone();
  rearBell.position.z = -len / 2 - 1.6 * mm;
  g.add(frontBell, rearBell);

  // chamfered look via corner fillets (small cylinders)
  for (const z of [len / 2 + 1.6 * mm, -len / 2 - 1.6 * mm]) {
    for (const [sx, sy] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(3 * mm, 3 * mm, 3.2 * mm),
        blackMat
      );
      edge.position.set(sx * (face / 2 - 1.2 * mm), sy * (face / 2 - 1.2 * mm), z);
      g.add(edge);
    }
  }

  const boss = new THREE.Mesh(new THREE.CylinderGeometry(bossR, bossR, bossH, 36), blackMat);
  boss.rotation.x = Math.PI / 2;
  boss.position.z = len / 2 + 3.2 * mm + bossH / 2;
  g.add(boss);

  for (const [x, y] of [
    [holePitch / 2, holePitch / 2],
    [holePitch / 2, -holePitch / 2],
    [-holePitch / 2, holePitch / 2],
    [-holePitch / 2, -holePitch / 2],
  ]) {
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(holeR, holeR, len + 10 * mm, 14),
      blackMat
    );
    hole.rotation.x = Math.PI / 2;
    hole.position.set(x, y, 0);
    g.add(hole);
  }

  // Rotor assembly: spin this group around Z (motor axis).
  // Cylinders are Y-up by default; rotate.x = π/2 once here, never animate Euler on them.
  const rotor = new THREE.Group();
  g.add(rotor);

  const frontShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftR, shaftR, shaftFront, 24),
    shaftMat
  );
  frontShaft.rotation.x = Math.PI / 2;
  frontShaft.position.z = len / 2 + 3.2 * mm + bossH + shaftFront / 2;
  rotor.add(frontShaft);

  const rearShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftR, shaftR, shaftRear, 24),
    shaftMat
  );
  rearShaft.rotation.x = Math.PI / 2;
  rearShaft.position.z = -len / 2 - 3.2 * mm - shaftRear / 2;
  rotor.add(rearShaft);

  // D-flat: thin pad on the +Y side of the front shaft (spins with rotor around Z)
  const flat = new THREE.Mesh(
    new THREE.BoxGeometry(shaftR * 1.55, 0.9 * mm, shaftFront * 0.5),
    shaftMat
  );
  flat.position.set(0, shaftR - 0.2 * mm, frontShaft.position.z);
  rotor.add(flat);

  // Index mark so rotation direction is obvious
  const mark = new THREE.Mesh(
    new THREE.BoxGeometry(1.2 * mm, shaftR * 0.9, 2.5 * mm),
    new THREE.MeshStandardMaterial({ color: 0xe0a15a, metalness: 0.3, roughness: 0.45 })
  );
  mark.position.set(0, shaftR * 0.55, frontShaft.position.z + shaftFront / 2 - 1.5 * mm);
  rotor.add(mark);

  const mag = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftR * 1.35, shaftR * 1.35, 2 * mm, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.4, roughness: 0.5 })
  );
  mag.rotation.x = Math.PI / 2;
  mag.position.z = rearShaft.position.z - shaftRear / 2 - 1.2 * mm;
  rotor.add(mag);

  const coil = new THREE.Mesh(
    new THREE.TorusGeometry(face * 0.27, face * 0.055, 12, 28),
    copperMat
  );
  g.add(coil);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(face * 0.72, face * 0.3),
    new THREE.MeshStandardMaterial({ color: 0xf2f4f6, metalness: 0.05, roughness: 0.82 })
  );
  label.position.set(0, face / 2 + 0.002, 0);
  label.rotation.x = -Math.PI / 2;
  g.add(label);

  // lead wires stub
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x1f6a4a, roughness: 0.7 });
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * mm, 0.8 * mm, 18 * mm, 8), wireMat);
    w.position.set(-face / 2 - 4 * mm, (i - 1.5) * 3.2 * mm, -len / 4);
    w.rotation.z = Math.PI / 2;
    g.add(w);
  }

  g.userData.rotor = rotor;
  return g;
}

function initThree() {
  const mount = $("three");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f4f6);

  camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
  camera.position.set(1.15, 0.75, 1.35);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  mount.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd0d4d8, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 0.8);
  key.position.set(2, 3, 2);
  const fill = new THREE.DirectionalLight(0xffffff, 0.25);
  fill.position.set(-2, 1, -1);
  scene.add(key, fill);

  const grid = new THREE.GridHelper(3, 12, 0xb8c0c8, 0xd5dae0);
  grid.position.y = -0.35;
  scene.add(grid);

  rebuildMotorMesh();
  resize();
  window.addEventListener("resize", resize);
  animate();
}

function resize() {
  const mount = $("three");
  const w = mount.clientWidth;
  const h = mount.clientHeight;
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  drawCurve();
}

function rebuildMotorMesh() {
  if (!scene) return;
  if (motorGroup) scene.remove(motorGroup);
  motorGroup = buildNema17(+ui.bodyLen.value);
  scene.add(motorGroup);
  rotor = motorGroup.userData.rotor || null;
}

function animate() {
  requestAnimationFrame(animate);
  const p = paramsFromUi();
  spinAngle += p.speedRps * Math.PI * 2 * 0.016;
  if (rotor) rotor.rotation.z = spinAngle;
  controls.update();
  renderer.render(scene, camera);
}

function updateStats() {
  const p = paramsFromUi();
  const m = motorModel(p);
  const tau = m.torqueAtRevPerSec(p.speedRps);
  const i = m.currentAtRevPerSec(p.speedRps);
  const jKgM2 = p.inertiaGcm2 * 1e-7;
  const alpha = tau / Math.max(jKgM2, 1e-12);
  const drop = m.speedAtCurrentDrop(0.95);
  const stepHz = p.speedRps * m.stepsPerRev * p.microsteps;
  const pct = (100 * tau) / p.holdTorqueNm;

  $("stats").textContent =
    `τ hold        ${p.holdTorqueNm.toFixed(3)} N·m\n` +
    `τ @ op        ${tau.toFixed(3)} N·m  (${pct.toFixed(0)}% of hold)\n` +
    `I @ op        ${i.toFixed(2)} A  (rated ${p.ratedCurrentA.toFixed(2)} A)\n` +
    `Kt            ${m.kt.toFixed(3)} N·m/A\n` +
    `τ_e = L/R     ${m.electricalTimeConstantMs().toFixed(2)} ms\n` +
    `τ_m (rough)   ${m.mechTimeConstantMs(jKgM2).toFixed(1)} ms\n` +
    `BEMF / phase  ${m.backEmfPerPhaseV(p.speedRps).toFixed(2)} V\n` +
    `Cu loss/phase ${m.copperLossW(p.speedRps).toFixed(2)} W\n` +
    `I≈Irated to   ~${drop.toFixed(1)} rev/s\n` +
    `step rate     ${stepHz.toFixed(0)} Hz\n` +
    `α unload      ${(alpha / (2 * Math.PI)).toFixed(1)} rev/s²`;

  const verdict = $("verdict");
  let cls = "good";
  let text =
    "Looks usable for a high-speed open-loop delta at this operating point — still verify against the real motor pull-out curve.";
  if (p.inductanceH * 1000 > 2.5 && p.voltageV < 36) {
    cls = "bad";
    text =
      "High inductance + low bus voltage: torque will collapse early with speed. This fights the project goal.";
  } else if (pct < 45 && p.speedRps > 4) {
    cls = "bad";
    text =
      "At this speed you are already under half of holding torque. Raise V, lower L, add reduction, or slow down.";
  } else if (p.inductanceH * 1000 > 2.2 || p.voltageV < 40) {
    cls = "mid";
    text =
      "Workable but not ideal for ~3 g class moves. Prefer ≤~2 mH windings and ~48 V bus like the BOM target.";
  } else if (pct > 70) {
    cls = "good";
    text =
      "Strong torque margin at this speed in the approximate model. Still leave headroom for Jacobian / edges.";
  }
  verdict.className = "verdict " + cls;
  verdict.textContent = text;
}

function drawCurve() {
  const canvas = $("curve");
  const dpr = devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w < 10 || h < 10) return;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const p = paramsFromUi();
  const m = motorModel(p);
  const nMax = 30;
  const tauMax = p.holdTorqueNm * 1.05;
  const pad = { l: 48, r: 16, t: 28, b: 36 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#d7dbe0";
  ctx.strokeRect(pad.l, pad.t, iw, ih);
  ctx.fillStyle = "#5c6570";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.fillText("rev/s", w - 44, h - 10);
  ctx.fillText("N·m", 8, 18);

  for (let i = 0; i <= 6; i++) {
    const x = pad.l + (iw * i) / 6;
    const y = pad.t + (ih * i) / 6;
    ctx.strokeStyle = "#e5e8ec";
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, pad.t + ih);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + iw, y);
    ctx.stroke();
    ctx.fillStyle = "#5c6570";
    ctx.fillText(((nMax * i) / 6).toFixed(0), x - 6, h - 14);
    ctx.fillText((tauMax * (1 - i / 6)).toFixed(2), 8, y + 3);
  }

  const trace = (voltage, color, width) => {
    const mm = motorModel({ ...p, voltageV: voltage });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const n = (nMax * i) / 100;
      const tau = mm.torqueAtRevPerSec(n);
      const x = pad.l + (n / nMax) * iw;
      const y = pad.t + (1 - tau / tauMax) * ih;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  if (Math.abs(p.voltageV - 24) > 0.5) trace(24, "#a89878", 1.25);
  trace(p.voltageV, "#0b6b63", 2.25);

  const tauOp = m.torqueAtRevPerSec(p.speedRps);
  const ox = pad.l + (p.speedRps / nMax) * iw;
  const oy = pad.t + (1 - tauOp / tauMax) * ih;
  ctx.fillStyle = "#c56a2e";
  ctx.beginPath();
  ctx.arc(ox, oy, 4, 0, Math.PI * 2);
  ctx.fill();
}

function bindTooltips() {
  const tip = $("tooltip");
  document.querySelectorAll(".help").forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      tip.hidden = false;
      tip.textContent = TIPS[btn.dataset.key] || "";
      const r = btn.getBoundingClientRect();
      tip.style.left = `${Math.min(r.left, innerWidth - 300)}px`;
      tip.style.top = `${r.bottom + 8}px`;
    });
    btn.addEventListener("mouseleave", () => {
      tip.hidden = true;
    });
  });
}

function bind() {
  // fill presets
  ui.preset.innerHTML = "";
  for (const [key, p] of Object.entries(PRESETS)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = p.label;
    ui.preset.appendChild(opt);
  }

  for (const el of Object.values(ui)) {
    if (el === ui.preset) continue;
    el.addEventListener("input", () => {
      syncLabelsAndGauges();
      if (el === ui.bodyLen) rebuildMotorMesh();
      updateStats();
      drawCurve();
    });
  }
  ui.preset.addEventListener("change", () => applyPreset(ui.preset.value));
  bindTooltips();
}

bind();
initThree();
applyPreset("bom");
updateStats();
drawCurve();
