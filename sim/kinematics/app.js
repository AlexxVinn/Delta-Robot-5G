import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { DeltaKinematics, sampleWorkspace } from "./delta.js";

const $ = (id) => document.getElementById(id);
const MM = 0.01; // 1 scene unit = 100 mm

/** Task frame (Z down) → Three.js (Y up): (x,y,z_down) → (x, -z_down, -y) */
function taskToThree(x, y, z) {
  return new THREE.Vector3(x * MM, -z * MM, -y * MM);
}
function threeToTask(v) {
  return { x: v.x / MM, y: -v.z / MM, z: -v.y / MM };
}

const GAUGE_BANDS = {
  // value → 0..1 position on red-green-red bar. green center = typical good band
  baseSide: { low: 140, good0: 170, good1: 260, high: 340 },
  effectorSide: { low: 35, good0: 45, good1: 80, high: 110 },
  upperArm: { low: 70, good0: 90, good1: 160, high: 210 },
  forearm: { low: 160, good0: 220, good1: 340, high: 400 },
};

function gaugePos(id, value) {
  const b = GAUGE_BANDS[id];
  if (!b) return 0.5;
  const { low, good0, good1, high } = b;
  if (value <= low) return 0.05;
  if (value >= high) return 0.95;
  if (value < good0) return 0.05 + 0.3 * ((value - low) / (good0 - low));
  if (value <= good1) return 0.35 + 0.3 * ((value - good0) / Math.max(good1 - good0, 1));
  return 0.65 + 0.3 * ((value - good1) / (high - good1));
}

const state = {
  kin: null,
  tcp: { x: 0, y: 0, z: 250 },
  theta: [0.5, 0.5, 0.5],
  reachable: true,
  waypoints: [],
  playing: false,
  pathT: 0,
  pathSamples: [],
  cloud: [],
};

let renderer, scene, camera, orbit, transform;
let robotGroup, cloudPoints, pathLine, wpGroup;
let baseMesh, effectorMesh;
let armLines = []; // Line objects updated each frame
let handle; // TCP drag handle

function geomFromUi() {
  return {
    baseSide: +$("baseSide").value,
    effectorSide: +$("effectorSide").value,
    upperArm: +$("upperArm").value,
    forearm: +$("forearm").value,
    zDownTool: true,
  };
}

function setStatus(msg, ok = true) {
  const el = $("status");
  el.textContent = msg;
  el.className = "status " + (ok ? "ok" : "bad");
}

function syncLabels() {
  $("v-base").textContent = $("baseSide").value;
  $("v-eff").textContent = $("effectorSide").value;
  $("v-rf").textContent = $("upperArm").value;
  $("v-re").textContent = $("forearm").value;
  $("v-x").textContent = $("x").value;
  $("v-y").textContent = $("y").value;
  $("v-z").textContent = $("z").value;
  $("v-res").textContent = $("res").value;
  $("v-spd").textContent = `${(+ $("pathSpeed").value).toFixed(1)}×`;

  for (const [id, elId] of [
    ["baseSide", "baseSide"],
    ["effectorSide", "effectorSide"],
    ["upperArm", "upperArm"],
    ["forearm", "forearm"],
  ]) {
    const g = document.querySelector(`[data-gauge="${id}"]`);
    if (g) g.style.setProperty("--pos", `${gaugePos(id, +$(elId).value) * 100}%`);
  }
}

function rebuildKin() {
  state.kin = new DeltaKinematics(geomFromUi());
}

function applyTcp(x, y, z, { fromSliders = false } = {}) {
  const ik = state.kin.ik(x, y, z);
  if (!ik.ok) {
    state.reachable = false;
    setStatus(`unreachable: ${ik.error}`, false);
    $("hudPose").textContent = `IK FAIL  x=${x.toFixed(0)} y=${y.toFixed(0)} z=${z.toFixed(0)}`;
    return false;
  }
  const fk = state.kin.fk(ik.theta);
  if (!fk.ok) {
    state.reachable = false;
    setStatus(`FK fail after IK: ${fk.error}`, false);
    return false;
  }
  state.reachable = true;
  state.tcp = { x: fk.x, y: fk.y, z: fk.z };
  state.theta = ik.theta;
  if (!fromSliders) {
    $("x").value = Math.round(fk.x);
    $("y").value = Math.round(fk.y);
    $("z").value = Math.round(fk.z);
  }
  syncLabels();
  updateRobotMeshes(fk);
  $("hudPose").textContent =
    `x ${fk.x.toFixed(1)}  y ${fk.y.toFixed(1)}  z ${fk.z.toFixed(1)} mm`;
  setStatus(
    `reachable\nθ°  ${ik.theta.map((t) => ((t * 180) / Math.PI).toFixed(1)).join("  ")}`
  );
  return true;
}

