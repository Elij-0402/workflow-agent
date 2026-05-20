export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export type FieldDiff = { same: boolean; left: unknown; right: unknown };
export type MetaDiff = Record<string, FieldDiff>;

export function diffMeta(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): MetaDiff {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  const out: MetaDiff = {};
  for (const key of keys) {
    const l = left[key];
    const r = right[key];
    if (
      l &&
      typeof l === "object" &&
      !Array.isArray(l) &&
      r &&
      typeof r === "object" &&
      !Array.isArray(r)
    ) {
      const sub = diffMeta(l as Record<string, unknown>, r as Record<string, unknown>);
      for (const [k, v] of Object.entries(sub)) {
        out[`${key}.${k}`] = v;
      }
      out[key] = {
        same: JSON.stringify(l) === JSON.stringify(r),
        left: l,
        right: r,
      };
    } else {
      out[key] = {
        same: JSON.stringify(l) === JSON.stringify(r),
        left: l,
        right: r,
      };
    }
  }
  return out;
}

export type StructureDiff = {
  common: string[];
  added: string[];
  removed: string[];
};

export function diffStructure(left: string[], right: string[]): StructureDiff {
  const setL = new Set(left);
  const setR = new Set(right);
  const common = left.filter((t) => setR.has(t));
  const added = right.filter((t) => !setL.has(t));
  const removed = left.filter((t) => !setR.has(t));
  return { common, added, removed };
}

function normalize(p: string): string {
  return p.replace(/[\s\p{P}]+/gu, "").toLowerCase();
}

function lcs(a: string[], b: string[]): [boolean[], boolean[]] {
  const ah = a.map(normalize);
  const bh = b.map(normalize);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] =
        ah[i] === bh[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const inLcsA = new Array(a.length).fill(false);
  const inLcsB = new Array(b.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (ah[i] === bh[j]) {
      inLcsA[i] = true;
      inLcsB[j] = true;
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return [inLcsA, inLcsB];
}

export type ParagraphDiff = {
  aOnly: Array<{ index: number; paragraph: string }>;
  bOnly: Array<{ index: number; paragraph: string }>;
};

export function diffParagraphs(left: string[], right: string[]): ParagraphDiff {
  const [inA, inB] = lcs(left, right);
  const aOnly = left
    .map((p, i) => ({ index: i, paragraph: p }))
    .filter((_, i) => !inA[i]);
  const bOnly = right
    .map((p, i) => ({ index: i, paragraph: p }))
    .filter((_, i) => !inB[i]);
  return { aOnly, bOnly };
}
