/**
 * A very small PDF writer — enough for the credential slips and the desk
 * roster, and nothing more.
 *
 * Written by hand rather than pulled from npm because both documents need only
 * base-14 text, filled rectangles and QR codes drawn as paths. That is a few
 * hundred lines against a dependency in the install path of an app that
 * handles real people's credentials.
 *
 * Coordinates are PDF points with the origin at the bottom-left of the page.
 */

/**
 * Widths per 1000 units for the base-14 fonts, ASCII 32..126.
 *
 * Without real metrics there is no way to centre a string, right-align a
 * column or shrink an over-long name to fit — the alternative is guessing at
 * an average character width, which shows up immediately as text that sits
 * visibly off its column.
 */
const W_HELV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];
const W_HELV_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584,
  584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333,
  278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278,
  556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556,
  500, 389, 280, 389, 584,
];

export const FONTS = {
  F1: { widths: W_HELV, base: "Helvetica" },
  F2: { widths: W_HELV_BOLD, base: "Helvetica-Bold" },
  F3: { widths: null, base: "Courier-Bold" }, // monospaced: every glyph is 600
};

/**
 * Punctuation that lives outside ASCII but inside WinAnsiEncoding.
 *
 * Pages are written as latin1 bytes, so a codepoint above 255 would be
 * truncated to whatever its low byte happens to be — an em dash (U+2014)
 * becomes 0x14, a control character, and the glyph silently vanishes from the
 * page. Mapping to the WinAnsi byte is what actually prints it.
 */
const WINANSI = {
  "—": 0x97, // em dash
  "–": 0x96, // en dash
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "…": 0x85, // ellipsis
};

/** Widths for the non-ASCII glyphs above, which the 32..126 table misses. */
const EXTRA_WIDTHS = {
  "—": 1000,
  "–": 556,
  "‘": 222,
  "’": 222,
  "“": 333,
  "”": 333,
  "…": 1000,
  "·": 278, // middle dot, already a valid latin1 byte
};

export function textWidth(text, font, size) {
  const { widths } = FONTS[font];
  let units = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (!widths) units += 600; // monospaced
    else if (code >= 32 && code <= 126) units += widths[code - 32];
    else units += EXTRA_WIDTHS[ch] ?? 556;
  }
  return (units / 1000) * size;
}

/** Largest size in the range that keeps `text` inside `maxWidth`. */
export function fitSize(text, font, maxWidth, max, min) {
  let size = max;
  while (size > min && textWidth(text, font, size) > maxWidth) size -= 0.5;
  return size;
}

/**
 * Clips `text` to `maxWidth`, marking the cut with "...".
 *
 * Plain ASCII dots rather than a single ellipsis glyph: the pages declare
 * WinAnsiEncoding, and "…" there is a high byte that some viewers drop.
 */
