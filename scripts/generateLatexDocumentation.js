const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const inputPath = process.argv[2]
  ? path.resolve(root, process.argv[2])
  : path.join(root, "AMIYO_GO_THESIS_DOCUMENTATION.md");
const outputPath = process.argv[3]
  ? path.resolve(root, process.argv[3])
  : path.join(root, "AMIYO_GO_THESIS_DOCUMENTATION.tex");
const documentTitle = process.argv[4] || "Amiyo-Go Marketplace Documentation";
const sourceLabel = path.relative(root, inputPath).replace(/\\/g, "/");

if (!fs.existsSync(inputPath)) {
  console.error(`Missing input file: ${inputPath}`);
  process.exit(1);
}

const source = fs.readFileSync(inputPath, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

function latexEscape(value) {
  return String(value)
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function latexPath(value) {
  return value.replace(/\\/g, "/").replace(/^<|>$/g, "");
}

function convertInline(value) {
  let escaped = latexEscape(value);
  escaped = escaped.replace(/`([^`]+)`/g, "\\texttt{$1}");
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "\\textbf{$1}");
  return escaped;
}

function preamble() {
  const today = new Date().toISOString().slice(0, 10);
  return [
    "% Auto-generated from Markdown by scripts/generateLatexDocumentation.js",
    "% Compile with XeLaTeX or LuaLaTeX for Bangla/English Unicode support.",
    "\\documentclass[12pt,a4paper]{report}",
    "\\usepackage[a4paper,margin=1in]{geometry}",
    "\\usepackage{fontspec}",
    "\\IfFontExistsTF{Nirmala UI}{\\setmainfont{Nirmala UI}}{\\setmainfont{FreeSerif}}",
    "\\IfFontExistsTF{Consolas}{\\setmonofont{Consolas}}{\\setmonofont{DejaVu Sans Mono}}",
    "\\usepackage{graphicx}",
    "\\usepackage{xcolor}",
    "\\usepackage{hyperref}",
    "\\usepackage{longtable}",
    "\\usepackage{array}",
    "\\usepackage{enumitem}",
    "\\usepackage{fancyhdr}",
    "\\usepackage{fvextra}",
    "\\usepackage{caption}",
    "\\hypersetup{colorlinks=true,linkcolor=blue,urlcolor=blue}",
    "\\DefineVerbatimEnvironment{CodeBlock}{Verbatim}{breaklines,breakanywhere,fontsize=\\small}",
    "\\setlist[itemize]{topsep=4pt,itemsep=2pt,parsep=0pt}",
    "\\setlist[enumerate]{topsep=4pt,itemsep=2pt,parsep=0pt}",
    "\\pagestyle{fancy}",
    "\\fancyhf{}",
    "\\lhead{Amiyo-Go}",
    "\\rhead{Documentation}",
    "\\cfoot{\\thepage}",
    `\\title{${latexEscape(documentTitle)}}`,
    "\\author{Amiyo-Go Engineering}",
    `\\date{Generated ${latexEscape(today)} from ${latexEscape(sourceLabel)}}`,
    "\\begin{document}",
    "\\maketitle",
    "\\tableofcontents",
    "\\clearpage",
    "",
  ].join("\n");
}

function closeList(state, output) {
  if (state.list === "itemize") {
    output.push("\\end{itemize}");
  }
  if (state.list === "enumerate") {
    output.push("\\end{enumerate}");
  }
  state.list = null;
}

function ensureList(state, output, type) {
  if (state.list === type) return;
  closeList(state, output);
  output.push(type === "itemize" ? "\\begin{itemize}" : "\\begin{enumerate}");
  state.list = type;
}

function convertMarkdownToLatex(markdown) {
  const lines = markdown.split("\n");
  const output = [preamble()];
  const state = {
    inCode: false,
    list: null,
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ").replace(/[ \t]+$/g, "");
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      closeList(state, output);
      if (state.inCode) {
        output.push("\\end{CodeBlock}");
        state.inCode = false;
      } else {
        output.push("\\begin{CodeBlock}");
        state.inCode = true;
      }
      continue;
    }

    if (state.inCode) {
      output.push(line);
      continue;
    }

    if (!trimmed) {
      closeList(state, output);
      output.push("");
      continue;
    }

    const imageMatch = trimmed.match(/^!\[(.*?)\]\((.+?)\)$/);
    if (imageMatch) {
      closeList(state, output);
      const alt = imageMatch[1];
      const image = latexPath(imageMatch[2]);
      output.push("\\begin{figure}[htbp]");
      output.push("\\centering");
      output.push(`\\includegraphics[width=\\linewidth,height=0.58\\textheight,keepaspectratio]{${image}}`);
      if (alt) {
        output.push(`\\caption{${latexEscape(alt)}}`);
      }
      output.push("\\end{figure}");
      output.push("");
      continue;
    }

    if (/^# /.test(line)) {
      closeList(state, output);
      output.push(`\\chapter{${convertInline(line.replace(/^# /, ""))}}`);
      continue;
    }

    if (/^## /.test(line)) {
      closeList(state, output);
      output.push(`\\section{${convertInline(line.replace(/^## /, ""))}}`);
      continue;
    }

    if (/^### /.test(line)) {
      closeList(state, output);
      output.push(`\\subsection{${convertInline(line.replace(/^### /, ""))}}`);
      continue;
    }

    if (/^#### /.test(line)) {
      closeList(state, output);
      output.push(`\\subsubsection{${convertInline(line.replace(/^#### /, ""))}}`);
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      ensureList(state, output, "itemize");
      output.push(`\\item ${convertInline(line.replace(/^\s*-\s+/, ""))}`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      ensureList(state, output, "enumerate");
      output.push(`\\item ${convertInline(line.replace(/^\s*\d+\.\s+/, ""))}`);
      continue;
    }

    if (/^\|/.test(trimmed) || /^---+$/.test(trimmed)) {
      closeList(state, output);
      output.push("\\begin{CodeBlock}");
      output.push(line);
      output.push("\\end{CodeBlock}");
      continue;
    }

    if (/^>/.test(trimmed)) {
      closeList(state, output);
      output.push(`\\begin{quote}\\emph{${convertInline(trimmed.replace(/^>\s?/, ""))}}\\end{quote}`);
      continue;
    }

    closeList(state, output);
    output.push(`${convertInline(line)}\n`);
  }

  closeList(state, output);
  if (state.inCode) {
    output.push("\\end{CodeBlock}");
  }
  output.push("\\end{document}");
  output.push("");

  return output.join("\n").replace(/\n{4,}/g, "\n\n\n");
}

fs.writeFileSync(outputPath, convertMarkdownToLatex(source), "utf8");
console.log(`Generated ${outputPath}`);
