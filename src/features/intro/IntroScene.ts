/**
 * The intro, in plain Three.js. Framework-agnostic on purpose: React only mounts the
 * canvas and listens to the callbacks, so nothing here re-renders per frame.
 *
 * Sequence: warp through a deep star field → the Gryphon stars line up by
 * perspective → lines trace star to star → the thermal eye ignites → the patch
 * appears over the stars (drawn by React) → the camera dives into the eye.
 * The clock holds before the tracing until the app reports it is ready.
 */
import * as THREE from "three";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { artPlacement, EYE, finalFov, LAYOUT, placeOnRay, STROKES, uniqueStars, type Placement } from "./asterism";
import { advance, phaseAt, progressIn, TIMELINE, type IntroPhase } from "./timeline";

export interface IntroCallbacks {
  onPhase?(phase: IntroPhase): void;
  /** Where the head art lands on screen once the camera arrives. */
  onPlacement?(placement: Placement): void;
  /** 0–1 through the final dive into the eye. */
  onDive?(progress: number): void;
  /** The scene failed after starting. The intro should get out of the way. */
  onError?(error: unknown): void;
}

export interface IntroOptions {
  reducedMotion: boolean;
  callbacks: IntroCallbacks;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const outCubic = (t: number) => 1 - (1 - t) ** 3;
const outBack = (t: number) => 1 + 2.9 * (t - 1) ** 3 + 1.9 * (t - 1) ** 2;

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const STAR_VERTEX = /* glsl */ `
  attribute float aSize; attribute vec3 aColor; attribute float aPhase; attribute float aCone; attribute float aBoost;
  uniform float uTime; uniform float uPixel; uniform float uDim; uniform float uAlign; uniform float uBright;
  varying vec3 vColor; varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float depth = -mv.z;
    float twinkle = 0.78 + 0.22 * sin(uTime * 1.6 + aPhase);
    float size = aSize * (1.0 + aBoost * 1.6) * uPixel * (260.0 / max(depth, 0.001));
    gl_PointSize = clamp(size, 0.0, 64.0 * uPixel);
    float near = smoothstep(1.5, 18.0, depth);
    float cone = mix(1.0, 1.0 - 0.6 * aCone, uAlign);
    vAlpha = twinkle * near * cone * uDim * (uBright + aBoost);
    vColor = aColor;
    gl_Position = projectionMatrix * mv;
  }`;

const STAR_FRAGMENT = /* glsl */ `
  varying vec3 vColor; varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (exp(-d * d * 70.0) + exp(-d * 9.0) * 0.32) * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor * a, a);
  }`;

interface StarUniforms {
  [name: string]: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
  uPixel: THREE.IUniform<number>;
  uDim: THREE.IUniform<number>;
  uAlign: THREE.IUniform<number>;
  uBright: THREE.IUniform<number>;
}

const starUniforms = (pixel: number): StarUniforms => ({
  uTime: { value: 0 },
  uPixel: { value: pixel },
  uDim: { value: 1 },
  uAlign: { value: 0 },
  uBright: { value: 1 },
});

const starMaterial = (uniforms: StarUniforms) =>
  new THREE.ShaderMaterial({
    uniforms,
    vertexShader: STAR_VERTEX,
    fragmentShader: STAR_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

/** Stellar colours from blue-white to orange, weighted toward white. */
const PALETTE: readonly (readonly [number, number])[] = [
  [0x9bb0ff, 0.06],
  [0xaabfff, 0.12],
  [0xcad7ff, 0.18],
  [0xf8f7ff, 0.28],
  [0xfff4ea, 0.16],
  [0xffd2a1, 0.12],
  [0xffb56c, 0.08],
];

interface LineSet {
  readonly line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  readonly points: THREE.Vector3[];
}

export class IntroScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(62, 1, 0.1, 4000);
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly afterimage: AfterimagePass | null;
  private readonly field: StarUniforms;
  private readonly asterism: StarUniforms;
  private readonly boost: Float32Array;
  private readonly boostAttribute: THREE.BufferAttribute;
  private readonly reach: number[];
  private readonly lines: LineSet[] = [];
  private readonly totalSegments: number;
  private readonly eye: THREE.Sprite;
  private readonly eyePosition: THREE.Vector3;
  private readonly disposables: { dispose(): void }[] = [];
  private readonly mouse = new THREE.Vector2();
  private readonly smoothMouse = new THREE.Vector2();
  private readonly offset = new THREE.Vector3(58, -30, 0);
  private readonly look = new THREE.Vector3();
  private readonly diveFrom = new THREE.Vector3();

  private t = 0;
  private last = 0;
  private startedAt = 0;
  private ready = false;
  private skipped = false;
  private frameId = 0;
  private phase: IntroPhase | null = null;
  private disposed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly options: IntroOptions,
  ) {
    const rand = mulberry32(1817);
    const pixel = Math.min(window.devicePixelRatio || 1, 2);
    const narrow = window.innerWidth < 700;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(pixel);
    this.scene.background = new THREE.Color(0x02030a);

    this.field = starUniforms(pixel);
    this.asterism = starUniforms(pixel);

    this.buildField(rand, narrow ? 4200 : 8500);
    this.buildNebulae(rand);

    // The asterism: each star on its ray from the final camera, at a random depth.
    const stars = uniqueStars();
    const index = new Map(stars.map((star, i) => [star.key, i]));
    const depths = stars.map(() => 70 + rand() * 180);
    const positions = stars.map((star, i) => new THREE.Vector3(...placeOnRay(star.point, depths[i] ?? 120)));

    const count = stars.length;
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const color = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    this.boost = new Float32Array(count);
    positions.forEach((p, i) => {
      pos.set([p.x, p.y, p.z], i * 3);
      // Scaled by depth so on-screen size follows the design, not the distance.
      size[i] = (stars[i]?.radius ?? 2) * 1.9 * ((depths[i] ?? 120) / 120);
      color.set([0.88, 0.92, 1], i * 3);
      phase[i] = rand() * Math.PI * 2;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    geometry.setAttribute("aCone", new THREE.BufferAttribute(new Float32Array(count), 1));
    this.boostAttribute = new THREE.BufferAttribute(this.boost, 1);
    geometry.setAttribute("aBoost", this.boostAttribute);
    const material = starMaterial(this.asterism);
    this.scene.add(new THREE.Points(geometry, material));
    this.disposables.push(geometry, material);

    // Lines, and the moment each star is reached by them.
    this.totalSegments = STROKES.reduce((sum, stroke) => sum + stroke.points.length - 1, 0);
    this.reach = stars.map(() => Infinity);
    let segment = 0;
    for (const stroke of STROKES) {
      const points = stroke.points.map((p) => positions[index.get(p.join(",")) ?? 0]!.clone());
      stroke.points.forEach((p, k) => {
        const i = index.get(p.join(",")) ?? 0;
        const at = TIMELINE.alignEnd + ((segment + k) / this.totalSegments) * (TIMELINE.traceEnd - TIMELINE.alignEnd);
        this.reach[i] = Math.min(this.reach[i] ?? Infinity, at);
      });
      segment += stroke.points.length - 1;
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(points.length * 3), 3));
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x9fb8ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.scene.add(line);
      this.lines.push({ line, points });
      this.disposables.push(lineGeometry, lineMaterial);
    }

    // The thermal eye.
    this.eyePosition = new THREE.Vector3(...placeOnRay(EYE, 96));
    const flare = this.flareTexture();
    const eyeMaterial = new THREE.SpriteMaterial({
      map: flare,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    });
    this.eye = new THREE.Sprite(eyeMaterial);
    this.eye.position.copy(this.eyePosition);
    this.scene.add(this.eye);
    this.disposables.push(flare, eyeMaterial);

    // Post-processing: trails during the warp, bloom throughout.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.afterimage = options.reducedMotion ? null : new AfterimagePass(0.9);
    if (this.afterimage) {
      this.composer.addPass(this.afterimage);
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.15, 0.65, 0.12);
    this.composer.addPass(this.bloom);

    window.addEventListener("pointermove", this.onPointer);
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    this.resize();
  }

  start(): void {
    this.t = this.options.reducedMotion ? TIMELINE.logo : 0;
    this.startedAt = this.last = performance.now();
    this.frameId = requestAnimationFrame(this.frame);
  }

  /** The app is interactive: the intro may move past its hold point. */
  setReady(ready: boolean): void {
    this.ready = ready;
  }

  /** Jump to the reveal and stop waiting. */
  skip(): void {
    this.skipped = true;
    this.t = Math.max(this.t, TIMELINE.logo);
  }

  resize(): void {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.bloom.resolution.set(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.options.callbacks.onPlacement?.(artPlacement(width, height, finalFov(width / height)));
  }

  dispose(): void {
    this.disposed = true;
    this.cleanedUp ||= this.cleanup();
  }

  private cleanedUp = false;

  private cleanup(): true {
    cancelAnimationFrame(this.frameId);
    window.removeEventListener("pointermove", this.onPointer);
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.disposables.forEach((item) => item.dispose());
    this.composer.dispose();
    this.renderer.dispose();
    // Hand the GPU back to the map straight away.
    this.renderer.forceContextLoss();
    return true;
  }

  private readonly onPointer = (event: PointerEvent) => {
    this.mouse.set((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
  };

  private readonly onContextLost = () => this.fail(new Error("The WebGL context was lost."));

  private fail(error: unknown): void {
    if (this.disposed) return;
    cancelAnimationFrame(this.frameId);
    this.disposed = true;
    this.options.callbacks.onError?.(error);
  }

  private readonly frame = (now: number) => {
    if (this.disposed) {
      return;
    }
    this.frameId = requestAnimationFrame(this.frame);
    try {
      this.step(now);
    } catch (error) {
      this.fail(error);
    }
  };

  private step(now: number): void {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const waited = (now - this.startedAt) / 1000;
    this.t = advance(this.t, dt, this.ready || this.skipped, waited);
    const t = this.t;

    const phase = phaseAt(t);
    if (phase !== this.phase) {
      this.phase = phase;
      if (phase === "dive") {
        this.diveFrom.copy(this.camera.position);
      }
      this.options.callbacks.onPhase?.(phase);
    }

    this.updateCamera(t);
    this.updateStars(t, now / 1000);
    this.composer.render();
  }

  private updateCamera(t: number): void {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    const landing = finalFov(width / height);
    const u = progressIn(t, 0, TIMELINE.warpEnd);
    const v = progressIn(t, TIMELINE.warpEnd, TIMELINE.alignEnd);
    const arrive = outCubic(v);

    const z = t < TIMELINE.warpEnd ? lerp(620, 150, inOut(u)) : lerp(150, 0, arrive);
    const off = 1 - arrive;
    this.smoothMouse.lerp(this.mouse, 0.04);
    const drift = t >= TIMELINE.alignEnd && !this.options.reducedMotion ? 0.9 : 0;

    this.camera.position.set(
      this.offset.x * off + this.smoothMouse.x * drift,
      this.offset.y * off - this.smoothMouse.y * drift,
      z,
    );
    this.camera.fov = t < TIMELINE.warpEnd ? 62 + 24 * Math.sin(Math.PI * u) : lerp(62, landing, inOut(v));
    this.look.set(this.camera.position.x * 0.25, this.camera.position.y * 0.25, this.camera.position.z - 100);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.look);
    this.camera.rotateZ(t < TIMELINE.warpEnd ? 0.32 * inOut(u) : 0.32 * (1 - arrive));

    const dive = progressIn(t, TIMELINE.dive, TIMELINE.done);
    if (dive > 0) {
      if (!this.options.reducedMotion) {
        const e = dive ** 3;
        this.camera.position.copy(this.diveFrom).lerp(this.eyePosition, e * 0.985);
        this.camera.lookAt(this.eyePosition);
        this.camera.fov = lerp(landing, 22, e);
      }
      this.options.callbacks.onDive?.(dive);
    }
    this.camera.updateProjectionMatrix();
  }

  private updateStars(t: number, seconds: number): void {
    const align = inOut(progressIn(t, TIMELINE.warpEnd, TIMELINE.alignEnd));
    const fadeIn = progressIn(t, 0, 0.6);
    // Once the patch is up, the asterism steps back and lets the artwork take over.
    const handOver = 1 - progressIn(t, TIMELINE.logo, TIMELINE.logo + 0.8);

    this.field.uTime.value = seconds;
    this.field.uAlign.value = align;
    this.field.uDim.value = lerp(1, 0.55, align) * fadeIn;
    this.asterism.uTime.value = seconds;
    this.asterism.uBright.value = lerp(0.35, 1.1, align);
    this.asterism.uDim.value = fadeIn * lerp(0.15, 1, handOver);

    this.reach.forEach((at, i) => {
      const since = t - at;
      this.boost[i] = since >= 0 ? Math.exp(-since * 2.6) * 1.6 + 0.25 : 0;
    });
    this.boostAttribute.needsUpdate = true;

    this.drawLines(inOut(progressIn(t, TIMELINE.alignEnd, TIMELINE.traceEnd)), 0.55 * handOver);

    const ignite = progressIn(t, TIMELINE.eye, TIMELINE.eye + 0.9);
    const pulse = t > TIMELINE.eye + 0.9 ? 1 + 0.08 * Math.sin((t - TIMELINE.eye) * 2.4) : 1;
    const scale = (ignite > 0 ? outBack(ignite) : 0) * 15 * pulse;
    this.eye.scale.set(scale, scale, 1);
    this.eye.material.opacity = ignite;

    const damp = this.afterimage?.uniforms["damp"];
    if (damp) {
      damp.value = t < TIMELINE.warpEnd ? 0.9 : lerp(0.9, 0.25, align);
    }
    this.bloom.strength = 1.15 + 0.5 * ignite;
  }

  private drawLines(progress: number, opacity: number): void {
    const done = progress * this.totalSegments;
    let base = 0;
    for (const { line, points } of this.lines) {
      const attribute = line.geometry.getAttribute("position") as THREE.BufferAttribute;
      const n = points.length;
      const local = clamp(done - base, 0, n - 1);
      const full = Math.floor(local);
      const frac = local - full;
      const head = points[Math.min(full + 1, n - 1)]!;
      const tip = points[full]!.clone().lerp(head, frac);
      points.forEach((point, k) => {
        const p = k <= full ? point : tip;
        attribute.setXYZ(k, p.x, p.y, p.z);
      });
      attribute.needsUpdate = true;
      line.material.opacity = local > 0 ? opacity : 0;
      base += n - 1;
    }
  }

  private buildField(rand: () => number, count: number): void {
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const color = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const cone = new Float32Array(count);
    const s = LAYOUT.spread;

    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      do {
        x = (rand() * 2 - 1) * 460;
        y = (rand() * 2 - 1) * 460;
      } while (Math.abs(x) < 7 && Math.abs(y) < 7);
      const z = -900 + rand() * 1600;
      pos.set([x, y, z], i * 3);
      size[i] = 0.55 + rand() ** 7 * 5.5;
      const pick = rand();
      let acc = 0;
      const hex = PALETTE.find(([, weight]) => (acc += weight) >= pick)?.[0] ?? 0xf8f7ff;
      const c = new THREE.Color(hex);
      color.set([c.r, c.g, c.b], i * 3);
      phase[i] = rand() * Math.PI * 2;
      // Stars behind the emblem dim as it forms, so the figure reads cleanly.
      cone[i] = z < -8 && Math.abs(x / -z) < 1.5 * s && Math.abs(y / -z - 0.29 * s) < 1.4 * s ? 1 : 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    geometry.setAttribute("aCone", new THREE.BufferAttribute(cone, 1));
    geometry.setAttribute("aBoost", new THREE.BufferAttribute(new Float32Array(count), 1));
    const material = starMaterial(this.field);
    this.scene.add(new THREE.Points(geometry, material));
    this.disposables.push(geometry, material);
  }

  /** Procedural fbm clouds on far planes: indigo, teal, and a faint thermal ember. */
  private buildNebulae(rand: () => number): void {
    const clouds: readonly [number, number, number, number, number, number, number][] = [
      [11, 0x3b44c4, 1.6, -1250, 0, 0, 0.55],
      [23, 0x1a6e8f, 1.8, -1150, 260, -160, 0.4],
      [37, 0xb2401a, 2.4, -1100, -320, 140, 0.32],
    ];
    for (const [seed, tint, power, z, x, y, opacity] of clouds) {
      const texture = this.noiseTexture(seed, tint, power);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const geometry = new THREE.PlaneGeometry(2200, 1500);
      const plane = new THREE.Mesh(geometry, material);
      plane.position.set(x, y, z);
      plane.rotation.z = rand() * Math.PI;
      this.scene.add(plane);
      this.disposables.push(texture, material, geometry);
    }
  }

  private noiseTexture(seed: number, tint: number, power: number): THREE.CanvasTexture {
    const size = 256;
    const grid = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    const image = context.createImageData(size, size);
    const rand = mulberry32(seed);
    const values = Float32Array.from({ length: (grid + 1) * (grid + 1) }, () => rand());
    const at = (x: number, y: number) => values[y * (grid + 1) + x] ?? 0;
    const noise = (px: number, py: number) => {
      const xi = Math.floor(px) % grid;
      const yi = Math.floor(py) % grid;
      const xf = px - Math.floor(px);
      const yf = py - Math.floor(py);
      const u = xf * xf * (3 - 2 * xf);
      const v = yf * yf * (3 - 2 * yf);
      return lerp(lerp(at(xi, yi), at(xi + 1, yi), u), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), u), v);
    };
    const c = new THREE.Color(tint);

    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        let nx = (px / size) * 6;
        let ny = (py / size) * 6;
        let amplitude = 1;
        let sum = 0;
        let norm = 0;
        for (let octave = 0; octave < 5; octave++) {
          sum += noise(nx, ny) * amplitude;
          norm += amplitude;
          nx *= 2;
          ny *= 2;
          amplitude *= 0.5;
        }
        const f = sum / norm;
        const dx = px / size - 0.5;
        const dy = py / size - 0.5;
        const vignette = clamp(1 - Math.sqrt(dx * dx + dy * dy) * 2, 0, 1);
        const alpha = clamp((f - 0.38) * 2.2, 0, 1) ** power * vignette;
        const i = (py * size + px) * 4;
        image.data[i] = c.r * 255;
        image.data[i + 1] = c.g * 255;
        image.data[i + 2] = c.b * 255;
        image.data[i + 3] = alpha * 255;
      }
    }
    context.putImageData(image, 0, 0);
    return new THREE.CanvasTexture(canvas);
  }

  private flareTexture(): THREE.CanvasTexture {
    const size = 512;
    const half = size / 2;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const g = canvas.getContext("2d")!;
    const radial = g.createRadialGradient(half, half, 0, half, half, half);
    radial.addColorStop(0, "rgba(255,250,235,1)");
    radial.addColorStop(0.06, "rgba(255,201,60,0.95)");
    radial.addColorStop(0.18, "rgba(255,106,26,0.55)");
    radial.addColorStop(0.45, "rgba(255,80,20,0.12)");
    radial.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = radial;
    g.fillRect(0, 0, size, size);
    g.globalCompositeOperation = "lighter";
    const spike = size * 0.012;
    for (const horizontal of [true, false]) {
      const linear = horizontal
        ? g.createLinearGradient(0, half, size, half)
        : g.createLinearGradient(half, 0, half, size);
      linear.addColorStop(0, "rgba(255,120,40,0)");
      linear.addColorStop(0.5, "rgba(255,220,170,0.9)");
      linear.addColorStop(1, "rgba(255,120,40,0)");
      g.fillStyle = linear;
      if (horizontal) g.fillRect(0, half - spike / 2, size, spike);
      else g.fillRect(half - spike / 2, 0, spike, size);
    }
    return new THREE.CanvasTexture(canvas);
  }
}
