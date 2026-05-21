import iconv from "iconv-lite";

const UTF8_REPLACEMENT_CHAR = "\uFFFD";
const UTF8_REPLACEMENT_THRESHOLD = 0.01;

export type DecodedText = {
  text: string;
  encoding: "utf-8-bom" | "utf-8" | "gb18030";
};

function countReplacementRatio(text: string) {
  if (text.length === 0) return 0;
  const replacements = [...text].filter((char) => char === UTF8_REPLACEMENT_CHAR).length;
  return replacements / text.length;
}

export function decodeNovelBuffer(input: Uint8Array): DecodedText {
  const buffer = Buffer.from(input);
  const hasUtf8Bom =
    buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;

  if (hasUtf8Bom) {
    return {
      text: iconv.decode(buffer, "utf8"),
      encoding: "utf-8-bom",
    };
  }

  const utf8Text = iconv.decode(buffer, "utf8");
  if (countReplacementRatio(utf8Text) <= UTF8_REPLACEMENT_THRESHOLD) {
    return {
      text: utf8Text,
      encoding: "utf-8",
    };
  }

  return {
    text: iconv.decode(buffer, "gb18030"),
    encoding: "gb18030",
  };
}
