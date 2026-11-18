import * as T from "three";
import { canvasField } from "./canvas-field";
import type { RefObject } from "react";
import type { Recall } from "./use-recall";
type Config = {
  recall: Recall;
  mode: number;
  paused: boolean;
  zoom: number;
  level: () => number;
};
const TAU = Math.PI * 2,
  lime = 0xc6f432;
function rng(seed: number) {
  return () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}
function dispose(root: T.Object3D) {
  root.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.Line || o instanceof T.Points) {
      o.geometry.dispose();
      for (const mat of [o.material].flat()) mat.dispose();
    }
  });
}
function line(points: T.Vector3[], color: number, opacity: number) {
  return new T.Line(
    new T.BufferGeometry().setFromPoints(points),
    new T.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
}
function halo(size: number) {
  const mat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    uniforms: { tint: { value: new T.Color(lime) } },
    vertexShader:
      "varying vec2 coord; void main(){coord=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:
      "varying vec2 coord; uniform vec3 tint; void main(){float r=length(coord-.5)*2.;gl_FragColor=vec4(tint,pow(max(0.,1.-r),3.)*.8);}",
  });
  return new T.Mesh(new T.PlaneGeometry(size, size), mat);
}
export function mountField(
  canvas: HTMLCanvasElement,
  pins: HTMLDivElement,
  config: RefObject<Config>,
  view: RefObject<{ yaw: number; pitch: number }>,
  fallback: () => void,
) {
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: true });
  if (!gl && !canvas.getContext("2d")) {
    fallback();
    return;
  }
  const renderer = gl
    ? new T.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: true })
    : canvasField(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new T.Scene(),
    camera = new T.OrthographicCamera(-4, 4, 2.5, -2.5, 0.1, 50);
  camera.position.z = 10;
  camera.updateMatrixWorld();
  let field = new T.Group(),
    network = new T.Group(),
    hubs: T.Group[] = [],
    centers: T.Vector3[] = [],
    deckKey = "",
    id = 0,
    w = 1,
    h = 1,
    t = 0,
    last = performance.now(),
    stamp = 0,
    answeredAt = -10000;
  const pos = new T.Vector3(),
    inv = new T.Quaternion();
  scene.add(field);
  field.add(network);
  function rebuild(key: string) {
    scene.remove(field);
    dispose(field);
    field = new T.Group();
    network = new T.Group();
    field.add(network);
    scene.add(field);
    hubs = [];
    centers = [];
    let seed = 1357;
    for (const c of key) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const rand = rng(seed),
      nodes = config.current.recall.nodes,
      n = nodes.length;
    const dust: T.Vector3[] = [],
      stars: T.Vector3[] = [];
    for (let i = 0; i < 1150; i++)
      stars.push(
        new T.Vector3(
          (rand() - 0.5) * 18,
          (rand() - 0.5) * 11,
          -2 - rand() * 5,
        ),
      );
    field.add(
      new T.Points(
        new T.BufferGeometry().setFromPoints(stars),
        new T.PointsMaterial({
          color: 0xadb4a9,
          size: 0.009,
          transparent: true,
          opacity: 0.64,
        }),
      ),
    );
    function nucleus(radius: number, index: number) {
      const g = new T.Group(),
        geo = new T.IcosahedronGeometry(radius, 2),
        wire = new T.LineSegments(
          new T.WireframeGeometry(geo),
          new T.LineBasicMaterial({
            color: index < 0 ? lime : 0xbcc79e,
            transparent: true,
            opacity: 0.48,
          }),
        );
      geo.dispose();
      g.add(wire);
      const glow = halo(radius * 5.8);
      g.add(glow);
      g.userData.glow = glow;
      return g;
    }
    const core = nucleus(0.41, -1);
    network.add(core);
    network.userData.core = core;
    nodes.forEach((_, i) => {
      const a = (TAU * i) / n - 0.28,
        r = 1 + (i % 3) * 0.09,
        c = new T.Vector3(
          Math.cos(a) * 2.55 * r,
          Math.sin(a) * 1.22 * r,
          (rand() - 0.5) * 0.95,
        );
      centers.push(c);
      const hub = nucleus(0.115 + rand() * 0.05, i);
      hub.position.copy(c);
      hubs.push(hub);
      network.add(hub);
      for (let j = 0; j < 14; j++) {
        const pts: T.Vector3[] = [],
          bend = (rand() - 0.5) * 0.8;
        for (let k = 0; k <= 22; k++) {
          const u = k / 22,
            s = Math.sin(Math.PI * u),
            spread = s * (0.05 + rand() * 0.11);
          const v = c.clone().multiplyScalar(u);
          v.x += s * bend * 0.45 + (rand() - 0.5) * spread;
          v.y += s * bend + (rand() - 0.5) * spread;
          v.z += s * (rand() - 0.5) * 0.42;
          pts.push(v);
          if (rand() > 0.35)
            dust.push(
              v
                .clone()
                .add(
                  new T.Vector3(
                    (rand() - 0.5) * 0.17,
                    (rand() - 0.5) * 0.17,
                    (rand() - 0.5) * 0.2,
                  ),
                ),
            );
        }
        network.add(line(pts, j % 3 ? 0xc8cca6 : lime, 0.16 + rand() * 0.22));
      }
    });
    centers.forEach((v, i) => {
      const next = centers[(i + 1) % n];
      network.add(line([v, next], 0xa8b58c, 0.25));
      if (i % 2 === 0)
        network.add(line([v, centers[(i + 2) % n]], 0xa8b58c, 0.16));
    });
    for (let i = 0; i < 800; i++) {
      const a = rand() * TAU,
        b = Math.acos(2 * rand() - 1),
        r = 0.38 + rand() ** 2 * 0.6;
      dust.push(
        new T.Vector3(
          r * Math.sin(b) * Math.cos(a),
          r * Math.sin(b) * Math.sin(a),
          r * Math.cos(b),
        ),
      );
    }
    network.add(
      new T.Points(
        new T.BufferGeometry().setFromPoints(dust),
        new T.PointsMaterial({
          size: 0.014,
          color: 0xe0efaf,
          transparent: true,
          opacity: 0.72,
        }),
      ),
    );
    for (let i = 0; i < 3; i++) {
      const pts = Array.from(
        { length: 161 },
        (_, j) =>
          new T.Vector3(
            Math.cos((j / 160) * TAU) * (3 + i * 0.14),
            Math.sin((j / 160) * TAU) * (1.42 + i * 0.08),
            0,
          ),
      );
      const orbit = line(pts, 0x8a937b, 0.14);
      orbit.rotation.set(0.3 * i, 0.12 * i, (i - 1) * 0.2);
      network.add(orbit);
    }
  }
  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const half = Math.max(1.95, (3.9 * h) / w);
    camera.left = (-half * w) / h;
    camera.right = -camera.left;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  function frame(now: number) {
    id = requestAnimationFrame(frame);
    const { recall: r, paused, zoom, mode, level } = config.current,
      dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (document.hidden || !w || !h) return;
    if (!paused) t += dt;
    const key = r.nodes.map((n) => n.id + n.title).join("|");
    if (key !== deckKey) {
      deckKey = key;
      rebuild(key);
    }
    if (!hubs.length) return;
    const audio = mode === 2 ? level() : 0;
    network.scale.setScalar(zoom * (1 + audio * 0.085));
    network.rotation.set(
      view.current.pitch + Math.sin(t * 0.13) * 0.06,
      view.current.yaw + Math.sin(t * 0.09) * 0.19,
      -0.075,
    );
    const core = network.userData.core as T.Group;
    core.rotation.y = t * 0.07;
    core.scale.setScalar(1 + audio * 0.45);
    const event = r.node?.lastReviewed ?? 0;
    if (event !== stamp) {
      stamp = event;
      answeredAt = event ? now : -10000;
    }
    const age = (now - answeredAt) / 1000,
      pulse = r.done ? Math.max(0, 1 - age / 1.25) : 0,
      correct = r.selected === r.node?.quiz?.correctIndex;
    network.updateMatrixWorld(true);
    hubs.forEach((hub, i) => {
      const value = (r.values[i] ?? 0) / 100,
        p = i === r.q ? pulse : 0;
      hub.scale.setScalar(0.45 + 0.72 * value + (correct ? p * 0.95 : 0));
      hub.position.x =
        centers[i].x + (!correct ? Math.sin(age * 55) * p * 0.09 : 0);
      const selected = r.panel && i === r.q,
        tint = p && !correct ? 0xff7474 : selected || p ? lime : 0xd8dec5;
      const wire = hub.children[0] as T.LineSegments<
        T.BufferGeometry,
        T.LineBasicMaterial
      >;
      wire.material.color.setHex(tint);
      wire.material.opacity = 0.12 + 0.7 * value;
      const glow = hub.userData.glow as T.Mesh<
        T.PlaneGeometry,
        T.ShaderMaterial
      >;
      glow.material.uniforms.tint.value
        .setHex(tint)
        .multiplyScalar(0.12 + value * 0.7 + p * 1.5);
      hub.getWorldQuaternion(inv);
      glow.quaternion.copy(inv.invert());
      hub.getWorldPosition(pos).project(camera);
      const pin = pins.children[i] as HTMLElement;
      if (pin) {
        pin.style.left = `${(pos.x * 0.5 + 0.5) * 100}%`;
        pin.style.top = `${(-pos.y * 0.5 + 0.5) * 100}%`;
        pin.style.setProperty("--intensity", String(0.55 + value * 0.45));
        pin.dataset.side = pos.x < 0 ? "left" : "right";
      }
    });
    renderer.render(scene, camera);
  }
  id = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(id);
    observer.disconnect();
    dispose(scene);
    renderer.dispose();
  };
}
