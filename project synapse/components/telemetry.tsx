"use client";
import { useState, useEffect } from "react";
import { Activity, ChevronDown } from "lucide-react";
export function Telemetry({
  values,
  active,
}: {
  values: number[];
  active: boolean;
}) {
  const [open, setOpen] = useState(true),
    [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    let id = 0,
      n = 0,
      last = performance.now();
    function frame(now: number) {
      n++;
      if (now - last >= 1000) {
        setFps(Math.round((n * 1000) / (now - last)));
        n = 0;
        last = now;
      }
      id = requestAnimationFrame(frame);
    }
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, []);
  const retention = Math.round(
    values.reduce((a, b) => a + b, 0) / Math.max(1, values.length),
  );
  return (
    <section className="telemetry glass">
      <button
        className="tele-head"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <Activity size={16} />
        <strong>Telemetry</strong>
        <span className="live">
          <i className="dot" />
          LIVE
        </span>
        <ChevronDown
          size={14}
          style={{ transform: open ? "none" : "rotate(180deg)" }}
        />
      </button>
      {open && (
        <div className="metrics">
          {[
            {
              name: "Frame rate",
              value: fps,
              unit: "FPS",
              pct: Math.min((fps ?? 0) / 75, 1),
              hint: "Measured animation frames per second",
            },
            {
              name: "Memory retention",
              value: retention,
              unit: "%",
              pct: retention / 100,
              hint: "Session retention estimate based on elapsed time and Time-Decay",
            },
          ].map((m) => (
            <div key={m.name} title={m.hint}>
              <span>{m.name}</span>
              <div className="metric-value">
                {m.value ?? "—"}
                <small>{m.unit}</small>
              </div>
              <div className="meter" aria-hidden="true">
                {Array.from({ length: 20 }, (_, i) => (
                  <i
                    key={i}
                    style={{
                      background:
                        i < Math.round(m.pct * 20) ? "var(--lime)" : "#323436",
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
          <footer className="tele-detail">
            <span>
              Mastered{" "}
              <b>
                {values.filter((v) => v >= 90).length}/{values.length}
              </b>
            </span>
            <span>
              <i className={active ? "dot" : "idle-dot"} /> Camera{" "}
              {active ? "active" : "off"}
            </span>
          </footer>
        </div>
      )}
    </section>
  );
}
