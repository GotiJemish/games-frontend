// One-shot refactor script for the 15 remaining mode pages.
// Run from D:\gamezone\games-frontend via `node __theme_refactor.js`.
// Removes duplicated theme state + useEffect + toggleTheme + the floating
// toggle <button> JSX block and replaces them with <Navbar ...>.
const fs = require("fs");
const path = require("path");

const modeFiles = [
  "app/ludo/ai/page.tsx",
  "app/ludo/local/page.tsx",
  "app/ludo/online/page.tsx",
  "app/go/ai/page.tsx",
  "app/go/local/page.tsx",
  "app/go/online/page.tsx",
  "app/snake-ladder/ai/page.tsx",
  "app/snake-ladder/local/page.tsx",
  "app/snake-ladder/online/page.tsx",
  "app/tic-tac-toe/ai/page.tsx",
  "app/tic-tac-toe/local/page.tsx",
  "app/tic-tac-toe/online/page.tsx",
  "app/bingo/ai/page.tsx",
  "app/bingo/local/page.tsx",
  "app/bingo/online/page.tsx",
];

// Per-file config: game slug for backHref, human-readable label for backLabel,
// and the per-page `hover:text-X-XXX` accent class (drives Navbar prominence —
// currently navbar uses indigo, so we just standardize on the parent-lobby label).
const cfg = {
  "app/ludo/ai/page.tsx":          { slug: "ludo" },
  "app/ludo/local/page.tsx":       { slug: "ludo" },
  "app/ludo/online/page.tsx":      { slug: "ludo" },
  "app/go/ai/page.tsx":            { slug: "go" },
  "app/go/local/page.tsx":         { slug: "go" },
  "app/go/online/page.tsx":        { slug: "go" },
  "app/snake-ladder/ai/page.tsx":  { slug: "snake-ladder" },
  "app/snake-ladder/local/page.tsx": { slug: "snake-ladder" },
  "app/snake-ladder/online/page.tsx": { slug: "snake-ladder" },
  "app/tic-tac-toe/ai/page.tsx":   { slug: "tic-tac-toe" },
  "app/tic-tac-toe/local/page.tsx": { slug: "tic-tac-toe" },
  "app/tic-tac-toe/online/page.tsx": { slug: "tic-tac-toe" },
  "app/bingo/ai/page.tsx":         { slug: "bingo" },
  "app/bingo/local/page.tsx":      { slug: "bingo" },
  "app/bingo/online/page.tsx":     { slug: "bingo" },
};

function titleize(slug) {
  return slug.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");
}

const BODY_BLOCK = /\n {2}\/\/ Load theme\n {2}useEffect\(\(\) => \{\n {4}if \(typeof window !== "undefined"\) \{\n {6}const systemPrefersDark = window\.matchMedia\("\(prefers-color-scheme: dark\)"\)\.matches;\n {6}const initialTheme = systemPrefersDark \? "dark" : "light";\n {6}setTheme\(initialTheme\);\n {6}document\.documentElement\.classList\.toggle\("dark", systemPrefersDark\);\n {4}\}\n {2}\}, \[\]\);\n\n {2}const toggleTheme = \(\) => \{\n {4}const nextTheme = theme === "dark" \? "light" : "dark";\n {4}setTheme\(nextTheme\);\n {4}if \(typeof window !== "undefined"\) \{\n {6}document\.documentElement\.classList\.toggle\("dark", nextTheme === "dark"\);\n {4}\}\n {2}\};\n/;

const JSX_TOGGLE_BLOCK = / {6}\{\/\* Toggle Theme \*\/\}\n {6}<div className="absolute top-\d+ right-\d+ z-20">\n {8}<button \n {10}onClick=\{toggleTheme\} \n {10}title=\{`Switch to \$\{theme === "dark" \? "Light" : "Dark"\} Mode`\}\n {10}className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md rounded-2xl text-zinc-650 dark:text-zinc-400 hover:text-[a-z]+-\d+ dark:hover:text-white cursor-pointer active:scale-95 transition-all"\n {8}>\n {10}\{theme === "dark" \? <Sun className="w-5 h-5" \/> : <Moon className="w-5 h-5" \/>\}\n {8}<\/button>\n {6}<\/div>\n/;