export function ellipsize(text, font, size, maxWidth) {
  if (textWidth(text, font, size) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && textWidth(`${cut}...`, font, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}...`;
}

/**
 * Encodes to WinAnsi bytes and escapes the three characters that would
 * otherwise break a PDF string.
 *
 * Anything still above 255 after the mapping is replaced rather than
 * truncated: a "?" is obviously wrong on the page and gets fixed, whereas a
 * mangled byte just drops the glyph and reads as a spacing quirk.
 */
function pdfString(text) {
  let out = "";
  for (const ch of text) {
    const mapped = WINANSI[ch];
    const code = mapped ?? ch.charCodeAt(0);
    if (mapped === undefined && code > 255) out += "?";
    else if (ch === "\\" || ch === "(" || ch === ")") out += `\\${ch}`;
    else out += String.fromCharCode(code);
  }
  return out;
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => (v / 255).toFixed(3))
    .join(" ");
}

/** One page's content stream, built up by drawing calls. */
export class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.ops = [];
  }

  fill(hex) {
    this.ops.push(`${rgb(hex)} rg`);
    return this;
  }

  rect(x, y, w, h) {
    this.ops.push(
      `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`,
    );
    return this;
  }

  /** A horizontal hairline; `y` is its baseline. */
  rule(x, y, w, weight = 0.8) {
    return this.rect(x, y, w, weight);
  }

  text(str, font, size, x, y, tracking = 0) {
    const tc = tracking ? `${tracking} Tc ` : "";
    // Tc is text state and outlives the block, so it is reset inside the same
    // BT/ET rather than leaking into every later string on the page.
    const reset = tracking ? " 0 Tc" : "";
    this.ops.push(
      `BT /${font} ${size} Tf ${tc}1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ` +
        `(${pdfString(str)}) Tj${reset} ET`,
    );
    return this;
  }

  textRight(str, font, size, right, y) {
    return this.text(str, font, size, right - textWidth(str, font, size), y);
  }

  textCentre(str, font, size, centre, y) {
    return this.text(str, font, size, centre - textWidth(str, font, size) / 2, y);
  }

  /**
   * Draws a QR as vector rectangles rather than an embedded raster.
   *
   * A QR is a grid of squares, so paths reproduce it exactly at any zoom and
   * keep the file small — enlarging the page on a printer cannot soften the
   * edges into something a scanner has to work at.
   *
   * `modules` is the grid from qrcode's QRCode.create().
   */
  qr(modules, x, y, size, colour = "#000000") {
    const n = modules.size;
    const cell = size / n;
    this.fill(colour);

    for (let r = 0; r < n; r++) {
      let run = 0;
      for (let c = 0; c <= n; c++) {
        if (c < n && modules.data[r * n + c]) {
          run++;
          continue;
        }
        if (run) {
          // One rect per horizontal run: a 37-module code is ~1400 separate
          // squares otherwise, and the stream bloats for no gain.
          this.rect(
            x + (c - run) * cell,
            y + size - (r + 1) * cell,
            run * cell + 0.03, // hairline overlap, so no seam shows between rows
            cell + 0.03,
          );
          run = 0;
        }
      }
    }
    return this;
  }

  toString() {
    return this.ops.join("\n");
  }
}

/**
 * Assembles finished canvases into a PDF file.
 *
 * Pages may differ in size, so each carries its own MediaBox.
 */
export function buildPdf(canvases) {
  const chunks = [];
  const offsets = [];
  let cursor = 0;

  const push = (str) => {
    chunks.push(str);
    cursor += Buffer.byteLength(str, "latin1");
  };
  const obj = (num, body) => {
    offsets[num] = cursor;
    push(`${num} 0 obj\n${body}\nendobj\n`);
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const fontNames = Object.keys(FONTS);
  const firstPage = 3 + fontNames.length;
  const pageIds = canvases.map((_, i) => firstPage + i * 2);
  const total = 2 + fontNames.length + canvases.length * 2;

  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(
    2,
    `<< /Type /Pages /Count ${canvases.length} ` +
      `/Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`,
  );

  fontNames.forEach((name, i) => {
    obj(
      3 + i,
      `<< /Type /Font /Subtype /Type1 /Name /${name} ` +
        `/BaseFont /${FONTS[name].base} /Encoding /WinAnsiEncoding >>`,
    );
  });

  const resources =
    `<< /Font << ${fontNames
      .map((name, i) => `/${name} ${3 + i} 0 R`)
      .join(" ")} >> >>`;

  canvases.forEach((canvas, i) => {
    const pageId = pageIds[i];
    const content = canvas.toString();
    obj(
      pageId,
      `<< /Type /Page /Parent 2 0 R ` +
        `/MediaBox [0 0 ${canvas.width} ${canvas.height}] ` +
        `/Resources ${resources} /Contents ${pageId + 1} 0 R >>`,
    );
    obj(
      pageId + 1,
      `<< /Length ${Buffer.byteLength(content, "latin1")} >>\n` +
        `stream\n${content}\nendstream`,
    );
  });

  const xref = cursor;
  let table = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= total; i++) {
    table += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  push(table);
  push(
    `trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
  );

  return Buffer.from(chunks.join(""), "latin1");
}
