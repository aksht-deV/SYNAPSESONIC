type Point = { x: number; y: number };
export type GestureActions = {
  orbit: (dx: number, dy: number) => void;
  aim: (x: number, y: number) => void;
  pinch: (x?: number, y?: number) => void;
  answer: (i: number) => void;
};
const chains = [
  [0, 1, 2, 3, 4],
  [0, 5, 6, 7, 8],
  [5, 9, 13, 17, 0],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
];
export function handPointer(
  canvas: HTMLCanvasElement,
  actions: () => GestureActions,
  status: (s: string) => void,
) {
  const ctx = canvas.getContext("2d");
  let pose = "",
    since = 0,
    fired = false,
    last: Point | null = null;
  return (points: Point[] | undefined, now: number, aspect: number) => {
    const w = canvas.width,
      h = canvas.height;
    ctx?.clearRect(0, 0, w, h);
    if (!points || points.length < 21) {
      pose = "";
      last = null;
      fired = false;
      status("Show one hand");
      return;
    }
    if (ctx) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      for (const path of chains) {
        ctx.beginPath();
        path.forEach((k, i) => {
          const p = points[k];
          if (i) ctx.lineTo(p.x * w, p.y * h);
          else ctx.moveTo(p.x * w, p.y * h);
        });
        ctx.stroke();
      }
      for (const k of [4, 8, 12, 16, 20]) {
        ctx.fillStyle = "#c6f432";
        ctx.beginPath();
        ctx.arc(points[k].x * w, points[k].y * h, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const d = (i: number, j: number) =>
        Math.hypot(
          (points[i].x - points[j].x) * aspect,
          points[i].y - points[j].y,
        ),
      width = Math.max(0.02, d(5, 17)),
      count = [8, 12, 16, 20].filter(
        (k) => d(k, 0) > d(k - 2, 0) * 1.15,
      ).length,
      thumb = d(4, 17) > width * 1.4,
      gesture =
        d(4, 8) < width * 0.28
          ? "pinch"
          : count === 4 && thumb
            ? "palm"
            : String(count),
      p = {
        x: Math.max(0, Math.min(1, 1 - points[8].x)),
        y: Math.max(0, Math.min(1, points[8].y)),
      };
    actions().aim(p.x, p.y);
    if (gesture !== pose) {
      pose = gesture;
      since = now;
      fired = false;
      last = null;
    }
    if (pose === "palm" && last)
      actions().orbit((p.x - last.x) * 500, (p.y - last.y) * 350);
    last = p;
    if (!fired && now - since > (pose === "pinch" ? 150 : 550)) {
      if (pose === "pinch") actions().pinch(p.x, p.y);
      else if (Number(pose) >= 1 && Number(pose) <= 4)
        actions().answer(Number(pose) - 1);
      fired = true;
    }
    status(
      pose === "pinch"
        ? "Pinch · select"
        : pose === "palm"
          ? "Palm · orbit"
          : count
            ? `Hold ${count} · ${String.fromCharCode(64 + count)}`
            : "Show one hand",
    );
  };
}