// The lucide-react import block delete — remove `Sun, Moon, `.
// We'll also delete ArrowLeft if it's only used in the floating back link.
// To stay safe, delete only Sun, Moon from the import list (not ArrowLeft —
// many pages still use ArrowLeft inside modal back buttons).
const LUCIDE_IMPORT_RE = /^import \{([\s\S]*?)\} from "lucide-react";/m;

function removeSunMoonFromImport(importsStr) {
  return importsStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "Sun" && s !== "Moon" && s.length > 0)
    .join(", ");
}

function ensureNavbarImport(src) {
  if (src.includes(`import { Navbar } from "@/app/_components/navbar";`)) {
    return src;
  }
  // Insert Navbar import right after `import api from "@/lib/axios";` (if present),
  // otherwise after the first lucide-react import, otherwise at top after "use client".
  if (src.includes('import api from "@/lib/axios";')) {
    return src.replace(
      'import api from "@/lib/axios";',
      'import api from "@/lib/axios";\nimport { Navbar } from "@/app/_components/navbar";'
    );
  }
  // After lucide-react import line
  const m = src.match(/(import \{[\s\S]*?\} from "lucide-react";\n)/);
  if (m) {
    return src.replace(m[0], `${m[0]}import { Navbar } from "@/app/_components/navbar";\n`);
  }
  // Fallback: just before the closing marker of the last import.
  return src.replace(/(["'];)\n/, `$1\nimport { Navbar } from "@/app/_components/navbar";\n`);
}

function stripThemeState(src) {
  // Drop the standalone const [theme, setTheme] = useState<"light"|"dark">("dark");
  // line that's always the second/nth useState (right before the actual first state we keep).
  return src.replace(
    /\n  const \[theme, setTheme\] = useState<"light" \| "dark">\("dark"\);\n/,
    "\n"
  );
}

function navBarJsx(slug) {
  return `      <Navbar backHref="/${slug}" backLabel="Back to ${titleize(slug)} Lobby" />\n`;
}

let processedCount = 0;
const skipped = [];

for (const rel of modeFiles) {
  const file = path.resolve(rel);
  let src = fs.readFileSync(file, "utf8");
  const before = src;

  // 1. Strip theme state.
  src = stripThemeState(src);

  // 2. Strip the body useEffect/toggleTheme block.
  const newSrc1 = src.replace(BODY_BLOCK, "\n");
  if (newSrc1 === src) {
    skipped.push({ file: rel, reason: "body block not found" });
    continue;
  }
  src = newSrc1;

  // 3. Strip the JSX toggle block and replace with Navbar.
  const navReplacement = navBarJsx(cfg[rel].slug);
  const newSrc2 = src.replace(JSX_TOGGLE_BLOCK, navReplacement);
  if (newSrc2 === src) {
    skipped.push({ file: rel, reason: "JSX toggle block not found" });
    continue;
  }
  src = newSrc2;

  // 4. Strip Sun, Moon from the lucide-react import.
  src = src.replace(LUCIDE_IMPORT_RE, (match, body) => {
    return `import { ${removeSunMoonFromImport(body)} } from "lucide-react";`;
  });

  // 5. Add Navbar import.
  src = ensureNavbarImport(src);

  if (src === before) {
    skipped.push({ file: rel, reason: "no changes" });
    continue;
  }

  fs.writeFileSync(file, src, "utf8");
  processedCount++;
}

console.log(`Processed: ${processedCount}`);
if (skipped.length) {
  console.log("Skipped:");
  for (const s of skipped) console.log("  " + s.file + " — " + s.reason);
}
