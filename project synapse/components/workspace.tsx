"use client";
import { useRef, useState } from "react";
import {
  AudioLines,
  Layers3,
  Sprout,
  Hand,
  Upload,
  Timer,
  ArrowUpRight,
  Crosshair,
  Box,
} from "lucide-react";
import { QuizInspector } from "./quiz-inspector";
import { useRecall } from "./use-recall";
import { NeuralSpace } from "./neural-space";
import { Telemetry } from "./telemetry";
import { CameraControl } from "./camera-control";
import { DeckImport } from "./deck-import";
import { useSynth } from "./use-synth";
const modes = [
  { name: "Unified", Icon: Layers3 },
  { name: "Study Terrarium", Icon: Sprout },
  { name: "Gesture Synth", Icon: Hand },
];
export default function Workspace() {
  const [mode, setMode] = useState(0),
    [importing, setImporting] = useState(false),
    [active, setActive] = useState(false),
    r = useRecall(importing),
    synth = useSynth(),
    view = useRef({ yaw: 0, pitch: 0 });
  function pinch(x?: number, y?: number) {
    if (importing) return;
    const pins = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-node]"),
    );
    if (!pins.length) return;
    let i = r.q;
    if (x !== undefined && y !== undefined) {
      let best = Infinity;
      for (const pin of pins) {
        const b = pin.getBoundingClientRect(),
          d = Math.hypot(
            x * innerWidth - b.left - b.width / 2,
            y * innerHeight - b.top - b.height / 2,
          );
        if (d < best) {
          best = d;
          i = Number(pin.dataset.node);
        }
      }
    }
    r.focusNode(i);
  }
  return (
    <main className="studio">
      <div className="floor" aria-hidden="true">
        <div />
      </div>
      <header className="topbar glass">
        <h1 className="brand flex items-center gap-3">
          <span className="brand-mark">
            <AudioLines size={23} strokeWidth={2.7} />
          </span>
          SynapseSonic
        </h1>
        <nav aria-label="Workspace mode" className="mode-nav">
          {modes.map(({ name, Icon }, i) => (
            <button
              key={name}
              aria-pressed={mode === i}
              onClick={() => {
                if (mode !== i) {
                  if (i === 2) void synth.start();
                  else synth.stop();
                  setMode(i);
                }
              }}
            >
              <Icon size={16} />
              {name}
            </button>
          ))}
        </nav>
        <div className="decay">
          <label
            htmlFor="decay"
            className="flex items-center justify-between gap-3"
          >
            <span className="flex items-center gap-1.5">
              <Timer size={13} />
              Time-Decay
            </span>
            <output htmlFor="decay">{r.day}d</output>
          </label>
          <input
            id="decay"
            type="range"
            min="0"
            max="60"
            value={r.day}
            style={{
              background: `linear-gradient(to right,var(--lime) ${(r.day / 60) * 100}%,#37383a 0)`,
            }}
            onChange={(e) => r.setDay(+e.target.value)}
          />
        </div>
        <button className="upload" onClick={() => setImporting(true)}>
          <Upload size={15} />
          Upload PDF
        </button>
      </header>
      <div className={"workbody " + (r.panel ? "quiz-open" : "")}>
        <section className="context">
          <span className="eyebrow flex items-center gap-2">
            <i className="dot" />
            WORKSPACE ONLINE
          </span>
          <h2>{modes[mode].name} workspace</h2>
          <span className="context-sub flex items-center gap-2">
            <Box size={14} />
            {r.deck.name}
            <span className="slash">/</span>
            {r.nodes.length} nodes
          </span>
          <p className="field-instruction">
            {mode === 2
              ? "Move your hand or cursor to shape the sound."
              : "Orbit the field. Select a node to test recall."}
          </p>
          {mode === 2 && synth.error && <p role="status">{synth.error}</p>}
        </section>
        <NeuralSpace
          recall={r}
          mode={mode}
          view={view}
          aim={synth.aim}
          level={synth.level}
        />
        {r.panel ? (
          <QuizInspector recall={r} blocked={importing} />
        ) : (
          <button className="reopen glass" onClick={r.next}>
            <Crosshair size={15} />
            Start recall
            <ArrowUpRight size={13} />
          </button>
        )}
        <Telemetry values={r.values} active={active} />
        <CameraControl
          orbit={(x, y) => {
            if (!importing) {
              view.current.yaw += x * 0.008;
              view.current.pitch = Math.max(
                -1.3,
                Math.min(1.3, view.current.pitch + y * 0.008),
              );
            }
          }}
          aim={synth.aim}
          pinch={pinch}
          answer={r.answer}
          onActive={setActive}
        />
      </div>
      <footer className="statusbar flex items-center justify-between">
        <span className="flex items-center gap-2">
          <i className="dot" />
          System operational
        </span>
        <span>
          SYNAPSESONIC <b>/</b> ENGINE V1.0
        </span>
      </footer>
      {importing && (
        <DeckImport load={r.load} close={() => setImporting(false)} />
      )}
    </main>
  );
}
