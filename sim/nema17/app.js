import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PRESETS, motorModel } from "./motor.js";

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
let shaftMeshes = [];
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

function syncLabels() {
  $("v-v").textContent = ui.voltage.value;
  $("v-i").textContent = (+ui.current.value).toFixed(2);
  $("v-r").textContent = (+ui.resistance.value).toFixed(2);
  $("v-l").textContent = (+ui.inductance.value).toFixed(2);
  $("v-th").textContent = (+ui.holdTorque.value).toFixed(2);
  $("v-j").textContent = ui.inertia.value;
  $("v-len").textContent = ui.bodyLen.value;
  $("v-ms").textContent = ui.microsteps.value;
  $("v-spd").textContent = (+ui.speed.value).toFixed(1);
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
  syncLabels();
  rebuildMotorMesh();
  updateStats();
  drawCurve();
}

/** Build a NEMA 17-ish body from primitives (mm → scene units). */
function buildNema17(bodyLenMm) {
  const g = new THREE.Group();
  const mm = 0.01; // 1 scene unit = 100 mm → body ~0.42 wide
  const face = 42.3 * mm;
  const len = bodyLenMm * mm;
  const holePitch = 31.0 * mm;
  const holeR = 1.5 * mm;
  const bossR = 11.0 * mm;
  const bossH = 2.0 * mm;
  const shaftR = 2.5 * mm;
  const shaftFront = 22 * mm;
  const shaftRear = 12 * mm;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xb8c0c8,
    metalness: 0.55,
    roughness: 0.4,
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x1a1f24,
    metalness: 0.2,
    roughness: 0.7,
  });
  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0xd7dee5,
    metalness: 0.85,
    roughness: 0.25,
  });
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xb87333,
    metalness: 0.7,
    roughness: 0.35,
  });

  // laminated body
  const body = new THREE.Mesh(new THREE.BoxGeometry(face, face, len), bodyMat);
  g.add(body);

  // end bells
  const bellGeo = new THREE.BoxGeometry(face * 1.01, face * 1.01, 3 * mm);
  const frontBell = new THREE.Mesh(bellGeo, blackMat);
  frontBell.position.z = len / 2 + 1.5 * mm;
  const rearBell = frontBell.clone();
  rearBell.position.z = -len / 2 - 1.5 * mm;
  g.add(frontBell, rearBell);

  // pilot boss
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(bossR, bossR, bossH, 32), blackMat);
  boss.rotation.x = Math.PI / 2;
  boss.position.z = len / 2 + 3 * mm + bossH / 2;
  g.add(boss);

  // mounting holes (visual tubes)
  const holePositions = [
    [holePitch / 2, holePitch / 2],
    [holePitch / 2, -holePitch / 2],
    [-holePitch / 2, holePitch / 2],
    [-holePitch / 2, -holePitch / 2],
  ];
  for (const [x, y] of holePositions) {
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(holeR, holeR, len + 8 * mm, 12),
      blackMat
    );
    hole.rotation.x = Math.PI / 2;
    hole.position.set(x, y, 0);
    g.add(hole);
  }

  // dual shaft
  const shafts = [];
  const frontShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftR, shaftR, shaftFront, 20),
    shaftMat
  );
  frontShaft.rotation.x = Math.PI / 2;
  frontShaft.position.z = len / 2 + 3 * mm + bossH + shaftFront / 2;
  const rearShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(shaftR, shaftR, shaftRear, 20),
    shaftMat
  );
  rearShaft.rotation.x = Math.PI / 2;
  rearShaft.position.z = -len / 2 - 3 * mm - shaftRear / 2;
  g.add(frontShaft, rearShaft);
  shafts.push(frontShaft, rearShaft);

  // flat on front shaft (D-cut suggestion)
  const flat = new THREE.Mesh(
    new THREE.BoxGeometry(shaftR * 1.6, shaftR * 0.35, shaftFront * 0.55),
    shaftMat
  );
  flat.position.copy(frontShaft.position);
  flat.position.y += shaftR * 0.55;
  g.add(flat);
  shafts.push(flat);

  // winding hint rings inside a translucent shell
  const coil = new THREE.Mesh(
    new THREE.TorusGeometry(face * 0.28, face * 0.06, 10, 24),
    copperMat
  );
  coil.position.z = 0;
  g.add(coil);

  // label plate
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(face * 0.7, face * 0.28),
    new THREE.MeshStandardMaterial({ color: 0xf0f2f4, metalness: 0.1, roughness: 0.8 })
  );
  label.position.set(0, face / 2 + 0.002, 0);
  label.rotation.x = -Math.PI / 2;
  g.add(label);

  g.userData.shafts = shafts;
  return g;
}

function initThree() {
  const mount = $("three");
  const w = mount.clientWidth;
  const h = mount.clientHeight;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x182229);

  camera = new THREE.PerspectiveCamera(40, w / h, 0.01, 50);
  camera.position.set(1.1, 0.7, 1.3);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  mount.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const hemi = new THREE.HemisphereLight(0xddeeff, 0x223322, 1.1);
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(2, 3, 2);
  const fill = new THREE.DirectionalLight(0x88aacc, 0.4);
  fill.position.set(-2, 1, -1);
  scene.add(hemi, key, fill);

  const grid = new THREE.GridHelper(3, 12, 0x3a4a56, 0x24323c);
  grid.position.y = -0.35;
  scene.add(grid);

  rebuildMotorMesh();

  window.addEventListener("resize", () => {
    const ww = mount.clientWidth;
    const hh = mount.clientHeight;
    camera.aspect = ww / hh;
    camera.updateProjectionMatrix();
    renderer.setSize(ww, hh, false);
  });

  animate();
}

