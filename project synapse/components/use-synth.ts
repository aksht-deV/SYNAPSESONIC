"use client";
import { useEffect, useRef, useState } from "react";
export function useSynth() {
  const audio = useRef<{
      ctx: AudioContext;
      osc: OscillatorNode;
      filter: BiquadFilterNode;
      analyser: AnalyserNode;
      bytes: Uint8Array<ArrayBuffer>;
    } | null>(null),
    [error, setError] = useState("");
  function stop() {
    const a = audio.current;
    audio.current = null;
    if (a) {
      a.osc.stop();
      void a.ctx.close().catch(() => {});
    }
  }
  async function start() {
    stop();
    setError("");
    try {
      const ctx = new AudioContext(),
        osc = ctx.createOscillator(),
        filter = ctx.createBiquadFilter(),
        gain = ctx.createGain(),
        analyser = ctx.createAnalyser();
      osc.type = "triangle";
      osc.frequency.value = 165;
      filter.type = "lowpass";
      filter.frequency.value = 1200;
      gain.gain.value = 0.055;
      osc.connect(filter);
      filter.connect(analyser);
      analyser.connect(gain);
      gain.connect(ctx.destination);
      analyser.fftSize = 256;
      audio.current = {
        ctx,
        osc,
        filter,
        analyser,
        bytes: new Uint8Array(256),
      };
      osc.start();
      await ctx.resume();
    } catch {
      stop();
      setError(
        "Audio unavailable in this browser. The study field is still active.",
      );
    }
  }
  function aim(x: number, y: number) {
    const a = audio.current;
    if (!a) return;
    a.osc.frequency.setTargetAtTime(90 * 2 ** (3 * x), a.ctx.currentTime, 0.04);
    a.filter.frequency.setTargetAtTime(
      180 * 2 ** (5 * (1 - y)),
      a.ctx.currentTime,
      0.04,
    );
  }
  function level() {
    const a = audio.current;
    if (!a) return 0;
    a.analyser.getByteTimeDomainData(a.bytes);
    let power = 0;
    for (const v of a.bytes) power += ((v - 128) / 128) ** 2;
    return Math.sqrt(power / a.bytes.length);
  }
  useEffect(() => stop, []);
  return { start, stop, aim, level, error };
}
