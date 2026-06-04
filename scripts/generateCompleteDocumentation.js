const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");

const outputMarkdown = path.join(root, "AMIYO_GO_COMPLETE_DOCUMENTATION_WITH_SCREENSHOTS.md");
const outputPdf = path.join(root, "AMIYO_GO_COMPLETE_DOCUMENTATION_WITH_SCREENSHOTS.pdf");

const docs = [
  {
    title: "Thesis Documentation",
    file: "AMIYO_GO_THESIS_DOCUMENTATION.md",
    note: "Main project thesis with architecture, screenshots, role workflows, testing, deployment, and bilingual operating narrative.",
  },
  {
    title: "Role Features Documentation",
    file: "ROLE_FEATURES_DOCUMENTATION.md",
    note: "Customer, vendor, and admin feature inventory and role responsibilities.",
  },
  {
    title: "Marketplace Workflow Diagrams",
    file: "MARKETPLACE_WORKFLOW_DIAGRAMS.md",
    note: "Architecture diagrams, module maps, state machines, and target workflow match status.",
  },
  {
    title: "Project Workflow",
    file: "PROJECT_WORKFLOW.md",
    note: "Implementation workflow and operational project map.",
  },
  {
    title: "Marketplace Role Workflows",
    file: "MARKETPLACE_ROLE_WORKFLOWS.md",
    note: "Role-by-role workflow documentation for buyer, seller, and operator journeys.",
  },
  {
    title: "Daraz-Level Marketplace Audit",
    file: "DARAZ_LEVEL_MARKETPLACE_AUDIT.md",
    note: "Marketplace maturity audit and Daraz-level readiness notes.",
  },
  {
    title: "Professional Feature Gap Status",
    file: "DARAZ_PROFESSIONAL_FEATURE_GAP_STATUS.md",
    note: "Professional feature gap tracking and implementation status.",
  },
  {
    title: "Courier Integration Workflow",
    file: "COURIER_INTEGRATION_WORKFLOW.md",
    note: "Courier provider workflow and delivery integration notes.",
  },
  {
    title: "Testing Documentation",
    file: "TESTING_DOCUMENTATION.md",
    note: "Testing strategy, verification notes, and quality workflow.",
  },
  {
    title: "Feature Reference",
    file: "FEATURE_REFERENCE.md",
    note: "Project feature reference and quick lookup.",
  },
  {
    title: "Project README",
    file: "README.md",
    note: "General repository overview.",
  },
  {
    title: "Customer README",
    file: "README_USER.md",
    note: "Customer-facing feature and usage documentation.",
  },
  {
    title: "Vendor README",
    file: "README_VENDOR.md",
    note: "Vendor/seller-center feature and usage documentation.",
  },
  {
    title: "Admin README",
    file: "README_ADMIN.md",
    note: "Admin/operator feature and usage documentation.",
  },
];

const screenshots = [
  {
    title: "Customer Home Page",
    path: "docs/thesis-screenshots/01-home-desktop.png",
    en: "Shows the modern marketplace landing page, controlled promotional sections, product discovery, and customer entry points.",
    bn: "এখানে আধুনিক মার্কেটপ্লেস হোমপেজ, অ্যাডমিন-কন্ট্রোলড প্রমোশন সেকশন, পণ্য খোঁজা এবং কাস্টমার এন্ট্রি পয়েন্ট দেখা যায়।",
  },
  {
    title: "Customer University",
    path: "docs/thesis-screenshots/02-customer-university.png",
    en: "Shows the customer learning center. Public users see only safe customer education, while vendor/admin operating lessons stay behind protected role routes.",
    bn: "এটি কাস্টমার লার্নিং সেন্টার দেখায়। পাবলিক ইউজার শুধু নিরাপদ কাস্টমার গাইড দেখে, ভেন্ডর/অ্যাডমিন অপারেশন গাইড protected role route-এর ভিতরে থাকে।",
  },
  {
    title: "Shop Discovery",
    path: "docs/thesis-screenshots/03-shops-discovery.png",
    en: "Shows public shop browsing, shop search, filters, ratings, follower signals, and storefront navigation.",
    bn: "এখানে পাবলিক শপ ব্রাউজিং, শপ সার্চ, ফিল্টার, রেটিং, ফলোয়ার সিগন্যাল এবং storefront navigation দেখা যায়।",
  },
  {
    title: "Account Registration",
    path: "docs/thesis-screenshots/04-account-registration.png",
    en: "Shows account creation and address capture, which connects identity, delivery, checkout, order history, and support.",
    bn: "এটি account creation এবং address capture দেখায়, যা identity, delivery, checkout, order history এবং support-এর সাথে যুক্ত।",
  },
  {
    title: "Login And Protected Access",
    path: "docs/thesis-screenshots/05-login-access.png",
    en: "Shows authentication entry. After login, route guards decide whether the user enters customer, vendor, or admin workflows.",
    bn: "এটি authentication entry দেখায়। লগইনের পরে route guard ঠিক করে user customer, vendor নাকি admin workflow-তে যাবে।",
  },
  {
    title: "Mobile Home Experience",
    path: "docs/thesis-screenshots/06-home-mobile.png",
    en: "Shows the responsive marketplace experience for mobile users, including compressed discovery sections and PWA-friendly layout.",
    bn: "এটি mobile user-এর responsive marketplace experience দেখায়, যেখানে compact discovery section এবং PWA-friendly layout আছে।",
  },
];

