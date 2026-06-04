const fs = require("fs");
const path = require("path");

const PDFDocument = require("../Server/node_modules/pdfkit");

const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "AMIYO_GO_THESIS_DOCUMENTATION.md");
const outputPath = path.join(root, "AMIYO_GO_THESIS_DOCUMENTATION.pdf");

const source = fs.readFileSync(inputPath, "utf8");
const lines = source.split(/\r?\n/);

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 56, bottom: 56, left: 52, right: 52 },
  bufferPages: true,
  info: {
    Title: "Amiyo-Go Marketplace Thesis Documentation",
    Author: "Amiyo-Go Engineering",
    Subject: "Project documentation, architecture, features, and workflows",
    Keywords: "marketplace, ecommerce, thesis, documentation, Amiyo-Go",
  },
});

doc.pipe(fs.createWriteStream(outputPath));

const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
const pageBottom = doc.page.height - doc.page.margins.bottom;
const colors = {
  text: "#111827",
  muted: "#4b5563",
  heading: "#0f172a",
  accent: "#1e7098",
  line: "#d1d5db",
  table: "#f8fafc",
};

const fontPaths = {
  regular: "C:\\Windows\\Fonts\\Nirmala.ttf",
  bold: "C:\\Windows\\Fonts\\NirmalaB.ttf",
  semibold: "C:\\Windows\\Fonts\\NirmalaS.ttf",
};

const fonts = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  semibold: "Helvetica-Bold",
  mono: "Courier",
};

if (fs.existsSync(fontPaths.regular)) {
  doc.registerFont("Body", fontPaths.regular);
  fonts.regular = "Body";
}

if (fs.existsSync(fontPaths.bold)) {
  doc.registerFont("BodyBold", fontPaths.bold);
  fonts.bold = "BodyBold";
}

if (fs.existsSync(fontPaths.semibold)) {
  doc.registerFont("BodySemiBold", fontPaths.semibold);
  fonts.semibold = "BodySemiBold";
}

function ensureSpace(height = 24) {
  if (doc.y + height > pageBottom) {
    doc.addPage();
  }
}

function writeText(text, options = {}) {
  ensureSpace(options.height || 18);
  doc
    .font(options.font || fonts.regular)
    .fontSize(options.size || 10)
    .fillColor(options.color || colors.text)
    .text(text, {
      width: pageWidth,
      align: options.align || "left",
      lineGap: options.lineGap ?? 2,
      paragraphGap: options.paragraphGap ?? 0,
      continued: false,
    });
}

function writeParagraph(text) {
  if (!text.trim()) {
    doc.moveDown(0.45);
    return;
  }
  writeText(text.trim(), { size: 10.2, lineGap: 3, paragraphGap: 5 });
}

function writeHeading(text, level) {
  const normalized = text.trim();
  const sizes = { 1: 22, 2: 16, 3: 13, 4: 11.5 };
  const spacing = { 1: 44, 2: 34, 3: 28, 4: 24 };
  ensureSpace(spacing[level] || 24);
  if (level === 1 && doc.y > doc.page.margins.top + 40) {
    doc.addPage();
  } else {
    doc.moveDown(level === 1 ? 0.8 : 0.55);
  }
  doc
    .font(fonts.bold)
    .fontSize(sizes[level] || 11.5)
    .fillColor(level === 1 ? colors.accent : colors.heading)
    .text(normalized, { width: pageWidth, lineGap: 1 });
  doc.moveDown(level === 1 ? 0.35 : 0.25);
  if (level <= 2) {
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .strokeColor(level === 1 ? colors.accent : colors.line)
      .lineWidth(level === 1 ? 1.2 : 0.7)
      .stroke();
    doc.moveDown(0.45);
  }
}

function writeBullet(text, indent = 0) {
  ensureSpace(20);
  const x = doc.page.margins.left + indent;
  const y = doc.y + 4;
  doc.circle(x + 3, y, 1.6).fillColor(colors.accent).fill();
  doc
    .font(fonts.regular)
    .fontSize(10)
    .fillColor(colors.text)
    .text(text.trim(), x + 14, doc.y, {
      width: pageWidth - indent - 14,
      lineGap: 2,
    });
}

function writeCode(text) {
  ensureSpace(18);
  doc
    .font(fonts.mono)
    .fontSize(8.7)
    .fillColor("#1f2937")
    .text(text, {
      width: pageWidth,
      lineGap: 1.2,
    });
}

function writeTableLine(line) {
  ensureSpace(18);
  if (/^\|\s*-+/.test(line)) return;
  doc
    .font(fonts.mono)
    .fontSize(7.8)
    .fillColor("#111827")
    .text(line, {
      width: pageWidth,
      lineGap: 1,
    });
}

