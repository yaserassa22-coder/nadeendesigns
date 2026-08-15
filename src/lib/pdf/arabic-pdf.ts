/**
 * Arabic in jsPDF: do not use doc.text() for Arabic.
 *
 * jsPDF’s text pipeline (R2L / processArabic / Identity-H) paints reversed
 * isolated letters. We shape to presentation forms, then draw Noto Sans
 * Arabic glyphs as vector paths so joining and order stay correct.
 *
 * Latin still uses embedded Noto Sans via doc.text().
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseOpenType } from "opentype.js";

export type PdfFontDoc = {
  addFileToVFS: (name: string, data: string) => void;
  addFont: (file: string, name: string, style: string) => void;
  setFont: (name: string, style?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setFillColor: (r: number, g?: number, b?: number) => void;
  getTextWidth: (text: string) => number;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  curveTo: (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ) => void;
  close: () => void;
  fill: () => void;
  text: (
    text: string | string[],
    x: number,
    y: number,
    options?: {
      align?: "left" | "center" | "right";
      maxWidth?: number;
      R2L?: boolean;
    }
  ) => void;
};

type OtPathCmd = {
  type: string;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
};

type OtFont = {
  unitsPerEm: number;
  charToGlyph: (ch: string) => {
    advanceWidth: number;
    getPath: (
      x: number,
      y: number,
      fontSize: number
    ) => { commands: OtPathCmd[] };
  };
};

type TextRun = {
  text: string;
  kind: "latin" | "arabic";
};

/** Isolated, final, initial, medial */
type Forms = readonly [string, string, string, string];

const ARABIC_FORMS: Record<string, Forms> = {
  "\u0621": ["\uFE80", "\uFE80", "\uFE80", "\uFE80"],
  "\u0622": ["\uFE81", "\uFE82", "\uFE81", "\uFE82"],
  "\u0623": ["\uFE83", "\uFE84", "\uFE83", "\uFE84"],
  "\u0624": ["\uFE85", "\uFE86", "\uFE85", "\uFE86"],
  "\u0625": ["\uFE87", "\uFE88", "\uFE87", "\uFE88"],
  "\u0626": ["\uFE89", "\uFE8A", "\uFE8B", "\uFE8C"],
  "\u0627": ["\uFE8D", "\uFE8E", "\uFE8D", "\uFE8E"],
  "\u0628": ["\uFE8F", "\uFE90", "\uFE91", "\uFE92"],
  "\u0629": ["\uFE93", "\uFE94", "\uFE93", "\uFE94"],
  "\u062A": ["\uFE95", "\uFE96", "\uFE97", "\uFE98"],
  "\u062B": ["\uFE99", "\uFE9A", "\uFE9B", "\uFE9C"],
  "\u062C": ["\uFE9D", "\uFE9E", "\uFE9F", "\uFEA0"],
  "\u062D": ["\uFEA1", "\uFEA2", "\uFEA3", "\uFEA4"],
  "\u062E": ["\uFEA5", "\uFEA6", "\uFEA7", "\uFEA8"],
  "\u062F": ["\uFEA9", "\uFEAA", "\uFEA9", "\uFEAA"],
  "\u0630": ["\uFEAB", "\uFEAC", "\uFEAB", "\uFEAC"],
  "\u0631": ["\uFEAD", "\uFEAE", "\uFEAD", "\uFEAE"],
  "\u0632": ["\uFEAF", "\uFEB0", "\uFEAF", "\uFEB0"],
  "\u0633": ["\uFEB1", "\uFEB2", "\uFEB3", "\uFEB4"],
  "\u0634": ["\uFEB5", "\uFEB6", "\uFEB7", "\uFEB8"],
  "\u0635": ["\uFEB9", "\uFEBA", "\uFEBB", "\uFEBC"],
  "\u0636": ["\uFEBD", "\uFEBE", "\uFEBF", "\uFEC0"],
  "\u0637": ["\uFEC1", "\uFEC2", "\uFEC3", "\uFEC4"],
  "\u0638": ["\uFEC5", "\uFEC6", "\uFEC7", "\uFEC8"],
  "\u0639": ["\uFEC9", "\uFECA", "\uFECB", "\uFECC"],
  "\u063A": ["\uFECD", "\uFECE", "\uFECF", "\uFED0"],
  "\u0641": ["\uFED1", "\uFED2", "\uFED3", "\uFED4"],
  "\u0642": ["\uFED5", "\uFED6", "\uFED7", "\uFED8"],
  "\u0643": ["\uFED9", "\uFEDA", "\uFEDB", "\uFEDC"],
  "\u0644": ["\uFEDD", "\uFEDE", "\uFEDF", "\uFEE0"],
  "\u0645": ["\uFEE1", "\uFEE2", "\uFEE3", "\uFEE4"],
  "\u0646": ["\uFEE5", "\uFEE6", "\uFEE7", "\uFEE8"],
  "\u0647": ["\uFEE9", "\uFEEA", "\uFEEB", "\uFEEC"],
  "\u0648": ["\uFEED", "\uFEEE", "\uFEED", "\uFEEE"],
  "\u0649": ["\uFEEF", "\uFEF0", "\uFEEF", "\uFEF0"],
  "\u064A": ["\uFEF1", "\uFEF2", "\uFEF3", "\uFEF4"],
  "\u067E": ["\uFB56", "\uFB57", "\uFB58", "\uFB59"],
  "\u0686": ["\uFB7A", "\uFB7B", "\uFB7C", "\uFB7D"],
  "\u0698": ["\uFB8A", "\uFB8B", "\uFB8A", "\uFB8B"],
  "\u06A9": ["\uFB8E", "\uFB8F", "\uFB90", "\uFB91"],
  "\u06AF": ["\uFB92", "\uFB93", "\uFB94", "\uFB95"],
  "\u06CC": ["\uFBFC", "\uFBFD", "\uFBFE", "\uFBFF"],
};