function rebuildMotorMesh() {
  if (motorGroup) scene.remove(motorGroup);
  motorGroup = buildNema17(+ui.bodyLen.value);
  scene.add(motorGroup);
  shaftMeshes = motorGroup.userData.shafts || [];
}

function animate() {
  requestAnimationFrame(animate);
  const p = paramsFromUi();
  spinAngle += p.speedRps * Math.PI * 2 * 0.016;
  if (motorGroup) {
    // rotate shafts about local Z (motor axis)
    for (const s of shaftMeshes) {
      s.rotation.z = spinAngle;
    }
  }
  controls.update();
  renderer.render(scene, camera);
}

function updateStats() {
  const p = paramsFromUi();
  const m = motorModel(p);
  const tau = m.torqueAtRevPerSec(p.speedRps);
  const jKgM2 = p.inertiaGcm2 * 1e-7; // g·cm² → kg·m²
  const alpha = tau / Math.max(jKgM2, 1e-12); // rad/s² unloaded
  const drop = m.speedAtCurrentDrop(0.95);
  const stepHz = p.speedRps * m.stepsPerRev * p.microsteps;

  $("stats").textContent =
    `τ(hold)     ${p.holdTorqueNm.toFixed(3)} N·m\n` +
    `τ@${p.speedRps.toFixed(1)} rps  ${tau.toFixed(3)} N·m  (${((100 * tau) / p.holdTorqueNm).toFixed(0)}% hold)\n` +
    `Kt          ${m.kt.toFixed(3)} N·m/A\n` +
    `τ_e = L/R   ${m.electricalTimeConstantMs().toFixed(2)} ms\n` +
    `I still ~Irated up to ~${drop.toFixed(1)} rev/s\n` +
    `step pulse  ${stepHz.toFixed(0)} Hz @ ${p.microsteps} µsteps\n` +
    `α unload    ${(alpha / (2 * Math.PI)).toFixed(1)} rev/s²\n` +
    `J rotor     ${jKgM2.toExponential(2)} kg·m²`;
}

function drawCurve() {
  const canvas = $("curve");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
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

  // axes
  ctx.strokeStyle = "#2a3a46";
  ctx.lineWidth = 1;
  ctx.strokeRect(pad.l, pad.t, iw, ih);

  ctx.fillStyle = "#8aa0ae";
  ctx.font = "11px IBM Plex Mono, monospace";
  ctx.fillText("rev/s", w - 44, h - 10);
  ctx.save();
  ctx.translate(14, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("N·m", 0, 0);
  ctx.restore();

  // grid
  for (let i = 0; i <= 6; i++) {
    const x = pad.l + (iw * i) / 6;
    const y = pad.t + (ih * i) / 6;
    ctx.strokeStyle = "#22303a";
    ctx.beginPath();
    ctx.moveTo(x, pad.t);
    ctx.lineTo(x, pad.t + ih);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + iw, y);
    ctx.stroke();
    const nTick = (nMax * i) / 6;
    const tTick = tauMax * (1 - i / 6);
    ctx.fillStyle = "#8aa0ae";
    ctx.fillText(nTick.toFixed(0), x - 6, h - 14);
    ctx.fillText(tTick.toFixed(2), 8, y + 3);
  }

  // compare 24V ghost if not already 24
  const drawTrace = (voltage, color, width) => {
    const mm = motorModel({ ...p, voltageV: voltage });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const n = (nMax * i) / 80;
      const tau = mm.torqueAtRevPerSec(n);
      const x = pad.l + (n / nMax) * iw;
      const y = pad.t + (1 - tau / tauMax) * ih;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  if (p.voltageV !== 24) drawTrace(24, "#6b5a3c", 1.5);
  drawTrace(p.voltageV, "#3cb8a5", 2.5);

  // operating point
  const tauOp = m.torqueAtRevPerSec(p.speedRps);
  const ox = pad.l + (p.speedRps / nMax) * iw;
  const oy = pad.t + (1 - tauOp / tauMax) * ih;
  ctx.fillStyle = "#e0a15a";
  ctx.beginPath();
  ctx.arc(ox, oy, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8aa0ae";
  ctx.fillText(
    p.voltageV !== 24 ? `solid ${p.voltageV}V · thin 24V ghost` : `${p.voltageV}V`,
    pad.l + 8,
    pad.t + 14
  );
}

function bind() {
  for (const el of Object.values(ui)) {
    if (el === ui.preset) continue;
    el.addEventListener("input", () => {
      syncLabels();
      if (el === ui.bodyLen) rebuildMotorMesh();
      updateStats();
      drawCurve();
    });
  }
  ui.preset.addEventListener("change", () => applyPreset(ui.preset.value));
  window.addEventListener("resize", drawCurve);
}

bind();
applyPreset("bom");
initThree();
updateStats();
drawCurve();
