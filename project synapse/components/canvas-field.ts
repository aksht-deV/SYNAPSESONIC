import * as T from "three";
// Project the same scene graph when camera permissions, GPU policy, or a driver disables WebGL.
export function canvasField(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  let w = 1,
    h = 1,
    dpr = 1;
  const vp = new T.Matrix4(),
    m = new T.Matrix4(),
    p = new T.Vector3();
  return {
    setPixelRatio(v: number) {
      dpr = v;
    },
    setSize(x: number, y: number, _style: boolean) {
      w = x;
      h = y;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    },
    dispose() {},
    render(scene: T.Scene, camera: T.OrthographicCamera) {
      if (!ctx) return;
      const g = ctx;
      scene.updateMatrixWorld();
      camera.updateMatrixWorld();
      vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      scene.traverse((o) => {
        if (
          !(o instanceof T.Line || o instanceof T.Points || o instanceof T.Mesh)
        )
          return;
        m.multiplyMatrices(vp, o.matrixWorld);
        const geom = o.geometry,
          attr = geom.attributes.position,
          mat = o.material;
        if (Array.isArray(mat)) return;
        g.globalAlpha = mat.opacity;
        if (mat instanceof T.ShaderMaterial) {
          p.set(0, 0, 0).applyMatrix4(m);
          const x = ((p.x + 1) * w) / 2,
            y = ((1 - p.y) * h) / 2;
          p.set(geom.parameters.width / 2, 0, 0).applyMatrix4(m);
          const radius = Math.max(1, Math.abs(((p.x + 1) * w) / 2 - x));
          const grad = g.createRadialGradient(x, y, 0, x, y, radius),
            color = mat.uniforms.tint.value.getHexString();
          grad.addColorStop(0, "#" + color + "bb");
          grad.addColorStop(0.32, "#" + color + "38");
          grad.addColorStop(1, "#" + color + "00");
          g.fillStyle = grad;
          g.fillRect(x - radius, y - radius, 2 * radius, 2 * radius);
          return;
        }
        g.fillStyle = g.strokeStyle = "#" + mat.color.getHexString();
        g.lineWidth = 0.72;
        g.beginPath();
        const index = geom.index,
          n = index?.count ?? attr.count;
        for (let i = 0; i < n; i++) {
          p.fromBufferAttribute(attr, index ? index.getX(i) : i).applyMatrix4(
            m,
          );
          const x = ((p.x + 1) * w) / 2,
            y = ((1 - p.y) * h) / 2;
          if (o instanceof T.Points) {
            const size = Math.max(
              0.7,
              (mat.size * h) / (camera.top - camera.bottom),
            );
            g.rect(x, y, size, size);
          } else if (!i || (o instanceof T.LineSegments && i % 2 === 0))
            g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        if (o instanceof T.Points) g.fill();
        else g.stroke();
      });
      g.globalAlpha = 1;
    },
  };
}