function makeMaterial(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: opts.metalness ?? 0.25,
    roughness: opts.roughness ?? 0.55,
    transparent: !!opts.opacity && opts.opacity < 1,
    opacity: opts.opacity ?? 1,
  });
}

function buildScene() {
  const mount = $("viewport");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1419);
  scene.fog = new THREE.Fog(0x0f1419, 8, 22);

  camera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);
  camera.position.set(4.2, 2.2, 4.5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  mount.appendChild(renderer.domElement);

  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.target.set(0, -2.2, 0);

  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x1a2218, 1.05);
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(4, 6, 3);
  scene.add(hemi, key, new THREE.AmbientLight(0x405060, 0.35));

  const grid = new THREE.GridHelper(10, 20, 0x33404a, 0x222c34);
  grid.position.y = -4.2;
  scene.add(grid);

  // floor disk (table suggestion)
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 48),
    makeMaterial(0x1a222a, { roughness: 0.9, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4.2;
  scene.add(floor);

  robotGroup = new THREE.Group();
  scene.add(robotGroup);

  // TCP handle
  handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 24, 16),
    makeMaterial(0xe08945, { metalness: 0.4, roughness: 0.35 })
  );
  scene.add(handle);

  transform = new TransformControls(camera, renderer.domElement);
  transform.setMode("translate");
  transform.setSize(0.85);
  transform.attach(handle);
  scene.add(transform);
  transform.addEventListener("dragging-changed", (e) => {
    orbit.enabled = !e.value;
  });
  transform.addEventListener("objectChange", () => {
    if (state.playing) return;
    const t = threeToTask(handle.position);
    applyTcp(t.x, t.y, t.z);
  });

  pathLine = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: 0x2aa89a })
  );
  scene.add(pathLine);

  wpGroup = new THREE.Group();
  scene.add(wpGroup);

  cloudPoints = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  scene.add(cloudPoints);

  rebuildRobotStructure();
  onResize();
  window.addEventListener("resize", onResize);
}

function onResize() {
  const mount = $("viewport");
  const w = mount.clientWidth;
  const h = mount.clientHeight;
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function clearGroup(g) {
  while (g.children.length) {
    const c = g.children[0];
    g.remove(c);
    c.geometry?.dispose?.();
    if (c.material) {
      if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
      else c.material.dispose();
    }
  }
}

function rebuildRobotStructure() {
  clearGroup(robotGroup);
  armLines = [];
  const kin = state.kin;
  const f = kin.f;

  // Base triangle frame between motor hubs
  const basePts = [];
  for (let i = 0; i < 3; i++) {
    const jx = f * Math.cos(kin.phi[i]);
    const jy = f * Math.sin(kin.phi[i]);
    basePts.push(taskToThree(jx, jy, 0));
  }
  for (let i = 0; i < 3; i++) {
    const a = basePts[i];
    const b = basePts[(i + 1) % 3];
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1, 8),
      makeMaterial(0x6d7d8a, { metalness: 0.5 })
    );
    placeCylinder(bar, a, b);
    robotGroup.add(bar);
  }
  // center plate
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(f * MM * 0.55, f * MM * 0.55, 0.05, 24),
    makeMaterial(0x4a5864, { metalness: 0.4, roughness: 0.55 })
  );
  plate.position.copy(taskToThree(0, 0, 0));
  robotGroup.add(plate);
  baseMesh = plate;

  for (let i = 0; i < 3; i++) {
    const hub = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.16, 0.24),
      makeMaterial(0x3d4a54, { metalness: 0.55 })
    );
    hub.position.copy(basePts[i]);
    robotGroup.add(hub);
  }

  for (let i = 0; i < 3; i++) {
    const bicep = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 1, 10),
      makeMaterial(0x2aa89a, { metalness: 0.35 })
    );
    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 1, 10),
      makeMaterial(0xe08945, { metalness: 0.3 })
    );
    bicep.userData.kind = "bicep";
    forearm.userData.kind = "forearm";
    bicep.userData.leg = i;
    forearm.userData.leg = i;
    robotGroup.add(bicep, forearm);
    armLines.push(bicep, forearm);
  }

  effectorMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(Math.max(kin.e * MM * 1.05, 0.12), Math.max(kin.e * MM * 1.05, 0.12), 0.05, 24),
    makeMaterial(0xd9a078, { metalness: 0.4 })
  );
  robotGroup.add(effectorMesh);

  for (let i = 0; i < 3; i++) {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 14, 12),
      makeMaterial(0xdee5ea, { metalness: 0.7, roughness: 0.3 })
    );
    ball.userData.kind = "elbow";
    ball.userData.leg = i;
    robotGroup.add(ball);
    armLines.push(ball);
  }
}

