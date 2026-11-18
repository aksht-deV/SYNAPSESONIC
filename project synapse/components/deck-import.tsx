"use client";
import { useRef, useEffect, useState } from "react";
import { Upload, X, ArrowUpRight, Layers3 } from "lucide-react";
import { makeDeck, samples, type Deck } from "./decks";
import "./import.css";
export function DeckImport({
  load,
  close,
}: {
  load: (d: Deck) => void;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [drag, setDrag] = useState(false);
  useEffect(() => {
    const d = dialog.current!;
    d.showModal();
    return () => {
      d.close();
      controller.current?.abort();
    };
  }, []);
  async function read(file?: File) {
    if (!file || controller.current) return;
    const job = new AbortController();
    controller.current = job;
    setBusy(true);
    setError("");
    try {
      const { pdfDeck } = await import("./pdf-deck");
      const deck = await pdfDeck(file, job.signal);
      if (!job.signal.aborted) {
        load(deck);
        close();
      }
    } catch (e) {
      if (!job.signal.aborted)
        setError(
          e instanceof Error && e.name !== "PasswordException"
            ? e.message
            : "Choose an unlocked, text-based PDF.",
        );
    } finally {
      controller.current = null;
      if (!job.signal.aborted) setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="import-dialog glass"
      aria-labelledby="import-title"
      onCancel={close}
    >
      <div className="import-head">
        <span className="eyebrow">STUDY LIBRARY / IMPORT</span>
        <button onClick={close} aria-label="Close import">
          <X size={16} />
        </button>
      </div>
      <h2 id="import-title">Import a study deck</h2>
      <p>Turn definitions in your PDF into a field of recall nodes.</p>
      <input
        ref={input}
        type="file"
        hidden
        accept="application/pdf,.pdf"
        onChange={(e) => {
          void read(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        disabled={busy}
        className={"dropzone " + (drag ? "drag" : "")}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void read(e.dataTransfer.files[0]);
        }}
      >
        <Upload size={23} />
        <strong>
          {busy ? "Extracting concepts…" : "Drop a PDF or browse files"}
        </strong>
        <small>Text-based PDF · up to 20 MB · processed on device</small>
      </button>
      {error && <p role="alert">{error}</p>}
      <h3>Load Sample Study Deck</h3>
      {["Optical Fiber & Holography", "Neural Networks"].map((name) => (
        <button
          key={name}
          className="sample-deck"
          disabled={busy}
          onClick={() => {
            load(makeDeck(name, samples[name]));
            close();
          }}
        >
          <Layers3 size={16} />
          {name}
          <ArrowUpRight size={15} />
        </button>
      ))}
    </dialog>
  );
}
