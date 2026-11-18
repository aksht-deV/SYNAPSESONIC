"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ChevronUp, Hand, Power } from "lucide-react";
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import { handPointer, type GestureActions } from "./hand-pointer";
import "./camera-control.css";
const wasm =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
export function CameraControl(
  props: GestureActions & { onActive: (v: boolean) => void },
) {
  const [open, setOpen] = useState(false),
    [phase, setPhase] = useState<"off" | "loading" | "live">("off"),
    [hint, setHint] = useState("Camera offline"),
    [message, setMessage] = useState("");
  const video = useRef<HTMLVideoElement>(null),
    overlay = useRef<HTMLCanvasElement>(null),
    generation = useRef(0),
    cleanup = useRef(() => {}),
    actions = useRef(props);
  useEffect(() => {
    actions.current = props;
  }, [props]);
  function stop() {
    generation.current++;
    cleanup.current();
    cleanup.current = () => {};
    setPhase("off");
    setHint("Camera offline");
    actions.current.onActive(false);
  }
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      generation.current++;
      cleanup.current();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  async function start() {
    stop();
    const token = generation.current,
      valid = () => generation.current === token,
      el = video.current!,
      layer = overlay.current!;
    let model: HandLandmarker | undefined,
      stream: MediaStream | undefined,
      raf = 0;
    setPhase("loading");
    setMessage("");
    setHint("Starting camera…");
    cleanup.current = () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      el.pause();
      el.srcObject = null;
      model?.close();
    };
    const fail = (text: string) => {
      if (valid()) {
        stop();
        setMessage(text);
      }
    };
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error();
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      if (!valid()) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      stream
        .getVideoTracks()[0]
        .addEventListener(
          "ended",
          () => fail("Camera disconnected. Use the simulator or reconnect."),
          { once: true },
        );
      el.srcObject = stream;
      await el.play();
      if (!valid()) return;
      const { FilesetResolver, HandLandmarker } = await import(
        "@mediapipe/tasks-vision"
      );
      const files = await FilesetResolver.forVisionTasks(wasm);
      if (!valid()) return;
      model = await HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: "/hand_landmarker.task" },
        runningMode: "VIDEO",
        numHands: 1,
      });
      if (!valid()) {
        model.close();
        return;
      }
      layer.width = el.videoWidth;
      layer.height = el.videoHeight;
      const frame = handPointer(layer, () => actions.current, setHint);
      setPhase("live");
      actions.current.onActive(true);
      let last = 0,
        prev = -1;
      function detect(now: number) {
        if (!valid()) return;
        try {
          if (
            el.readyState >= 2 &&
            now - last > 70 &&
            prev !== el.currentTime
          ) {
            prev = el.currentTime;
            last = now;
            frame(
              model!.detectForVideo(el, now).landmarks?.[0],
              now,
              layer.width / layer.height,
            );
          }
          raf = requestAnimationFrame(detect);
        } catch {
          fail("Tracking interrupted. Retry or use the simulator.");
        }
      }
      raf = requestAnimationFrame(detect);
    } catch {
      fail("Camera unavailable. Check permission or use the simulator.");
    }
  }
  return (
    <aside className="cam-dock">
      <button
        className="cam-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Camera size={16} />
        <span>Hand controls</span>
        <ChevronUp size={13} />
      </button>
      <section className="cam-guide" hidden={!open} aria-label="Spatial input">
        <small>
          SPATIAL INPUT <b>/ 01</b>
        </small>
        <div className="cam-feed">
          <video
            muted
            playsInline
            ref={video}
            aria-label="Local webcam preview"
          />
          <canvas ref={overlay} hidden={phase !== "live"} aria-hidden="true" />
          {phase !== "live" && <Hand size={27} />}
          <span>{hint}</span>
        </div>
        <button className="cam-action" onClick={phase === "off" ? start : stop}>
          <Power size={12} />
          {phase === "off"
            ? "Enable camera"
            : phase === "loading"
              ? "Cancel"
              : "Stop camera"}
        </button>
        {message && <p role="status">{message}</p>}
        <div className="sim">
          <small>GESTURE SIMULATOR</small>
          <p>Palm orbits. Pinch selects. Hold 1–4 to answer.</p>
          <div>
            {["Palm", "Pinch", "A", "B", "C", "D"].map((s, i) => (
              <button
                key={s}
                aria-label={`Simulate ${s}`}
                onClick={() => {
                  if (i === 0) props.orbit(35, 5);
                  else if (i === 1) props.pinch();
                  else props.answer(i - 2);
                  setHint(`Simulated · ${s}`);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>
    </aside>
  );
}