function placeCylinder(mesh, a, b) {
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  mesh.position.copy(mid);
  mesh.scale.set(1, len || 0.001, 1);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );
}

function updateRobotMeshes(fk) {
  const elbows = fk.elbows.map((p) => taskToThree(p.x, p.y, p.z));
  const joints = fk.joints.map((p) => taskToThree(p.x, p.y, p.z));
  const ejs = fk.effectorJoints.map((p) => taskToThree(p.x, p.y, p.z));
  const tcp = taskToThree(fk.x, fk.y, fk.z);

  for (const m of armLines) {
    const i = m.userData.leg;
    if (m.userData.kind === "bicep") placeCylinder(m, joints[i], elbows[i]);
    if (m.userData.kind === "forearm") placeCylinder(m, elbows[i], ejs[i]);
    if (m.userData.kind === "elbow") m.position.copy(elbows[i]);
  }

  effectorMesh.position.copy(tcp);
  effectorMesh.scale.setScalar(1);
  // face "up" toward base
  effectorMesh.quaternion.identity();

  if (!transform.dragging && !state.playing) {
    handle.position.copy(tcp);
  } else if (state.playing) {
    handle.position.copy(tcp);
  }
}

function rebuildCloud() {
  rebuildKin();
  const steps = +$("res").value;
  state.cloud = sampleWorkspace(state.kin, {
    thMin: -0.1,
    thMax: 1.15,
    steps,
  });
  const n = state.cloud.length;
  const positions = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const p of state.cloud) {
    zMin = Math.min(zMin, p.z);
    zMax = Math.max(zMax, p.z);
  }
  const col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const p = state.cloud[i];
    const v = taskToThree(p.x, p.y, p.z);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
    const t = zMax === zMin ? 0.5 : (p.z - zMin) / (zMax - zMin);
    col.setRGB(0.15 + 0.75 * t, 0.65 - 0.35 * t, 0.55 - 0.4 * t);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  cloudPoints.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  cloudPoints.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  cloudPoints.geometry.computeBoundingSphere();
  cloudPoints.visible = $("showCloud").checked;
  setStatus(`workspace cloud: ${n} points · denser near deeper Z = warmer`);
}

function refreshPathGraphics() {
  clearGroup(wpGroup);
  const pts = state.waypoints.map((w) => taskToThree(w.x, w.y, w.z));
  for (const p of pts) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 10),
      makeMaterial(0x2aa89a)
    );
    m.position.copy(p);
    wpGroup.add(m);
  }
  if (pts.length >= 2) {
    const arr = [];
    for (const p of pts) arr.push(p.x, p.y, p.z);
    pathLine.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(arr, 3)
    );
    pathLine.geometry.computeBoundingSphere();
    pathLine.visible = true;
  } else {
    pathLine.visible = false;
  }
  $("wpList").textContent = state.waypoints
    .map((w, i) => `${i + 1}: ${w.x.toFixed(0)}, ${w.y.toFixed(0)}, ${w.z.toFixed(0)}`)
    .join("\n") || "no waypoints";
}

function densifyPath(waypoints, dsMm = 4) {
  if (waypoints.length < 2) return [];
  const out = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const dist = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const n = Math.max(1, Math.ceil(dist / dsMm));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
      });
    }
  }
  out.push({ ...waypoints[waypoints.length - 1] });
  // keep only reachable
  return out.filter((p) => state.kin.ik(p.x, p.y, p.z).ok);
}

