"use client";
import { useEffect, useReducer, useRef } from "react";
import { makeDeck, samples, retentionAt, type Deck } from "./decks";
const seed = () => makeDeck("Neural Networks", samples["Neural Networks"]);
function initial(deck: Deck = seed()) {
  return {
    deck,
    q: 0,
    day: 0,
    panel: false,
    time: 30,
    selected: null as number | null,
    epoch: 0,
    streak: 0,
  };
}
type State = ReturnType<typeof initial>;
type Action =
  | { type: "load"; deck: Deck }
  | {
      type: "focus" | "day" | "answer" | "tick";
      value: number;
      epoch?: number;
      now?: number;
    }
  | { type: "close" };
function reduce(s: State, a: Action): State {
  const nodes = s.deck?.nodes ?? [];
  if (a.type === "load") return { ...initial(a.deck), epoch: s.epoch + 1 };
  if (a.type === "close") return { ...s, panel: false };
  if (a.type === "day") return { ...s, day: a.value };
  if (a.type === "focus")
    return nodes[a.value]?.quiz
      ? {
          ...s,
          q: a.value,
          panel: true,
          time: 30,
          selected: null,
          epoch: s.epoch + 1,
        }
      : s;
  const node = nodes[s.q],
    quiz = node?.quiz,
    answers = quiz?.options ?? [];
  if (
    !quiz ||
    !answers.length ||
    !s.panel ||
    s.selected !== null ||
    a.epoch !== s.epoch
  )
    return s;
  if (a.type === "tick" && a.value > 0)
    return a.value === s.time ? s : { ...s, time: a.value };
  if (a.type === "answer" && (a.value < 0 || a.value >= answers.length))
    return s;
  const selected = a.type === "tick" ? -1 : a.value,
    correct = selected === quiz.correctIndex;
  return {
    ...s,
    selected,
    time: selected === -1 ? 0 : s.time,
    streak: correct ? s.streak + 1 : 0,
    deck: {
      ...s.deck,
      nodes: nodes.map((n, i) =>
        i !== s.q
          ? n
          : {
              ...n,
              retention: correct
                ? 100
                : Math.max(5, retentionAt(n, s.day) - 16),
              reviewDay: s.day,
              lastReviewed: a.now ?? null,
              needsReview: !correct,
            },
      ),
    },
  };
}
export function useRecall(paused = false) {
  const [s, dispatch] = useReducer(reduce, undefined, () => initial()),
    nodes = s.deck?.nodes ?? [],
    node = nodes[s.q],
    done = s.selected !== null,
    values = nodes.map((n) => retentionAt(n, s.day));
  const remaining = useRef(s.time);
  useEffect(() => {
    remaining.current = s.time;
  }, [s.time]);
  useEffect(() => {
    if (!s.panel || paused || done) return;
    const end = Date.now() + remaining.current * 1000;
    const id = setInterval(
      () =>
        dispatch({
          type: "tick",
          value: Math.max(0, Math.ceil((end - Date.now()) / 1000)),
          epoch: s.epoch,
          now: Date.now(),
        }),
      200,
    );
    return () => clearInterval(id);
  }, [s.panel, paused, done, s.epoch]);
  const focusNode = (value: number) => dispatch({ type: "focus", value });
  return {
    ...s,
    nodes,
    node,
    values,
    done,
    focusNode,
    answer: (value: number) => {
      if (!paused)
        dispatch({ type: "answer", value, epoch: s.epoch, now: Date.now() });
    },
    setDay: (value: number) => dispatch({ type: "day", value }),
    close: () => dispatch({ type: "close" }),
    load: (deck: Deck) => dispatch({ type: "load", deck }),
    next: () => focusNode(values.indexOf(Math.min(...values))),
  };
}
export type Recall = ReturnType<typeof useRecall>;
