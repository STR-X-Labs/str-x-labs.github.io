/**
 * STR-X Conference Platform — public synthetic demo.
 * Shepp–Logan head phantom: Shepp & Logan, IEEE Trans Nucl Sci 21(3):21–43, 1974.
 * No patient data. Static files only. Single-user.
 */
import * as THREE from '../../vendor/three.module.min.js';

const N = 64;
const TABLE_Y = 0.9;
const VOL_SIZE = new THREE.Vector3(0.16, 0.2, 0.18);

const PRESETS = {
  brain: { min: 0.1, max: 0.58, opacity: 0.2 },
  bone: { min: 0.58, max: 1.0, opacity: 0.32 }
};

function sheppLogan3D(n) {
  // 3D ellipsoids after Toft (1996), extending Shepp & Logan 1974.
  const ellipsoids = [
    [1.0, 0.69, 0.92, 0.81, 0.0, 0.0, 0.0, 0],
    [-0.8, 0.6624, 0.874, 0.78, 0.0, -0.0184, 0.0, 0],
    [-0.2, 0.11, 0.31, 0.22, 0.22, 0.0, 0.0, -18],
    [-0.2, 0.16, 0.41, 0.28, -0.22, 0.0, 0.0, 18],
    [0.1, 0.21, 0.25, 0.41, 0.0, 0.35, -0.15, 0],
    [0.1, 0.046, 0.046, 0.05, 0.0, 0.1, 0.25, 0],
    [0.1, 0.046, 0.046, 0.05, 0.0, -0.1, 0.25, 0],
    [0.1, 0.046, 0.023, 0.05, -0.08, -0.605, 0.0, 0],
    [0.1, 0.023, 0.023, 0.02, 0.0, -0.606, 0.0, 0],
    [0.1, 0.023, 0.046, 0.02, 0.06, -0.605, 0.0, 0]
  ];
  const tmp = new Float32Array(n * n * n);
  for (let z = 0; z < n; z++) {
    const z0 = ((z + 0.5) / n) * 2 - 1;
    for (let y = 0; y < n; y++) {
      const y0 = ((y + 0.5) / n) * 2 - 1;
      for (let x = 0; x < n; x++) {
        const x0 = ((x + 0.5) / n) * 2 - 1;
        let v = 0;
        for (let e = 0; e < ellipsoids.length; e++) {
          const E = ellipsoids[e];
          const rad = (E[7] * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const xd = x0 - E[4];
          const yd = y0 - E[5];
          const zd = z0 - E[6];
          const xr = xd * cos + yd * sin;
          const yr = -xd * sin + yd * cos;
          if ((xr * xr) / (E[1] * E[1]) + (yr * yr) / (E[2] * E[2]) + (zd * zd) / (E[3] * E[3]) <= 1) {
            v += E[0];
          }
        }
        tmp[x + y * n + z * n * n] = v;
      }
    }
  }
  let max = 0;
  for (let i = 0; i < tmp.length; i++) if (tmp[i] > max) max = tmp[i];
  const data = new Uint8Array(n * n * n);
  const scale = max > 0 ? 255 / max : 0;
  for (let i = 0; i < tmp.length; i++) data[i] = Math.max(0, Math.min(255, tmp[i] * scale));
  return data;
}

function sample(data, x, y, z) {
  const xi = Math.max(0, Math.min(N - 1, x | 0));
  const yi = Math.max(0, Math.min(N - 1, y | 0));
  const zi = Math.max(0, Math.min(N - 1, z | 0));
  return data[xi + yi * N + zi * N * N] / 255;
}

function makeLabel(text, width = 0.55) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(2, 8, 24, 0.82)';
  g.fillRect(0, 0, 1024, 160);
  g.strokeStyle = '#22d3ee';
  g.lineWidth = 4;
  g.strokeRect(3, 3, 1018, 154);
  g.font = '600 42px Inter, system-ui, sans-serif';
  g.fillStyle = '#22d3ee';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 512, 80);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  spr.scale.set(width, width * 0.156, 1);
  return spr;
}