function writeImage(alt, imagePath) {
  const normalizedPath = imagePath.replace(/^<|>$/g, "");
  const absolutePath = path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.join(root, normalizedPath);

  if (!fs.existsSync(absolutePath)) {
    writeText(`[Missing screenshot: ${normalizedPath}]`, {
      size: 9,
      color: "#b91c1c",
      font: fonts.semibold,
    });
    return;
  }

  const image = doc.openImage(absolutePath);
  const maxHeight = /mobile/i.test(absolutePath) ? 360 : 310;
  const scale = Math.min(pageWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  ensureSpace(height + 34);
  const x = doc.page.margins.left + (pageWidth - width) / 2;

  doc
    .roundedRect(x - 2, doc.y - 2, width + 4, height + 4, 4)
    .strokeColor(colors.line)
    .lineWidth(0.7)
    .stroke();
  doc.image(absolutePath, x, doc.y, { width, height });
  doc.y += height + 8;

  if (alt) {
    doc
      .font(fonts.semibold)
      .fontSize(8.8)
      .fillColor(colors.muted)
      .text(`Figure: ${alt}`, doc.page.margins.left, doc.y, {
        width: pageWidth,
        align: "center",
      });
    doc.moveDown(0.6);
  }
}

function drawCover() {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#f8fafc");
  doc
    .font(fonts.bold)
    .fontSize(30)
    .fillColor(colors.accent)
    .text("Amiyo-Go", doc.page.margins.left, 118, { width: pageWidth, align: "center" });
  doc
    .fontSize(18)
    .fillColor(colors.heading)
    .text("Marketplace Thesis Documentation", { width: pageWidth, align: "center" });
  doc.moveDown(1.2);
  doc
    .font(fonts.regular)
    .fontSize(11.5)
    .fillColor(colors.muted)
    .text("Architecture, features, workflows, implementation status, testing, deployment, and future scope", {
      width: pageWidth,
      align: "center",
      lineGap: 3,
    });
  doc.moveDown(2.5);
  doc
    .font(fonts.bold)
    .fontSize(12)
    .fillColor(colors.heading)
    .text("Prepared for project documentation and production-readiness review", {
      width: pageWidth,
      align: "center",
    });
  doc.moveDown(0.5);
  doc
    .font(fonts.regular)
    .fontSize(10.5)
    .fillColor(colors.muted)
    .text("Generated from AMIYO_GO_THESIS_DOCUMENTATION.md", { width: pageWidth, align: "center" });
  doc.moveDown(0.5);
  doc.text("Date: 2026-06-04", { width: pageWidth, align: "center" });
  doc.addPage();
}

drawCover();

let inCode = false;
for (const rawLine of lines) {
  const line = rawLine.replace(/\t/g, "  ");
  if (line.trim().startsWith("```")) {
    inCode = !inCode;
    doc.moveDown(0.2);
    continue;
  }
  if (inCode) {
    writeCode(line);
    continue;
  }
  if (/^# /.test(line)) {
    writeHeading(line.replace(/^# /, ""), 1);
  } else if (/^## /.test(line)) {
    writeHeading(line.replace(/^## /, ""), 2);
  } else if (/^### /.test(line)) {
    writeHeading(line.replace(/^### /, ""), 3);
  } else if (/^#### /.test(line)) {
    writeHeading(line.replace(/^#### /, ""), 4);
  } else if (/^!\[.*?\]\(.+?\)\s*$/.test(line.trim())) {
    const match = line.trim().match(/^!\[(.*?)\]\((.+?)\)\s*$/);
    writeImage(match[1], match[2]);
  } else if (/^\s*-\s+/.test(line)) {
    const indent = line.match(/^\s*/)[0].length * 3;
    writeBullet(line.replace(/^\s*-\s+/, ""), indent);
  } else if (/^\s*\d+\.\s+/.test(line)) {
    writeParagraph(line.trim());
  } else if (/^\|/.test(line.trim())) {
    writeTableLine(line.trim());
  } else if (/^---+$/.test(line.trim())) {
    ensureSpace(16);
    doc
      .moveTo(doc.page.margins.left, doc.y + 4)
      .lineTo(doc.page.margins.left + pageWidth, doc.y + 4)
      .strokeColor(colors.line)
      .lineWidth(0.6)
      .stroke();
    doc.moveDown(0.6);
  } else {
    writeParagraph(line);
  }
}

const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i += 1) {
  doc.switchToPage(i);
  const footer = `Amiyo-Go Thesis Documentation | Page ${i + 1} of ${range.count}`;
  doc
    .font(fonts.regular)
    .fontSize(8)
    .fillColor("#6b7280")
    .text(footer, doc.page.margins.left, doc.page.height - 34, {
      width: pageWidth,
      align: "center",
    });
}

doc.end();
console.log(`Generated ${outputPath}`);