function readDoc(file) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    return `> Missing source document: ${file}\n`;
  }

  return fs.readFileSync(absolute, "utf8").trim();
}

function buildMarkdown() {
  const now = new Date().toISOString().slice(0, 10);
  const chunks = [
    "# Amiyo-Go Complete Marketplace Documentation With Screenshots",
    "",
    `Generated: ${now}`,
    "",
    "This single PDF source combines the thesis, role documentation, workflow diagrams, audit notes, testing notes, and README references into one complete project document.",
    "",
    "এই একক PDF source-এ thesis, role documentation, workflow diagram, audit note, testing note এবং README reference একসাথে রাখা হয়েছে।",
    "",
    "## How This Combined PDF Is Organized",
    "",
    "- Part 1: Visual screenshot index with English and Bangla explanations.",
    "- Part 2: Main thesis documentation with architecture and bilingual workflow narrative.",
    "- Part 3: Role features, workflow diagrams, audit, testing, courier, and README references.",
    "",
    "## Included Source Documents",
    "",
  ];

  for (const doc of docs) {
    chunks.push(`- ${doc.title}: ${doc.file} - ${doc.note}`);
  }

  chunks.push(
    "",
    "## Visual Screenshot Index",
    "",
    "These screenshots are captured from the running Amiyo-Go frontend and included so the documentation explains both the system design and the real user interface.",
    "",
    "এই screenshot-গুলো running Amiyo-Go frontend থেকে নেওয়া হয়েছে, যাতে documentation-এ system design-এর পাশাপাশি real UI-ও বোঝা যায়।",
    "",
  );

  screenshots.forEach((screenshot, index) => {
    chunks.push(
      `### Screenshot ${index + 1}: ${screenshot.title}`,
      "",
      `![${screenshot.title}](${screenshot.path})`,
      "",
      `English: ${screenshot.en}`,
      "",
      `বাংলা: ${screenshot.bn}`,
      "",
    );
  });

  chunks.push(
    "# Combined Source Documents",
    "",
    "The following sections include the project's existing documentation files in one continuous PDF.",
    "",
  );

  for (const doc of docs) {
    chunks.push(
      `# ${doc.title}`,
      "",
      `Source file: ${doc.file}`,
      "",
      doc.note,
      "",
      readDoc(doc.file),
      "",
    );
  }

  const cleaned = chunks
    .join("\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "");

  return `${cleaned}\n`;
}

fs.writeFileSync(outputMarkdown, buildMarkdown(), "utf8");

const pdfScript = path.join(root, "scripts", "generateThesisPdf.js");
const result = spawnSync(
  process.execPath,
  [
    pdfScript,
    path.relative(root, outputMarkdown),
    path.relative(root, outputPdf),
    "Complete Marketplace Documentation With Screenshots",
    "One combined thesis-style PDF with screenshots, workflows, role features, audits, testing notes, and README references",
    "Complete Documentation",
  ],
  {
    cwd: root,
    stdio: "inherit",
  },
);

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(`Generated ${outputMarkdown}`);
console.log(`Generated ${outputPdf}`);
