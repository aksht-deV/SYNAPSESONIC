import { makeDeck } from "./decks";
function concepts(text: string) {
  const seen = new Set<string>(),
    pairs: string[][] = [];
  for (const line of text
    .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
    .replace(/\n(?=\p{Ll})/gu, " ")
    .split(/(?<=[.!?])\s+|\n+/)) {
    const sentence = line.replace(/\s+/g, " ").trim();
    if (sentence.length < 18 || sentence.length > 500) continue;
    const match = sentence.match(
      /^(.{2,70}?)(?:\s*[:–—]\s*|\s+(?:is|are|means|refers to|describes)\s+)(.{10,})$/i,
    );
    const title = (
        match?.[1] ?? sentence.split(" ").slice(0, 3).join(" ")
      ).trim(),
      summary = (match?.[2] ?? sentence.slice(title.length))
        .replace(/^[\s,:;-]+/, "")
        .trim();
    if (!summary || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    pairs.push([title, summary]);
    if (pairs.length === 12) break;
  }
  return pairs;
}
export async function pdfDeck(file: File, signal: AbortSignal) {
  if (file.size > 20 * 1024 * 1024) throw Error("Choose a PDF under 20 MB.");
  if (!(await file.slice(0, 1024).text()).includes("%PDF-"))
    throw Error("Choose a valid PDF document.");
  const pdf = await import("pdfjs-dist");
  pdf.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const bytes = await file.arrayBuffer();
  signal.throwIfAborted();
  const task = pdf.getDocument({
    data: bytes,
    useSystemFonts: true,
    isEvalSupported: false,
  } as Parameters<typeof pdf.getDocument>[0]);
  const cancel = () => {
    void task.destroy();
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    const doc = await task.promise;
    let text = "";
    for (let i = 1; i <= Math.min(50, doc.numPages); i++) {
      signal.throwIfAborted();
      const page = await doc.getPage(i),
        content = await page.getTextContent();
      text +=
        content.items
          .map((item) =>
            "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
          )
          .join("") + "\n";
      page.cleanup();
      if (concepts(text).length >= 12 || text.length > 200000) break;
    }
    const pairs = concepts(text);
    if (pairs.length < 4)
      throw Error(
        "Not enough readable text. Choose a text-based PDF with at least four distinct definitions or sentences.",
      );
    return makeDeck(file.name.replace(/\.pdf$/i, ""), pairs);
  } finally {
    signal.removeEventListener("abort", cancel);
    if (!signal.aborted) await task.destroy();
  }
}