function makeHead(mat) {
  const g = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.07, 28, 20), mat);
  skull.scale.set(0.86, 1.1, 1.0);
  skull.position.y = 0.078;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), mat);
  face.scale.set(0.88, 0.72, 0.9);
  face.position.set(0, 0.028, 0.018);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, 0.068, 16), mat);
  neck.position.y = -0.012;
  g.add(skull, face, neck);
  g.traverse(o => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = true;
    }
  });
  return g;
}

function makeDrape() {
  const geo = new THREE.PlaneGeometry(0.72, 1.95, 28, 52);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(y * 6.2) * 0.012 + Math.sin(x * 16 + y * 2.4) * 0.007);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0f6e58,
    roughness: 0.92,
    metalness: 0.04
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = TABLE_Y + 0.011;
  mesh.receiveShadow = true;
  return mesh;
}

function makeHologram() {
  const parts = [
    { c: [0, 1.58, 0], r: [0.09, 0.11, 0.09], n: 700 },
    { c: [0, 1.2, 0], r: [0.16, 0.26, 0.1], n: 1400 },
    { c: [-0.22, 1.22, 0], r: [0.05, 0.22, 0.05], n: 420 },
    { c: [0.22, 1.22, 0], r: [0.05, 0.22, 0.05], n: 420 },
    { c: [-0.07, 0.55, 0], r: [0.07, 0.38, 0.07], n: 520 },
    { c: [0.07, 0.55, 0], r: [0.07, 0.38, 0.07], n: 520 }
  ];
  let count = 0;
  for (const p of parts) count += p.n;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const bases = new Float32Array(count * 3);
  let o = 0;
  for (const p of parts) {
    for (let i = 0; i < p.n; i++, o++) {
      let x;
      let y;
      let z;
      let r2;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        r2 = x * x + y * y + z * z;
      } while (r2 > 1 || r2 < 0.55);
      const r = Math.sqrt(r2);
      const k = 0.88 + Math.random() * 0.12;
      const px = (x / r) * k * p.r[0] + p.c[0];
      const py = (y / r) * k * p.r[1] + p.c[1];
      const pz = (z / r) * k * p.r[2] + p.c[2];
      bases[o * 3] = px;
      bases[o * 3 + 1] = py;
      bases[o * 3 + 2] = pz;
      positions[o * 3] = px;
      positions[o * 3 + 1] = py;
      positions[o * 3 + 2] = pz;
      const glow = 0.35 + Math.random() * 0.65;
      colors[o * 3] = 0.15 * glow;
      colors[o * 3 + 1] = 0.85 * glow;
      colors[o * 3 + 2] = 0.95 * glow;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.014,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  const points = new THREE.Points(geo, mat);
  points.userData.bases = bases;
  return points;
}

function volumeMaterial() {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTex: { value: null },
      uCam: { value: new THREE.Vector3() },
      uInv: { value: new THREE.Matrix4() },
      uMin: { value: PRESETS.brain.min },
      uMax: { value: PRESETS.brain.max },
      uOpacity: { value: PRESETS.brain.opacity },
      uPreset: { value: 0 },
      uSteps: { value: 80 }
    },
    vertexShader: /* glsl */ `
      out vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      precision highp sampler3D;
      in vec3 vWorld;
      out vec4 fragColor;
      uniform sampler3D uTex;
      uniform vec3 uCam;
      uniform mat4 uInv;
      uniform float uMin;
      uniform float uMax;
      uniform float uOpacity;
      uniform int uPreset;
      uniform int uSteps;

      vec2 hitBox(vec3 orig, vec3 dir) {
        vec3 bmin = vec3(-0.5);
        vec3 bmax = vec3(0.5);
        vec3 invD = 1.0 / dir;
        vec3 t0s = (bmin - orig) * invD;
        vec3 t1s = (bmax - orig) * invD;
        vec3 tsm = min(t0s, t1s);
        vec3 tlg = max(t0s, t1s);
        float tNear = max(max(tsm.x, tsm.y), tsm.z);
        float tFar = min(min(tlg.x, tlg.y), tlg.z);
        return vec2(tNear, tFar);
      }

      vec3 tf(float s) {
        if (uPreset == 1) {
          float n = smoothstep(uMin, uMax, s);
          return mix(vec3(0.12, 0.7, 0.85), vec3(0.95, 0.98, 1.0), n);
        }
        if (s > 0.78) return vec3(0.88, 0.93, 1.0);
        float n = smoothstep(uMin, uMax, s);
        return mix(vec3(0.12, 0.28, 0.48), vec3(0.93, 0.7, 0.62), n);
      }

      void main() {
        vec3 camL = (uInv * vec4(uCam, 1.0)).xyz;
        vec3 posL = (uInv * vec4(vWorld, 1.0)).xyz;
        vec3 dir = posL - camL;
        float len = length(dir);
        if (len < 1e-5) discard;
        dir /= len;
        vec2 b = hitBox(camL, dir);
        if (b.x > b.y) discard;
        b.x = max(b.x, 0.0);
        float dist = b.y - b.x;
        vec3 p = camL + dir * b.x;
        vec3 dp = dir * (dist / float(uSteps));
        vec4 acc = vec4(0.0);
        for (int i = 0; i < 160; i++) {
          if (i >= uSteps) break;
          vec3 uv = p + 0.5;
          if (all(greaterThanEqual(uv, vec3(0.0))) && all(lessThanEqual(uv, vec3(1.0)))) {
            float s = texture(uTex, uv).r;
            float n = smoothstep(uMin, uMax, s);
            float a = n * uOpacity;
            if (uPreset == 1) a *= step(uMin * 0.85, s);
            acc.rgb += (1.0 - acc.a) * a * tf(s);
            acc.a += (1.0 - acc.a) * a;
            if (acc.a > 0.96) break;
          }
          p += dp;
        }
        if (acc.a < 0.02) discard;
        fragColor = acc;
      }
    `
  });
}

