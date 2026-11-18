"use client";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Pause, Play, Scan, Orbit } from "lucide-react";
import { mountField } from "./star-renderer";
import type { Recall } from "./use-recall";
import type { RefObject } from "react";
import "./neural-space.css";
export function NeuralSpace({
  recall,
  mode,
  aim,
  level,
  view,
}: {
  recall: Recall;
  mode: number;
  aim: (x: number, y: number) => void;
  level: () => number;
  view: RefObject<{ yaw: number; pitch: number }>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    pins = useRef<HTMLDivElement>(null),
    [paused, setPaused] = useState(false),
    [zoom, setZoom] = useState(1),
    [fallback, setFallback] = useState(false),
    drag = useRef<{ x: number; y: number } | null>(null);
  const config = useRef({ recall, mode, paused, zoom, level });
  useEffect(() => {
    config.current = { recall, mode, paused, zoom, level };
  }, [recall, mode, paused, zoom, level]);
  useEffect(() => {
    setPaused(matchMedia("(prefers-reduced-motion: reduce)").matches);
    return mountField(canvas.current!, pins.current!, config, view, () =>
      setFallback(true),
    );
  }, [view]);
  return (
    <section
      className={"neural-space " + (fallback ? "no-gl" : "")}
      aria-label="Interactive neural constellation"
    >
      <canvas
        ref={canvas}
        tabIndex={0}
        aria-label="Neural field. Drag or use arrow keys to orbit."
        onPointerUp={(e) => {
          const b = e.currentTarget.getBoundingClientRect();
          if (
            Math.hypot(
              e.clientX - Number(e.currentTarget.dataset.downX),
              e.clientY - Number(e.currentTarget.dataset.downY),
            ) > 6
          )
            return;
          for (const pin of Array.from(
            pins.current?.children ?? [],
          ) as HTMLButtonElement[]) {
            const x = b.left + (b.width * parseFloat(pin.style.left)) / 100,
              y = b.top + (b.height * parseFloat(pin.style.top)) / 100;
            if (Math.hypot(e.clientX - x, e.clientY - y) < 18) {
              recall.focusNode(Number(pin.dataset.node));
              break;
            }
          }
        }}
        onPointerDown={(e) => {
          e.currentTarget.dataset.downX = String(e.clientX);
          e.currentTarget.dataset.downY = String(e.clientY);
          drag.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onPointerMove={(e) => {
          const b = e.currentTarget.getBoundingClientRect();
          aim(
            Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)),
            Math.min(1, Math.max(0, (e.clientY - b.top) / b.height)),
          );
          if (drag.current) {
            view.current.yaw += (e.clientX - drag.current.x) * 0.008;
            view.current.pitch = Math.max(
              -1.3,
              Math.min(
                1.3,
                view.current.pitch + (e.clientY - drag.current.y) * 0.008,
              ),
            );
            drag.current = { x: e.clientX, y: e.clientY };
          }
        }}
        onKeyDown={(e) => {
          if (!e.key.startsWith("Arrow")) return;
          e.preventDefault();
          if (e.key === "ArrowLeft" || e.key === "ArrowRight")
            view.current.yaw += e.key === "ArrowRight" ? 0.12 : -0.12;
          else view.current.pitch += e.key === "ArrowUp" ? -0.12 : 0.12;
        }}
      />
      <div ref={pins} className="star-pins">
        {(recall.nodes ?? []).map((n, i) => (
          <button
            key={n.id}
            data-node={i}
            aria-pressed={recall.panel && recall.q === i}
            aria-label={`Study ${n.title}`}
            onClick={() => recall.focusNode(i)}
          >
            <small>N / {String(i + 1).padStart(2, "0")}</small>
            <span>{n.title}</span>
          </button>
        ))}
      </div>
      <div className="field-tools" aria-label="Constellation controls">
        <Orbit size={14} />
        <button
          aria-label="Zoom out"
          disabled={zoom <= 0.7}
          onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
        >
          <Minus />
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Zoom in"
          disabled={zoom >= 1.6}
          onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
        >
          <Plus />
        </button>
        <button
          aria-label={paused ? "Resume motion" : "Pause motion"}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play /> : <Pause />}
        </button>
        <button
          aria-label="Reset view"
          onClick={() => {
            view.current = { yaw: 0, pitch: 0 };
            setZoom(1);
          }}
        >
          <Scan />
        </button>
      </div>
      {fallback && (
        <small className="fallback-note">
          WebGL unavailable · select a concept below
        </small>
      )}
    </section>
  );
}