function playPath() {
  if (state.waypoints.length < 2) {
    setStatus("add at least 2 waypoints (or Demo square)", false);
    return;
  }
  state.pathSamples = densifyPath(state.waypoints, 3);
  if (state.pathSamples.length < 2) {
    setStatus("path has no reachable samples — adjust geometry/waypoints", false);
    return;
  }
  state.playing = true;
  state.pathT = 0;
  setStatus(`playing ${state.pathSamples.length} samples`);
}

function stopPath() {
  state.playing = false;
}

function demoSquare() {
  const z = +$("z").value;
  const s = 45;
  state.waypoints = [
    { x: -s, y: -s, z },
    { x: s, y: -s, z },
    { x: s, y: s, z },
    { x: -s, y: s, z },
    { x: -s, y: -s, z },
  ];
  // drop unreachable corners
  state.waypoints = state.waypoints.filter((w) => state.kin.ik(w.x, w.y, w.z).ok);
  refreshPathGraphics();
  playPath();
}

function tickMotion(dt) {
  if (!state.playing || state.pathSamples.length < 2) return;
  const speed = +$("pathSpeed").value; // path indices per second scale
  // advance ~ (mm/s): use 120 mm/s * speed
  const mmPerSec = 180 * speed;
  // approximate index step from segment length ~3mm
  state.pathT += (mmPerSec * dt) / 3;
  if (state.pathT >= state.pathSamples.length - 1) {
    state.pathT = state.pathSamples.length - 1;
    state.playing = false;
    const p = state.pathSamples[state.pathSamples.length - 1];
    applyTcp(p.x, p.y, p.z);
    setStatus("path done");
    return;
  }
  const i = Math.floor(state.pathT);
  const f = state.pathT - i;
  const a = state.pathSamples[i];
  const b = state.pathSamples[i + 1];
  applyTcp(
    a.x + (b.x - a.x) * f,
    a.y + (b.y - a.y) * f,
    a.z + (b.z - a.z) * f
  );
}

function bindTooltips() {
  const tip = $("tooltip");
  document.querySelectorAll(".help").forEach((btn) => {
    btn.addEventListener("mouseenter", (e) => {
      tip.hidden = false;
      tip.textContent = btn.dataset.tip || "";
      const r = btn.getBoundingClientRect();
      tip.style.left = `${Math.min(r.left, window.innerWidth - 280)}px`;
      tip.style.top = `${r.bottom + 8}px`;
    });
    btn.addEventListener("mouseleave", () => {
      tip.hidden = true;
    });
  });
}

function bindUi() {
  for (const id of ["baseSide", "effectorSide", "upperArm", "forearm"]) {
    $(id).addEventListener("input", () => {
      stopPath();
      rebuildKin();
      rebuildRobotStructure();
      rebuildCloud();
      applyTcp(+ $("x").value, +$("y").value, +$("z").value, { fromSliders: true });
      syncLabels();
    });
  }
  for (const id of ["x", "y", "z"]) {
    $(id).addEventListener("input", () => {
      if (state.playing) return;
      syncLabels();
      applyTcp(+ $("x").value, +$("y").value, +$("z").value, { fromSliders: true });
    });
  }
  $("res").addEventListener("input", syncLabels);
  $("pathSpeed").addEventListener("input", syncLabels);
  $("rebuild").addEventListener("click", rebuildCloud);
  $("showCloud").addEventListener("change", () => {
    cloudPoints.visible = $("showCloud").checked;
  });
  $("addWp").addEventListener("click", () => {
    state.waypoints.push({ ...state.tcp });
    refreshPathGraphics();
  });
  $("clearWp").addEventListener("click", () => {
    stopPath();
    state.waypoints = [];
    refreshPathGraphics();
  });
  $("playPath").addEventListener("click", playPath);
  $("stopPath").addEventListener("click", stopPath);
  $("demoPath").addEventListener("click", demoSquare);
}

let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tickMotion(dt);
  orbit.update();
  renderer.render(scene, camera);
}

// boot
rebuildKin();
buildScene();
bindTooltips();
bindUi();
syncLabels();
rebuildCloud();
applyTcp(0, 0, 250);
refreshPathGraphics();
requestAnimationFrame(animate);