function createOrbit(camera, target, dom) {
  const look = target.clone();
  const sph = new THREE.Spherical();
  const offset = new THREE.Vector3();
  let rotating = false;
  let lx = 0;
  let ly = 0;
  let enabled = true;
  offset.copy(camera.position).sub(look);
  sph.setFromVector3(offset);

  const apply = () => {
    sph.phi = Math.max(0.12, Math.min(Math.PI / 2 - 0.05, sph.phi));
    sph.radius = Math.max(0.32, Math.min(3.2, sph.radius));
    offset.setFromSpherical(sph);
    camera.position.copy(look).add(offset);
    camera.lookAt(look);
  };
  apply();

  const onDown = e => {
    if (!enabled || e.button !== 0) return;
    rotating = true;
    lx = e.clientX;
    ly = e.clientY;
    try { dom.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  };
  const onMove = e => {
    if (!enabled || !rotating) return;
    sph.theta -= (e.clientX - lx) * 0.005;
    sph.phi -= (e.clientY - ly) * 0.005;
    lx = e.clientX;
    ly = e.clientY;
    apply();
  };
  const onUp = () => { rotating = false; };
  const onWheel = e => {
    if (!enabled) return;
    e.preventDefault();
    sph.radius *= Math.exp(e.deltaY * 0.0012);
    apply();
  };

  dom.addEventListener('pointerdown', onDown);
  dom.addEventListener('pointermove', onMove);
  dom.addEventListener('pointerup', onUp);
  dom.addEventListener('pointercancel', onUp);
  dom.addEventListener('wheel', onWheel, { passive: false });
  dom.addEventListener('contextmenu', e => e.preventDefault());

  return {
    apply,
    look,
    setEnabled(v) { enabled = v; rotating = false; },
    setFromCamera() {
      offset.copy(camera.position).sub(look);
      sph.setFromVector3(offset);
    }
  };
}

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (attrs[k] === false || attrs[k] == null) continue;
      else node.setAttribute(k, attrs[k] === true ? '' : String(attrs[k]));
    }
  }
  (children || []).forEach(c => node.appendChild(c));
  return node;
}

