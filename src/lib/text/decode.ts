import iconv from "iconv-lite";

const UTF8_REPLACEMENT_CHAR = "\uFFFD";

export type DecodedText = {
  text: string;
  encoding: "utf-8-bom" | "utf-8" | "gb18030" | "big5" | "utf-16le" | "utf-16be";
  confidence: number;
  warnings: string[];
  decoderSignals: {
    replacementRatio: number;
    controlRatio: number;
    hanRatio: number;
    punctuationRatio: number;
    newlineDensity: number;
    suspiciousMojibakeCount: number;
    chapterHeadingHits: number;
  };
};

type CandidateEncoding = DecodedText["encoding"];

type CandidateScore = {
  encoding: CandidateEncoding;
  text: string;
  confidence: number;
  warnings: string[];
  decoderSignals: DecodedText["decoderSignals"];
};

const CHAPTER_HEADING_RE =
  /(^|\n)[\s　]*(第[\d一二三四五六七八九十百千零〇两\s]+[章卷回节折部篇]|Chapter\s+\d+|楔子|序章|序言|前言|引子|尾声|后记|番外|外传)/gimu;
const SUSPICIOUS_MOJIBAKE_RE = /[ÃÂ¤�]|鈥|鍀|锟斤拷/g;

function countMatches(text: string, pattern: RegExp) {
  return [...text.matchAll(pattern)].length;
}

function countRatio(text: string, matcher: (char: string) => boolean) {
  const chars = [...text];
  if (chars.length === 0) return 0;

  let count = 0;
  for (const char of chars) {
    if (matcher(char)) {
      count += 1;
    }
  }

  return count / chars.length;
}

function decodeUtf16Be(buffer: Buffer) {
  const swapped = Buffer.allocUnsafe(buffer.length);
  for (let index = 0; index < buffer.length; index += 2) {
    swapped[index] = buffer[index + 1] ?? 0;
    swapped[index + 1] = buffer[index] ?? 0;
  }
  return iconv.decode(swapped, "utf16le");
}

function scoreDecodedText(encoding: CandidateEncoding, text: string): CandidateScore {
  const replacementRatio = countRatio(text, (char) => char === UTF8_REPLACEMENT_CHAR);
  const controlRatio = countRatio(text, (char) => /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(char));
  const hanRatio = countRatio(text, (char) => /\p{Script=Han}/u.test(char));
  const punctuationRatio = countRatio(text, (char) => /[，。！？：；、“”‘’（）《》【】,.!?;:'"()[\]\-]/u.test(char));
  const newlineDensity = countRatio(text, (char) => char === "\n");
  const suspiciousMojibakeCount = countMatches(text, SUSPICIOUS_MOJIBAKE_RE);
  const chapterHeadingHits = countMatches(text, CHAPTER_HEADING_RE);

  let score = 1;
  score -= replacementRatio * 4.5;
  score -= controlRatio * 8;
  score -= Math.min(suspiciousMojibakeCount / 40, 0.35);
  score += Math.min(hanRatio * 0.8, 0.25);
  score += Math.min(punctuationRatio * 0.4, 0.12);
  score += Math.min(newlineDensity * 2.2, 0.1);
  score += Math.min(chapterHeadingHits * 0.03, 0.18);

  if (text.includes("\u0000")) {
    score -= 0.35;
  }

  const confidence = Math.max(0, Math.min(1, Number(score.toFixed(3))));
  const warnings: string[] = [];

  if (replacementRatio > 0.002) {
    warnings.push("文本中含有较多替换字符，可能存在乱码。");
  }
  if (controlRatio > 0.001) {
    warnings.push("文本中含有异常控制字符。");
  }
  if (suspiciousMojibakeCount >= 3) {
    warnings.push("文本中出现疑似 Mojibake 乱码片段。");
  }
  if (chapterHeadingHits === 0 && text.length > 20_000) {
    warnings.push("未识别到明显章节标题，后续可能回退到长度分块。");
  }

  return {
    encoding,
    text,
    confidence,
    warnings,
    decoderSignals: {
      replacementRatio,
      controlRatio,
      hanRatio,
      punctuationRatio,
      newlineDensity,
      suspiciousMojibakeCount,
      chapterHeadingHits,
    },
  };
}

export function decodeNovelBuffer(input: Uint8Array): DecodedText {
  const buffer = Buffer.from(input);
  const hasUtf8Bom =
    buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;

  if (hasUtf8Bom) {
    return scoreDecodedText("utf-8-bom", iconv.decode(buffer, "utf8"));
  }

  const candidates: CandidateScore[] = [
    scoreDecodedText("utf-8", iconv.decode(buffer, "utf8")),
    scoreDecodedText("gb18030", iconv.decode(buffer, "gb18030")),
    scoreDecodedText("big5", iconv.decode(buffer, "big5")),
    scoreDecodedText("utf-16le", iconv.decode(buffer, "utf16le")),
    scoreDecodedText("utf-16be", decodeUtf16Be(buffer)),
  ].sort((left, right) => right.confidence - left.confidence);

  const best = candidates[0];
  const rival = candidates[1];
  const warnings = [...best.warnings];

  if (best.confidence < 0.72) {
    warnings.push("编码识别置信度偏低，建议人工检查导入结果。");
  }
  if (rival && best.confidence - rival.confidence < 0.08) {
    warnings.push(`文本编码可能与 ${rival.encoding} 接近，已选择当前更优候选。`);
  }

  return {
    text: best.text,
    encoding: best.encoding,
    confidence: best.confidence,
    warnings,
    decoderSignals: best.decoderSignals,
  };
}