const LAM = "\u0644";
const LAM_ALEF: Record<string, readonly [string, string]> = {
  "\u0627": ["\uFEFB", "\uFEFC"],
  "\u0622": ["\uFEF5", "\uFEF6"],
  "\u0623": ["\uFEF7", "\uFEF8"],
  "\u0625": ["\uFEF9", "\uFEFA"],
};

const TATWEEL = "\u0640";

function connectsToNext(ch: string): boolean {
  if (ch === TATWEEL) return true;
  const forms = ARABIC_FORMS[ch];
  return Boolean(forms && forms[2] !== forms[0]);
}

function isJoinable(ch: string): boolean {
  return ch === TATWEEL || Boolean(ARABIC_FORMS[ch]) || ch.startsWith("LA:");
}

function shapeArabic(run: string): string {
  const raw = Array.from(run);
  const tokens: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    const next = raw[i + 1];
    if (raw[i] === LAM && next && LAM_ALEF[next]) {
      tokens.push(`LA:${next}`);
      i += 1;
      continue;
    }
    tokens.push(raw[i]);
  }

  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    const prevConnects =
      Boolean(prev) &&
      !prev.startsWith("LA:") &&
      connectsToNext(prev) &&
      isJoinable(token);

    if (token.startsWith("LA:")) {
      const alef = token.slice(3);
      const pair = LAM_ALEF[alef];
      out.push(pair ? pair[prevConnects ? 1 : 0] : token);
      continue;
    }
    if (token === TATWEEL) {
      out.push(token);
      continue;
    }

    const forms = ARABIC_FORMS[token];
    if (!forms) {
      out.push(token);
      continue;
    }

    const nextConnects =
      Boolean(next) &&
      connectsToNext(token) &&
      (next.startsWith("LA:") || next === TATWEEL || Boolean(ARABIC_FORMS[next]));

    if (prevConnects && nextConnects) out.push(forms[3]);
    else if (prevConnects) out.push(forms[1]);
    else if (nextConnects) out.push(forms[2]);
    else out.push(forms[0]);
  }

  return out.join("");
}

function toArabicVisual(logical: string): string {
  return Array.from(shapeArabic(logical)).reverse().join("");
}

function ptToMm(pt: number): number {
  return (pt * 25.4) / 72;
}

let latinFontB64: string | null = null;
let arabicOt: OtFont | null = null;

async function loadFontAssets() {
  if (latinFontB64 && arabicOt) return;
  const dir = path.join(process.cwd(), "public", "fonts");
  const [latinBuf, arabicBuf] = await Promise.all([
    readFile(path.join(dir, "NotoSans-Regular.ttf")),
    readFile(path.join(dir, "NotoSansArabic-Regular.ttf")),
  ]);
  latinFontB64 = latinBuf.toString("base64");
  const copy = new Uint8Array(arabicBuf.byteLength);
  copy.set(arabicBuf);
  arabicOt = parseOpenType(copy.buffer) as unknown as OtFont;
}

export async function registerArabicPdfFonts(doc: PdfFontDoc): Promise<void> {
  await loadFontAssets();
  if (!latinFontB64) throw new Error("Noto Sans font failed to load");
  doc.addFileToVFS("NotoSans-Regular.ttf", latinFontB64);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
}