function drawSlice(ctx, data, axis, index, preset) {
  const img = ctx.createImageData(N, N);
  const d = img.data;
  const p = PRESETS[preset];
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      let s;
      if (axis === 'axial') s = sample(data, i, N - 1 - j, index);
      else if (axis === 'coronal') s = sample(data, i, index, N - 1 - j);
      else s = sample(data, index, i, N - 1 - j);
      const n = Math.max(0, Math.min(1, (s - p.min) / (p.max - p.min)));
      const o = (j * N + i) * 4;
      if (preset === 'bone') {
        d[o] = 40 + n * 180;
        d[o + 1] = 180 + n * 70;
        d[o + 2] = 220 + n * 35;
        d[o + 3] = s > p.min * 0.7 ? 255 : 30;
      } else {
        d[o] = 20 + n * 220;
        d[o + 1] = 40 + n * 180;
        d[o + 2] = 70 + n * 185;
        d[o + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function mountDemo(stage) {
  stage.innerHTML = '';
  const canvas = el('canvas', { class: 'demo-canvas', 'aria-label': 'Virtual OR table with synthetic Shepp–Logan volume' });
  const banner = el('p', { class: 'demo-banner', text: 'Demo with synthetic data — no patient information' });
  const cite = el('p', {
    class: 'demo-cite',
    html: 'Synthetic Shepp–Logan head phantom (Shepp &amp; Logan, <cite>IEEE Trans Nucl Sci</cite> 1974). Single-user demo — no live session.'
  });

  const orbitBtn = el('button', { class: 'chip', type: 'button', 'aria-pressed': 'true', text: '3D orbit' });
  const specBtn = el('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', text: 'Spectator' });
  const xrBtn = el('button', { class: 'chip', type: 'button', hidden: true, text: 'Enter VR/AR' });
  const ohBtn = el('button', { class: 'chip', type: 'button', hidden: true, 'aria-pressed': 'false', text: 'Overhead' });
  const surgBtn = el('button', { class: 'chip', type: 'button', hidden: true, 'aria-pressed': 'false', text: 'Surgeon’s-eye' });
  const sideBtn = el('button', { class: 'chip', type: 'button', hidden: true, 'aria-pressed': 'false', text: 'Side' });
  const brainBtn = el('button', { class: 'chip', type: 'button', 'aria-pressed': 'true', text: 'Brain' });
  const boneBtn = el('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', text: 'Bone' });
  const teachBtn = el('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', text: 'Teaching copy' });

  const controls = el('div', { class: 'demo-controls' }, [
    el('div', { class: 'row', role: 'group', 'aria-label': 'View mode' }, [orbitBtn, specBtn, xrBtn]),
    el('div', { class: 'row', role: 'group', 'aria-label': 'Spectator cameras' }, [ohBtn, surgBtn, sideBtn]),
    el('div', { class: 'row', role: 'group', 'aria-label': 'Volume presets' }, [brainBtn, boneBtn, teachBtn])
  ]);

  const slices = [
    { axis: 'axial', label: 'Axial', value: (N / 2) | 0 },
    { axis: 'coronal', label: 'Coronal', value: (N / 2) | 0 },
    { axis: 'sagittal', label: 'Sagittal', value: (N / 2) | 0 }
  ].map(s => {
    const canvas2 = el('canvas', { width: String(N), height: String(N), 'aria-hidden': 'true' });
    const slider = el('input', {
      type: 'range', min: '0', max: String(N - 1), value: String(s.value),
      'aria-label': s.label + ' slice'
    });
    const val = el('span', { text: String(s.value) });
    const panel = el('div', { class: 'slice-panel' }, [
      el('label', {}, [el('span', { text: s.label }), val]),
      canvas2,
      slider
    ]);
    return { ...s, canvas: canvas2, slider, val, panel, ctx: canvas2.getContext('2d') };
  });

  const panels = el('div', { class: 'demo-panels', 'aria-label': 'Orthogonal slice panels' }, slices.map(s => s.panel));
  stage.append(banner, controls, canvas, panels, cite);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  if (!renderer.capabilities.isWebGL2) {
    stage.innerHTML = '';
    stage.appendChild(el('p', { class: 'demo-fallback', text: 'This demo needs WebGL 2, which this browser does not provide. Try an updated desktop browser or the Meta Quest Browser.' }));
    renderer.dispose();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071226);
  scene.fog = new THREE.Fog(0x071226, 7, 16);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.04, 40);
  camera.position.set(0.52, 1.34, 0.7);
  const target = new THREE.Vector3(0, 1.08, 0.16);
  const orbit = createOrbit(camera, target, canvas);

  scene.add(new THREE.AmbientLight(0x3a5478, 1.1));
  scene.add(new THREE.HemisphereLight(0xb7dcff, 0x1a3324, 0.9));
  const key = new THREE.SpotLight(0xffffff, 36, 10, Math.PI / 4.2, 0.45, 1.8);
  key.position.set(0.1, 2.6, 0.35);
  key.target.position.set(0, TABLE_Y, 0.15);
  scene.add(key, key.target);
  const fill = new THREE.PointLight(0x22d3ee, 10, 7, 1.8);
  fill.position.set(-0.8, 1.7, 0.9);
  scene.add(fill);
  const rim = new THREE.PointLight(0x88aaff, 8, 7, 1.8);
  rim.position.set(0.9, 1.5, -0.7);
  scene.add(rim);

  const room = new THREE.Mesh(
    new THREE.BoxGeometry(10, 4.2, 10),
    new THREE.MeshStandardMaterial({ color: 0x07101f, side: THREE.BackSide, roughness: 1 })
  );
  room.position.y = 2.05;
  scene.add(room);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a1428, roughness: 0.85, metalness: 0.15 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.07, 1.72),
    new THREE.MeshStandardMaterial({ color: 0x6a7384, metalness: 0.22, roughness: 0.5 })
  );
  tableTop.position.y = TABLE_Y - 0.03;
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, TABLE_Y - 0.08, 20),
    new THREE.MeshStandardMaterial({ color: 0x2a3344, metalness: 0.6, roughness: 0.4 })
  );
  pedestal.position.y = (TABLE_Y - 0.08) / 2;
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.42, 0.06, 24),
    new THREE.MeshStandardMaterial({ color: 0x1a2230, metalness: 0.5, roughness: 0.45 })
  );
  base.position.y = 0.03;
  scene.add(tableTop, pedestal, base, makeDrape());

  const lamp = new THREE.Group();
  const arm = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.012, 10, 28),
    new THREE.MeshStandardMaterial({ color: 0xcfd6e4, metalness: 0.7, roughness: 0.25 })
  );
  arm.rotation.x = Math.PI / 2;
  lamp.add(arm);
  lamp.position.set(0, 2.48, 0);
  scene.add(lamp);

  const skin = new THREE.MeshStandardMaterial({ color: 0xe2c2ae, roughness: 0.78, metalness: 0.02 });
  const head = makeHead(skin);
  head.position.set(0, TABLE_Y + 0.03, 0.18);
  scene.add(head);

  const rest = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.018, 10, 22),
    new THREE.MeshStandardMaterial({ color: 0x2a2a32, roughness: 0.7 })
  );
  rest.rotation.x = Math.PI / 2;
  rest.position.set(0, TABLE_Y + 0.02, 0.18);
  scene.add(rest);

  const volumeData = sheppLogan3D(N);
  const tex = new THREE.Data3DTexture(volumeData, N, N, N);
  tex.format = THREE.RedFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;

  const volMat = volumeMaterial();
  volMat.uniforms.uTex.value = tex;
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  volMat.uniforms.uSteps.value = mobile ? 56 : 88;

  const volMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), volMat);
  volMesh.scale.copy(VOL_SIZE);
  volMesh.position.set(0, TABLE_Y + 0.16, 0.18);
  scene.add(volMesh);

  const bound = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.28 })
  );
  bound.scale.copy(VOL_SIZE);
  bound.position.copy(volMesh.position);
  scene.add(bound);

  const teachMat = volMat.clone();
  teachMat.uniforms.uTex.value = tex;
  teachMat.uniforms.uCam = { value: new THREE.Vector3() };
  teachMat.uniforms.uInv = { value: new THREE.Matrix4() };
  const teach = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), teachMat);
  teach.scale.copy(VOL_SIZE).multiplyScalar(1.75);
  teach.position.set(-0.92, TABLE_Y + 0.32, 0.05);
  teach.visible = false;
  scene.add(teach);
  const teachLabel = makeLabel('Teaching copy (enlarged, synthetic)', 0.62);
  teachLabel.position.set(-0.92, TABLE_Y + 0.62, 0.05);
  teachLabel.visible = false;
  scene.add(teachLabel);

  const slicePlanes = {};
  const planeMat = () => new THREE.MeshBasicMaterial({
    map: null, transparent: true, opacity: 0.78, side: THREE.DoubleSide, toneMapped: false
  });
  ['axial', 'coronal', 'sagittal'].forEach(axis => {
    const c = document.createElement('canvas');
    c.width = N;
    c.height = N;
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.minFilter = THREE.NearestFilter;
    map.magFilter = THREE.NearestFilter;
    const mat = planeMat();
    mat.map = map;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    volMesh.add(mesh);
    slicePlanes[axis] = { mesh, canvas: c, ctx: c.getContext('2d'), map };
  });
  slicePlanes.axial.mesh.rotation.set(0, 0, 0);
  slicePlanes.coronal.mesh.rotation.set(-Math.PI / 2, 0, 0);
  slicePlanes.sagittal.mesh.rotation.set(0, Math.PI / 2, 0);

  const hologram = makeHologram();
  hologram.position.set(0.48, 0, -0.42);
  scene.add(hologram);
  const holoLabel = makeLabel('ASTRAL live hologram (simulated)', 0.72);
  holoLabel.position.set(0.48, 1.82, -0.42);
  scene.add(holoLabel);

  let preset = 'brain';
  let mode = 'orbit';
  let specCam = 'overhead';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const inv = new THREE.Matrix4();
  const specPos = {
    overhead: new THREE.Vector3(0.02, 1.72, 0.18),
    surgeon: new THREE.Vector3(0.04, 1.22, 0.62),
    side: new THREE.Vector3(0.58, 1.2, 0.18)
  };
  const specLook = new THREE.Vector3(0, 1.06, 0.16);
  let lerpFrom = camera.position.clone();
  let lerpTo = camera.position.clone();
  let lerpT = 1;

  const setPressed = (btn, on) => btn.setAttribute('aria-pressed', on ? 'true' : 'false');

  function showSpectatorChips(on) {
    ohBtn.hidden = !on;
    surgBtn.hidden = !on;
    sideBtn.hidden = !on;
  }

  function goSpectator(which) {
    specCam = which;
    mode = 'spectator';
    orbit.setEnabled(false);
    setPressed(orbitBtn, false);
    setPressed(specBtn, true);
    setPressed(ohBtn, which === 'overhead');
    setPressed(surgBtn, which === 'surgeon');
    setPressed(sideBtn, which === 'side');
    showSpectatorChips(true);
    lerpFrom.copy(camera.position);
    lerpTo.copy(specPos[which]);
    lerpT = 0;
  }

  function goOrbit() {
    mode = 'orbit';
    orbit.setEnabled(true);
    setPressed(orbitBtn, true);
    setPressed(specBtn, false);
    setPressed(ohBtn, false);
    setPressed(surgBtn, false);
    setPressed(sideBtn, false);
    showSpectatorChips(false);
    camera.position.set(0.52, 1.34, 0.7);
    orbit.look.copy(target);
    orbit.setFromCamera();
    orbit.apply();
  }

  orbitBtn.addEventListener('click', goOrbit);
  specBtn.addEventListener('click', () => goSpectator(specCam));
  ohBtn.addEventListener('click', () => goSpectator('overhead'));
  surgBtn.addEventListener('click', () => goSpectator('surgeon'));
  sideBtn.addEventListener('click', () => goSpectator('side'));

  function applyPreset(name) {
    preset = name;
    const p = PRESETS[name];
    volMat.uniforms.uMin.value = p.min;
    volMat.uniforms.uMax.value = p.max;
    volMat.uniforms.uOpacity.value = p.opacity;
    volMat.uniforms.uPreset.value = name === 'bone' ? 1 : 0;
    teachMat.uniforms.uMin.value = p.min;
    teachMat.uniforms.uMax.value = p.max;
    teachMat.uniforms.uOpacity.value = p.opacity;
    teachMat.uniforms.uPreset.value = name === 'bone' ? 1 : 0;
    setPressed(brainBtn, name === 'brain');
    setPressed(boneBtn, name === 'bone');
    slices.forEach(updateSlice);
  }
  brainBtn.addEventListener('click', () => applyPreset('brain'));
  boneBtn.addEventListener('click', () => applyPreset('bone'));
  teachBtn.addEventListener('click', () => {
    const on = teachBtn.getAttribute('aria-pressed') !== 'true';
    teach.visible = on;
    teachLabel.visible = on;
    setPressed(teachBtn, on);
  });

  function updateSlice(s) {
    const index = parseInt(s.slider.value, 10);
    s.val.textContent = String(index);
    drawSlice(s.ctx, volumeData, s.axis, index, preset);
    const t = index / (N - 1) - 0.5;
    const plane = slicePlanes[s.axis];
    drawSlice(plane.ctx, volumeData, s.axis, index, preset);
    plane.map.needsUpdate = true;
    if (s.axis === 'axial') plane.mesh.position.set(0, 0, t);
    if (s.axis === 'coronal') plane.mesh.position.set(0, t, 0);
    if (s.axis === 'sagittal') plane.mesh.position.set(t, 0, 0);
  }
  slices.forEach(s => {
    s.slider.addEventListener('input', () => updateSlice(s));
    updateSlice(s);
  });

  if (navigator.xr && navigator.xr.isSessionSupported) {
    Promise.all([
      navigator.xr.isSessionSupported('immersive-ar').catch(() => false),
      navigator.xr.isSessionSupported('immersive-vr').catch(() => false)
    ]).then(([ar, vr]) => {
      if (!ar && !vr) return;
      xrBtn.hidden = false;
      xrBtn.dataset.mode = ar ? 'immersive-ar' : 'immersive-vr';
    });
  }
  xrBtn.addEventListener('click', async () => {
    if (renderer.xr.isPresenting) {
      const session = renderer.xr.getSession();
      if (session) session.end();
      return;
    }
    const mode = xrBtn.dataset.mode || 'immersive-vr';
    try {
      const session = await navigator.xr.requestSession(mode, {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
      });
      renderer.xr.setReferenceSpaceType('local-floor');
      await renderer.xr.setSession(session);
      xrBtn.textContent = 'Exit VR/AR';
      session.addEventListener('end', () => { xrBtn.textContent = 'Enter VR/AR'; });
    } catch (err) {
      xrBtn.textContent = 'VR/AR unavailable';
    }
  });

  function resize() {
    const w = Math.max(1, stage.clientWidth);
    const h = Math.max(1, canvas.clientHeight || stage.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  const tmpColor = hologram.geometry.attributes.color;
  const bases = hologram.userData.bases;
  const pos = hologram.geometry.attributes.position;

  function tick(t) {
    const time = (t || 0) * 0.001;
    if (mode === 'spectator' && lerpT < 1) {
      lerpT = Math.min(1, lerpT + 0.045);
      const e = 1 - Math.pow(1 - lerpT, 3);
      camera.position.lerpVectors(lerpFrom, lerpTo, e);
      camera.lookAt(specLook);
    }
    volMesh.updateMatrixWorld();
    teach.updateMatrixWorld();
    inv.copy(volMesh.matrixWorld).invert();
    volMat.uniforms.uInv.value.copy(inv);
    volMat.uniforms.uCam.value.copy(camera.position);
    inv.copy(teach.matrixWorld).invert();
    teachMat.uniforms.uInv.value.copy(inv);
    teachMat.uniforms.uCam.value.copy(camera.position);

    if (!reduceMotion) {
      hologram.rotation.y = Math.sin(time * 0.35) * 0.12;
      for (let i = 0; i < pos.count; i++) {
        const b = i * 3;
        const wobble = Math.sin(time * 2.1 + bases[b] * 12 + bases[b + 1] * 8) * 0.008;
        pos.array[b] = bases[b] + wobble;
        pos.array[b + 1] = bases[b + 1] + Math.sin(time * 1.4 + i * 0.05) * 0.012;
        pos.array[b + 2] = bases[b + 2] + Math.cos(time * 1.7 + bases[b + 1] * 6) * 0.006;
      }
      pos.needsUpdate = true;
      tmpColor.needsUpdate = false;
    }
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(tick);
}

const root = document.getElementById('conference-demo');
if (root) {
  try {
    mountDemo(root);
  } catch (err) {
    root.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'demo-fallback';
    p.textContent = 'The synthetic demo could not start in this browser.';
    root.appendChild(p);
  }
}
