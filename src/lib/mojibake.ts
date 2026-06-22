const windows1252ByteByCodePoint = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const suspiciousLeadCodePoints = new Set([
  0x00c2,
  0x00c3,
  0x00c4,
  0x00c6,
  0x00d0,
  0x00f0,
]);

export function repairUtf8Mojibake(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  let best = trimmed;
  let bestScore = getMojibakeScore(trimmed);

  for (const candidate of [
    decodeUtf8FromLatin1Bytes(trimmed),
    decodeUtf8FromWindows1252Bytes(trimmed),
  ]) {
    if (!candidate) {
      continue;
    }

    const normalized = candidate.trim();
    const score = getMojibakeScore(normalized);

    if (score < bestScore) {
      best = normalized;
      bestScore = score;
    }
  }

  return best;
}

function decodeUtf8FromLatin1Bytes(value: string): string | null {
  const bytes: number[] = [];

  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;

    if (codePoint > 0xff) {
      return null;
    }

    bytes.push(codePoint);
  }

  return decodeUtf8Bytes(bytes);
}

function decodeUtf8FromWindows1252Bytes(value: string): string | null {
  const bytes: number[] = [];

  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    const byte =
      codePoint <= 0xff
        ? codePoint
        : windows1252ByteByCodePoint.get(codePoint);

    if (byte === undefined) {
      return null;
    }

    bytes.push(byte);
  }

  return decodeUtf8Bytes(bytes);
}

function decodeUtf8Bytes(bytes: number[]): string | null {
  try {
    return utf8Decoder.decode(new Uint8Array(bytes));
  } catch {
    return null;
  }
}

function getMojibakeScore(value: string): number {
  let score = 0;
  const chars = Array.from(value);

  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    const codePoint = char.codePointAt(0) ?? 0;

    if (codePoint >= 0x80 && codePoint <= 0x9f) {
      score += 4;
    }

    if (codePoint === 0xfffd) {
      score += 4;
    }

    if (suspiciousLeadCodePoints.has(codePoint)) {
      score += 2;
    }

    if (
      codePoint === 0x00e1 &&
      [0x00bb, 0x00ba].includes(chars[index + 1]?.codePointAt(0) ?? 0)
    ) {
      score += 4;
    }
  }

  return score;
}
