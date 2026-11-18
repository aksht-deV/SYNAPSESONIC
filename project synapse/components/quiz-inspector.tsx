"use client";
import { useEffect } from "react";
import type { Recall } from "./use-recall";
import { ScanLine, X, Timer, Keyboard, ArrowRight, Check } from "lucide-react";
export function QuizInspector({
  recall: r,
  blocked,
}: {
  recall: Recall;
  blocked: boolean;
}) {
  const quiz = r.node?.quiz,
    answers = quiz?.options ?? [];
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        blocked ||
        e.repeat ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.target instanceof HTMLInputElement
      )
        return;
      if (e.key === "Escape") r.close();
      else if (/^[1-4]$/.test(e.key)) r.answer(+e.key - 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [r, blocked]);
  if (!quiz || !answers.length) return null;
  return (
    <aside className="inspector glass" aria-label="30-Second Quiz Inspector">
      <div className="ins-head">
        <div className="flex justify-between items-center">
          <span className="eyebrow flex items-center gap-2">
            <ScanLine size={14} /> RECALL MODULE
          </span>
          <button
            className="close"
            aria-label="Close quiz inspector"
            onClick={r.close}
          >
            <X size={15} />
          </button>
        </div>
        <h2>30-Second Quiz Inspector</h2>
      </div>
      <div className="ins-body">
        <div className="flex items-center justify-between">
          <span className="eyebrow">
            NODE {String(r.q + 1).padStart(2, "0")} / {r.node.title}
          </span>
          <span className="timer">
            <Timer size={12} />
            00:{String(r.time).padStart(2, "0")}
          </span>
        </div>
        <div
          className="time-track"
          role="progressbar"
          aria-label="Time remaining"
          aria-valuenow={r.time}
          aria-valuemax={30}
        >
          <i style={{ width: `${(r.time / 30) * 100}%` }} />
        </div>
        <h3>{quiz.question}</h3>
        <div className="flex flex-col gap-2">
          {answers.map((v, i) => (
            <button
              key={i}
              className={
                "answer " +
                (r.done && i === quiz.correctIndex ? "chosen" : "") +
                (r.done && r.selected === i && i !== quiz.correctIndex
                  ? " missed"
                  : "")
              }
              disabled={r.done}
              onClick={() => r.answer(i)}
            >
              <span>{String.fromCharCode(65 + i)}</span>
              {v}
              {r.done && i === quiz.correctIndex && (
                <Check size={14} className="ml-auto" />
              )}
            </button>
          ))}
        </div>
        {r.done && (
          <p className="feedback" role="status">
            <b>
              {r.selected === quiz.correctIndex
                ? "Correct."
                : r.selected === -1
                  ? "Time expired."
                  : "Needs review."}
            </b>{" "}
            {quiz.explanation}
          </p>
        )}
      </div>
      <div className="ins-foot">
        {r.done ? (
          <button onClick={r.next}>
            Next weakest node <ArrowRight size={14} />
          </button>
        ) : (
          <>
            <Keyboard size={14} />
            Press 1–4 to answer
          </>
        )}
        <span className="ml-auto">Streak {r.streak}</span>
      </div>
    </aside>
  );
}