const RUN_RE =
  /([\u0621-\u063A\u0640-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+)|([\u0660-\u0669\u06F0-\u06F9\u060C\u061B\u061F]+)|([^\u0600-\u06FF]+)/g;

function splitLogicalRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const source = String(text ?? "");
  if (!source) return runs;
  let match: RegExpExecArray | null;
  RUN_RE.lastIndex = 0;
  while ((match = RUN_RE.exec(source))) {
    if (match[1]) {
      runs.push({ text: toArabicVisual(match[1]), kind: "arabic" });
    } else if (match[2]) {
      runs.push({ text: match[2], kind: "arabic" });
    } else if (match[3]) {
      runs.push({ text: match[3], kind: "latin" });
    }
  }
  if (!runs.length) return [{ text: source, kind: "latin" }];
  return runs;
}

function arabicWidthMm(visual: string, sizePt: number): number {
  if (!arabicOt) return 0;
  const sizeMm = ptToMm(sizePt);
  let width = 0;
  for (const ch of visual) {
    width += (arabicOt.charToGlyph(ch).advanceWidth / arabicOt.unitsPerEm) * sizeMm;
  }
  return width;
}

function measureRun(doc: PdfFontDoc, run: TextRun, sizePt: number): number {
  if (run.kind === "arabic") return arabicWidthMm(run.text, sizePt);
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(sizePt);
  return doc.getTextWidth(run.text);
}

function quadraticToCubic(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x: number,
  y: number
) {
  return {
    cx1: px + (2 / 3) * (x1 - px),
    cy1: py + (2 / 3) * (y1 - py),
    cx2: x + (2 / 3) * (x1 - x),
    cy2: y + (2 / 3) * (y1 - y),
  };
}

function fillGlyphPath(doc: PdfFontDoc, commands: OtPathCmd[]) {
  let px = 0;
  let py = 0;
  let started = false;
  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        doc.moveTo(cmd.x ?? 0, cmd.y ?? 0);
        px = cmd.x ?? 0;
        py = cmd.y ?? 0;
        started = true;
        break;
      case "L":
        doc.lineTo(cmd.x ?? 0, cmd.y ?? 0);
        px = cmd.x ?? 0;
        py = cmd.y ?? 0;
        break;
      case "C":
        doc.curveTo(
          cmd.x1 ?? 0,
          cmd.y1 ?? 0,
          cmd.x2 ?? 0,
          cmd.y2 ?? 0,
          cmd.x ?? 0,
          cmd.y ?? 0
        );
        px = cmd.x ?? 0;
        py = cmd.y ?? 0;
        break;
      case "Q": {
        const c = quadraticToCubic(px, py, cmd.x1 ?? 0, cmd.y1 ?? 0, cmd.x ?? 0, cmd.y ?? 0);
        doc.curveTo(c.cx1, c.cy1, c.cx2, c.cy2, cmd.x ?? 0, cmd.y ?? 0);
        px = cmd.x ?? 0;
        py = cmd.y ?? 0;
        break;
      }
      case "Z":
        doc.close();
        break;
      default:
        break;
    }
  }
  if (started) doc.fill();
}

function drawArabicRun(
  doc: PdfFontDoc,
  visual: string,
  x: number,
  y: number,
  sizePt: number
) {
  if (!arabicOt) return;
  const sizeMm = ptToMm(sizePt);
  let cursor = x;
  for (const ch of visual) {
    const glyph = arabicOt.charToGlyph(ch);
    fillGlyphPath(doc, glyph.getPath(cursor, y, sizeMm).commands);
    cursor += (glyph.advanceWidth / arabicOt.unitsPerEm) * sizeMm;
  }
}

export function drawMixedPdfText(
  doc: PdfFontDoc,
  text: string,
  x: number,
  y: number,
  opts?: { align?: "left" | "center" | "right"; size?: number; maxWidth?: number }
) {
  const raw = String(text ?? "");
  if (!raw) return;

  let size = opts?.size ?? 10;
  const runs = splitLogicalRuns(raw);
  let total = runs.reduce((sum, run) => sum + measureRun(doc, run, size), 0);

  if (opts?.maxWidth && total > opts.maxWidth && total > 0) {
    size = Math.max(6, (size * opts.maxWidth) / total);
    total = runs.reduce((sum, run) => sum + measureRun(doc, run, size), 0);
  }

  const align = opts?.align ?? "left";
  let cursor =
    align === "center" ? x - total / 2 : align === "right" ? x - total : x;

  doc.setFontSize(size);
  for (const run of runs) {
    const width = measureRun(doc, run, size);
    if (run.kind === "arabic") {
      drawArabicRun(doc, run.text, cursor, y, size);
    } else {
      doc.setFont("NotoSans", "normal");
      doc.text(run.text, cursor, y, { R2L: false });
    }
    cursor += width;
  }
}
