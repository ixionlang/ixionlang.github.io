#!/usr/bin/env node
/**
 * Builds the static documentation site from the Markdown sources in docs/ and
 * spec/. The renderer intentionally has no dependencies: it supports the
 * Markdown subset used by the Ixion documentation (headings, paragraphs, lists,
 * tables, fenced code, links and inline formatting).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "https://github.com/ixionlang/ixion";

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const write = (rel, contents) => {
  const target = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
};

/* -------------------------------------------------------------------------- */
/* Text helpers                                                               */
/* -------------------------------------------------------------------------- */

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const plainText = (value) =>
  value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();

const slugify = (value) =>
  plainText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "")
    .replace(/\s+/g, "-");

const createSlugger = () => {
  const seen = new Map();
  return (value) => {
    const base = slugify(value) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
};

const relFrom = (fromRel, toRel) => {
  const fromDir = path.posix.dirname(fromRel);
  const rel = path.posix.relative(fromDir, toRel);
  return rel || path.posix.basename(toRel);
};

const pluralRu = (count, one, few, many) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
};

/* -------------------------------------------------------------------------- */
/* Syntax highlighting                                                        */
/* -------------------------------------------------------------------------- */

const token = (className, value) =>
  `<span class="tok-${className}">${escapeHtml(value)}</span>`;

const highlightWith = (source, regex, classify) => {
  let output = "";
  let last = 0;
  let match;

  regex.lastIndex = 0;
  while ((match = regex.exec(source)) !== null) {
    output += escapeHtml(source.slice(last, match.index));
    const className = classify(match);
    output += className ? token(className, match[0]) : escapeHtml(match[0]);
    last = regex.lastIndex;
  }
  output += escapeHtml(source.slice(last));
  return output;
};

const IXION_RE =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(use|type|enum|struct|def|return|case|const|var|with|lambda|if|else|while|for|pub|true|false)\b|\b(int|float|double|bool|char|string|unit|never|any)\b|\b(std|args|fs|strings|http|async)\b|\b([A-Z][A-Za-z0-9_]*)\b|\b(\d+(?:\.\d+)?[fFdD]?)\b|\b([a-z_][A-Za-z0-9_]*)(?=\s*\()/g;

const highlightIxion = (source) =>
  highlightWith(source, IXION_RE, (match) => {
    if (match[1]) return "com";
    if (match[2]) return "str";
    if (match[3]) return "kw";
    if (match[4]) return "type";
    if (match[5]) return "ns";
    if (match[6]) return "type";
    if (match[7]) return "num";
    if (match[8]) return "fn";
    return null;
  });

const SHELL_RE =
  /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'[^'\n]*')|\b(export|cd|java|javac|chmod|git|make|node|python3|gradlew|runIxion)\b|(\.\/[\w./-]+|\bgradlew(?:\.bat)?\b)|(?<![\w/.-])(--?[A-Za-z][\w-]*)|\b([A-Z][A-Z0-9_]*)\b/g;

const highlightShell = (source) =>
  highlightWith(source, SHELL_RE, (match) => {
    if (match[1]) return "com";
    if (match[2]) return "str";
    if (match[3]) return "kw";
    if (match[4]) return "fn";
    if (match[5]) return "flag";
    if (match[6]) return "type";
    return null;
  });

const EBNF_RE =
  /(;)|("(?:[^"\\]|\\.)*")|^([a-z_][a-z0-9_]*)(?=\s*=)|\b([A-Z][A-Z0-9_]*)\b|([{}[\]()])/gm;

const highlightEbnf = (source) =>
  highlightWith(source, EBNF_RE, (match) => {
    if (match[1]) return "op";
    if (match[2]) return "str";
    if (match[3]) return "kw";
    if (match[4]) return "type";
    if (match[5]) return "op";
    return null;
  });

const highlight = (source, language) => {
  switch (language) {
    case "ixion":
      return highlightIxion(source);
    case "sh":
    case "bash":
    case "shell":
    case "powershell":
      return highlightShell(source);
    case "ebnf":
      return highlightEbnf(source);
    default:
      return escapeHtml(source);
  }
};

/* -------------------------------------------------------------------------- */
/* Markdown parser                                                            */
/* -------------------------------------------------------------------------- */

const matchListItem = (line) => {
  const match = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
  if (!match) return null;
  return {
    indent: match[1].length,
    marker: match[2],
    ordered: /\d/.test(match[2]),
    text: match[3],
  };
};

const splitTableRow = (line) => {
  let source = line.trim();
  if (source.startsWith("|")) source = source.slice(1);
  if (source.endsWith("|")) source = source.slice(0, -1);

  const cells = [];
  let current = "";
  let inCode = false;

  for (const char of source) {
    if (char === "`") inCode = !inCode;
    if (char === "|" && !inCode) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
};

const isBlockStart = (line) =>
  /^```/.test(line) ||
  /^#{1,6}\s+/.test(line) ||
  /^(---+|\*\*\*+|___+)\s*$/.test(line) ||
  line.trimStart().startsWith("|") ||
  line.trimStart().startsWith(">") ||
  line.trimStart().startsWith("<!--") ||
  matchListItem(line) !== null;

const parseTable = (lines, start) => {
  const header = splitTableRow(lines[start]);
  const separator = splitTableRow(lines[start + 1] ?? "");
  if (!separator.length || !separator.every((cell) => /^:?-{3,}:?$/.test(cell))) {
    return null;
  }

  const align = separator.map((cell) => {
    if (cell.startsWith(":") && cell.endsWith(":")) return "center";
    if (cell.endsWith(":")) return "right";
    return "left";
  });

  const rows = [];
  let index = start + 2;
  while (index < lines.length && lines[index].trimStart().startsWith("|")) {
    const cells = splitTableRow(lines[index]);
    rows.push(
      Array.from({ length: header.length }, (_, column) => cells[column] ?? ""),
    );
    index += 1;
  }

  return {
    block: { type: "table", header, align, rows },
    next: index,
  };
};

const parseList = (lines, start) => {
  const first = matchListItem(lines[start]);
  if (!first) return null;

  const items = [];
  let current = null;
  let index = start;

  while (index < lines.length) {
    const line = lines[index];
    const item = matchListItem(line);

    if (item && item.indent === first.indent) {
      if (item.ordered !== first.ordered) break;
      current = { text: item.text };
      items.push(current);
      index += 1;
      continue;
    }

    if (!line.trim()) {
      let lookahead = index + 1;
      while (lookahead < lines.length && !lines[lookahead].trim()) lookahead += 1;
      if (lookahead >= lines.length) break;

      const nextItem = matchListItem(lines[lookahead]);
      if (
        nextItem &&
        nextItem.indent === first.indent &&
        nextItem.ordered === first.ordered
      ) {
        index = lookahead;
        continue;
      }

      const nextIndent = lines[lookahead].match(/^\s*/)[0].length;
      if (nextIndent > first.indent) {
        if (current) current.text += " ";
        index += 1;
        continue;
      }
      break;
    }

    const indent = line.match(/^\s*/)[0].length;
    if (indent > first.indent && current) {
      current.text += ` ${line.trim()}`;
      index += 1;
      continue;
    }

    break;
  }

  return {
    block: { type: "list", ordered: first.ordered, items: items.map((item) => item.text) },
    next: index,
  };
};

const codeLabel = (language, output, lang) => {
  if (output) return lang === "en" ? "Output" : "Вывод";
  switch (language) {
    case "ixion":
      return "Ixion";
    case "sh":
    case "bash":
    case "shell":
      return "Shell";
    case "powershell":
      return "PowerShell";
    case "ebnf":
      return "EBNF";
    case "text":
      return lang === "en" ? "Text" : "Текст";
    default:
      return language ? language.toUpperCase() : lang === "en" ? "Code" : "Код";
  }
};

const parseMarkdown = (source, context) => {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  const headings = [];
  const metadata = [];
  const slug = createSlugger();
  let title = null;
  let index = 0;
  let skippingContents = false;

  const pushHeading = (level, rawText) => {
    const text = rawText.trim();
    if (level === 1 && title === null) {
      title = plainText(text);
      return;
    }

    if (level === 2 && /^(Содержание|Contents)$/i.test(plainText(text))) {
      skippingContents = true;
      return;
    }

    const heading = { type: "heading", level, text, id: slug(text) };
    blocks.push(heading);
    headings.push(heading);
  };

  while (index < lines.length) {
    const line = lines[index];

    if (skippingContents) {
      if (/^#{1,2}\s+/.test(line)) {
        skippingContents = false;
      } else {
        index += 1;
        continue;
      }
    }

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const trimmed = line.trim();

    if (trimmed.startsWith("<!--")) {
      while (index < lines.length && !lines[index].includes("-->")) index += 1;
      index += 1;
      continue;
    }

    const fence = line.match(/^```(.*)$/);
    if (fence) {
      const language = fence[1].trim().toLowerCase();
      index += 1;
      const codeLines = [];
      while (index < lines.length && !/^```/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;

      const previous = blocks.at(-1);
      const output =
        language === "text" &&
        previous?.type === "paragraph" &&
        /(Вывод|Output):\s*$/i.test(previous.text);

      blocks.push({
        type: "code",
        language,
        code: codeLines.join("\n"),
        output,
        label: codeLabel(language, output, context.lang),
      });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      pushHeading(heading[1].length, heading[2]);
      index += 1;
      continue;
    }

    if (/^(---+|\*\*\*+|___+)\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }

    if (line.trimStart().startsWith("|")) {
      const table = parseTable(lines, index);
      if (table) {
        blocks.push(table.block);
        index = table.next;
        continue;
      }
    }

    const list = parseList(lines, index);
    if (list) {
      blocks.push(list.block);
      index = list.next;
      continue;
    }

    if (line.trimStart().startsWith(">")) {
      const quoteLines = [];
      while (index < lines.length && lines[index].trimStart().startsWith(">")) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join(" ") });
      continue;
    }

    const paragraphLines = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      (paragraphLines.length === 0 || !isBlockStart(lines[index]))
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    if (!paragraphLines.length) {
      paragraphLines.push(line.trim());
      index += 1;
    }

    const isMetadata = paragraphLines.every((item) => /^\*\*[^*]+:\*\*/.test(item));
    if (isMetadata) {
      metadata.push(...paragraphLines);
    } else {
      blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
    }
  }

  let seenSection = false;
  for (const block of blocks) {
    if (block.type === "heading" && block.level <= 2) {
      seenSection = true;
      break;
    }
    if (block.type === "paragraph") {
      block.lead = true;
      break;
    }
  }

  return { title, blocks, headings, metadata };
};

/* -------------------------------------------------------------------------- */
/* Inline rendering                                                           */
/* -------------------------------------------------------------------------- */

const rewriteUrl = (url, context) => {
  if (/^(https?:|mailto:|tel:|#)/.test(url)) return { href: url };

  const [pathname, hash] = url.split("#");
  if (!pathname) return { href: url };

  const target = path.posix.normalize(
    path.posix.join(path.posix.dirname(context.sourceRel), pathname),
  );

  if (pathname.endsWith(".md")) {
    if (!exists(target)) {
      return {
        missing: true,
        title:
          context.lang === "en"
            ? "This document is not published yet"
            : "Документ ещё не опубликован",
      };
    }
    const htmlTarget = target.replace(/\.md$/, ".html");
    return {
      href: relFrom(context.outputRel, htmlTarget) + (hash ? `#${hash}` : ""),
    };
  }

  if (pathname.endsWith(".ebnf") && exists(target)) {
    const htmlTarget = target.replace(/\.ebnf$/, ".html");
    return {
      href: relFrom(context.outputRel, htmlTarget) + (hash ? `#${hash}` : ""),
    };
  }

  return { href: url };
};

const renderInline = (value, context) => {
  const codeSpans = [];
  let source = value.replace(/`([^`]+)`/g, (_, code) => {
    const placeholder = `\u0000${codeSpans.length}\u0000`;
    codeSpans.push(`<code>${escapeHtml(code)}</code>`);
    return placeholder;
  });

  source = escapeHtml(source);

  source = source.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const resolved = rewriteUrl(url, context);
    if (resolved.missing) {
      return `<span class="doc-link-missing" title="${escapeHtml(resolved.title)}">${label}</span>`;
    }
    const external = /^https?:\/\//.test(resolved.href);
    const attributes = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${escapeHtml(resolved.href)}"${attributes}>${label}</a>`;
  });

  source = source.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  source = source.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  source = source.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  source = source.replace(/\u0000(\d+)\u0000/g, (_, number) => codeSpans[Number(number)]);
  return source;
};

/* -------------------------------------------------------------------------- */
/* Block rendering                                                            */
/* -------------------------------------------------------------------------- */

const renderCode = (block, context) => {
  const language = block.language || "text";
  const className = `code-block${block.output ? " code-block-output" : ""}`;
  return `<div class="${className}" data-lang="${escapeHtml(language)}">
  <div class="code-block-bar">
    <span class="code-lang">${escapeHtml(block.label)}</span>
    <button class="code-copy" type="button" aria-label="${escapeHtml(context.copyLabel)}" data-copied-label="${escapeHtml(context.copiedLabel)}" data-failed-label="${escapeHtml(context.failedLabel)}">${escapeHtml(context.copyLabel)}</button>
  </div>
  <pre tabindex="0"><code class="language-${escapeHtml(language)}">${highlight(block.code, language)}</code></pre>
</div>`;
};

const renderTable = (block, context) => {
  const header = block.header
    .map(
      (cell, column) =>
        `<th class="align-${block.align[column]}">${renderInline(cell, context)}</th>`,
    )
    .join("");
  const body = block.rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell, column) =>
              `<td class="align-${block.align[column]}">${renderInline(cell, context)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");

  return `<div class="table-wrap"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
};

const renderBlock = (block, context) => {
  switch (block.type) {
    case "heading": {
      const tag = `h${block.level}`;
      return `<${tag} id="${block.id}">${renderInline(block.text, context)}<a class="heading-anchor" href="#${block.id}" aria-label="${escapeHtml(context.anchorLabel)}">#</a></${tag}>`;
    }
    case "paragraph":
      return `<p${block.lead ? ' class="doc-lead"' : ""}>${renderInline(block.text, context)}</p>`;
    case "code":
      return renderCode(block, context);
    case "table":
      return renderTable(block, context);
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      return `<${tag}>${block.items
        .map((item) => `<li>${renderInline(item, context)}</li>`)
        .join("")}</${tag}>`;
    }
    case "blockquote":
      return `<blockquote><p>${renderInline(block.text, context)}</p></blockquote>`;
    case "hr":
      return "<hr>";
    default:
      return "";
  }
};

/* -------------------------------------------------------------------------- */
/* Page chrome                                                                */
/* -------------------------------------------------------------------------- */

const UI = {
  ru: {
    skip: "К содержимому",
    menu: "Содержание",
    closeMenu: "Закрыть меню",
    navLabel: "Основная навигация",
    home: "Главная",
    guide: "Руководство",
    spec: "Спецификация",
    grammar: "Грамматика",
    docs: "Документация",
    github: "GitHub ↗",
    search: "Найти раздел…",
    searchLabel: "Поиск по разделам",
    noResults: "Разделы не найдены",
    toc: "Содержание документа",
    onPage: "На этой странице",
    copy: "Копировать",
    copied: "Скопировано",
    failed: "Не удалось",
    anchor: "Ссылка на раздел",
    next: "Дальше",
    backToTop: "Наверх ↑",
    overview: "Обзор документации",
    footerNote: "Открытый исходный код · Язык для JVM",
    issue: "Нашли ошибку? Откройте issue",
    breadcrumbDocs: "Документация",
    source: "Исходный документ",
  },
  en: {
    skip: "Skip to content",
    menu: "Contents",
    closeMenu: "Close menu",
    navLabel: "Main navigation",
    home: "Home",
    guide: "Guide (RU)",
    spec: "Specification",
    grammar: "Grammar",
    docs: "Documentation",
    github: "GitHub ↗",
    search: "Find a section…",
    searchLabel: "Search sections",
    noResults: "No sections found",
    toc: "Document contents",
    onPage: "On this page",
    copy: "Copy",
    copied: "Copied",
    failed: "Copy failed",
    anchor: "Link to section",
    next: "Next",
    backToTop: "Back to top ↑",
    overview: "Documentation overview",
    footerNote: "Open source · A language for the JVM",
    issue: "Found a mistake? Open an issue",
    breadcrumbDocs: "Documentation",
    source: "Source document",
  },
};

const headerNav = (lang, active, prefix, hasSidebar) => {
  const ui = UI[lang];
  const guideHref = `${prefix}docs/ru.html`;
  const specHref =
    lang === "en"
      ? `${prefix}spec/specification.en.html`
      : `${prefix}spec/specification.ru.html`;
  const grammarHref = `${prefix}spec/grammar.html`;
  const activeClass = (key) => (active === key ? ' class="active"' : "");

  return `<div class="docs-header-bar">
  <header class="site-header docs-header wrap">
    <a class="brand" href="${prefix}index.html" aria-label="Ixion — ${ui.home}">
      <img src="${prefix}assets/ixion-logo.png" alt="ixion" width="126" height="42" />
    </a>
    <nav class="docs-nav" aria-label="${ui.navLabel}">
      <a href="${guideHref}"${activeClass("guide")}>${ui.guide}</a>
      <a href="${specHref}"${activeClass("spec")}>${ui.spec}</a>
      <a href="${grammarHref}"${activeClass("grammar")}>${ui.grammar}</a>
      <a class="docs-github" href="${REPO}" target="_blank" rel="noopener noreferrer">${ui.github}</a>
    </nav>
    ${
      hasSidebar
        ? `<button class="docs-menu-toggle" type="button" aria-controls="docs-sidebar" aria-expanded="false">
      <span aria-hidden="true">☰</span> ${ui.menu}
    </button>`
        : ""
    }
  </header>
</div>`;
};

const footer = (lang, prefix) => {
  const ui = UI[lang];
  const specHref =
    lang === "en"
      ? `${prefix}spec/specification.en.html`
      : `${prefix}spec/specification.ru.html`;
  return `<footer class="docs-footer">
  <a class="footer-brand" href="${prefix}index.html">ixion</a>
  <p>${ui.footerNote}</p>
  <nav aria-label="${ui.navLabel}">
    <a href="${prefix}docs/ru.html">${ui.guide}</a>
    <a href="${specHref}">${ui.spec}</a>
    <a href="${REPO}" target="_blank" rel="noopener noreferrer">${ui.github}</a>
  </nav>
</footer>`;
};

const pageShell = ({
  lang,
  title,
  description,
  prefix,
  active,
  body,
  bodyClass = "docs-page",
  hasSidebar = true,
  progress = true,
}) => `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#f8f7f4" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <title>${escapeHtml(title)} — Ixion</title>
    <link rel="icon" type="image/png" href="${prefix}assets/ixion-planet.png" />
    <link rel="stylesheet" href="${prefix}style.css" />
    <link rel="stylesheet" href="${prefix}assets/docs.css" />
  </head>
  <body class="${bodyClass}">
    <a class="skip-link" href="#main">${UI[lang].skip}</a>
    ${headerNav(lang, active, prefix, hasSidebar)}
    ${progress ? '<div class="reading-progress" aria-hidden="true"><span></span></div>' : ""}
    ${body}
    ${footer(lang, prefix)}
    <script src="${prefix}assets/docs.js" defer></script>
  </body>
</html>
`;

const renderSidebarToc = (headings, context) => {
  const groups = [];
  for (const heading of headings) {
    if (heading.level === 2) {
      groups.push({ heading, children: [] });
    } else if (heading.level === 3) {
      if (!groups.length) groups.push({ heading: null, children: [] });
      groups.at(-1).children.push(heading);
    }
  }

  return groups
    .map(({ heading, children }) => {
      const main = heading
        ? `<a class="toc-link toc-level-2" href="#${heading.id}">${renderInline(heading.text, context)}</a>`
        : "";
      const sub = children.length
        ? `<div class="toc-sub">${children
            .map(
              (child) =>
                `<a class="toc-link toc-level-3" href="#${child.id}">${renderInline(child.text, context)}</a>`,
            )
            .join("")}</div>`
        : "";
      return `<div class="toc-section">${main}${sub}</div>`;
    })
    .join("");
};

const renderPageToc = (headings, context) => {
  if (headings.length < 3) return "";
  return `<p class="page-toc-title">${UI[context.lang].onPage}</p>
  <nav class="page-toc" aria-label="${UI[context.lang].onPage}">
    ${headings
      .map(
        (heading) =>
          `<a href="#${heading.id}">${renderInline(heading.text, context)}</a>`,
      )
      .join("")}
  </nav>`;
};

const languageSwitch = (languages) => {
  if (!languages?.length) return "";
  return `<div class="doc-lang-switch" aria-label="Language">
    ${languages
      .map((language) =>
        language.active
          ? `<span class="active">${language.label}</span>`
          : `<a href="${language.href}">${language.label}</a>`,
      )
      .join("")}
  </div>`;
};

const validateAnchors = (html, label) => {
  const ids = new Set(
    [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]),
  );
  const missing = [
    ...new Set(
      [...html.matchAll(/href="#([^"]+)"/g)]
        .map((match) => match[1])
        .filter((id) => !ids.has(id)),
    ),
  ];
  if (missing.length) {
    console.warn(`[docs] ${label}: missing anchors: ${missing.join(", ")}`);
  }
};

/* -------------------------------------------------------------------------- */
/* Document configurations                                                    */
/* -------------------------------------------------------------------------- */

const documents = [
  {
    key: "guide",
    source: "docs/ru.md",
    output: "docs/ru.html",
    lang: "ru",
    active: "guide",
    eyebrow: "РУКОВОДСТВО",
    title: "Руководство для начинающих",
    subtitle:
      "Пошаговое введение в язык Ixion: от первой программы до обобщённых типов, модулей и стандартной библиотеки.",
    description:
      "Руководство по языку программирования Ixion для начинающих: синтаксис, типы, списки, структуры, enum, сопоставление с образцом и модули.",
    languages: [{ label: "RU", active: true }],
    next: {
      href: "../spec/specification.ru.html",
      eyebrow: "ДАЛЬШЕ",
      title: "Спецификация языка",
      text: "Нормативный контракт Core 1.0: система типов, вычисление и полная грамматика.",
    },
  },
  {
    key: "spec-ru",
    source: "spec/specification.ru.md",
    output: "spec/specification.ru.html",
    lang: "ru",
    active: "spec",
    eyebrow: "СПЕЦИФИКАЦИЯ",
    title: "Спецификация языка Ixion",
    subtitle:
      "Нормативный контракт Ixion Core 1.0: статическая корректность, вычисление, операторы и грамматика языка.",
    description:
      "Спецификация языка Ixion Core 1.0: область определения, система типов, вычисление, операторы, шаблоны и полная синтаксическая грамматика.",
    languages: [
      { label: "RU", active: true },
      { label: "EN", href: "specification.en.html" },
    ],
    next: {
      href: "../docs/ru.html",
      eyebrow: "ДАЛЬШЕ",
      title: "Руководство для начинающих",
      text: "Практическое введение в язык с примерами и упражнениями.",
    },
  },
  {
    key: "spec-en",
    source: "spec/specification.en.md",
    output: "spec/specification.en.html",
    lang: "en",
    active: "spec",
    eyebrow: "SPECIFICATION",
    title: "Ixion Language Specification",
    subtitle:
      "The normative Ixion Core 1.0 contract: static validity, evaluation, operators and the complete grammar.",
    description:
      "The Ixion Core 1.0 language specification: scope, type system, evaluation, operators, patterns and the complete syntactic grammar.",
    languages: [
      { label: "RU", href: "specification.ru.html" },
      { label: "EN", active: true },
    ],
    next: {
      href: "../docs/ru.html",
      eyebrow: "NEXT",
      title: "Beginner's guide",
      text: "A practical, example-driven introduction to the language (in Russian).",
    },
  },
];

/* -------------------------------------------------------------------------- */
/* Document builder                                                           */
/* -------------------------------------------------------------------------- */

const buildDocument = (config) => {
  const ui = UI[config.lang];
  const context = {
    lang: config.lang,
    sourceRel: config.source,
    outputRel: config.output,
    copyLabel: ui.copy,
    copiedLabel: ui.copied,
    failedLabel: ui.failed,
    anchorLabel: ui.anchor,
  };

  const parsed = parseMarkdown(read(config.source), context);
  const title = parsed.title || config.title;
  const sectionCount = parsed.headings.filter((heading) => heading.level === 2).length;

  const meta = parsed.metadata.length
    ? parsed.metadata
    : [
        `**${config.lang === "en" ? "Language" : "Язык"}:** ${config.lang.toUpperCase()}`,
        `**${config.lang === "en" ? "Sections" : "Разделов"}:** ${sectionCount}`,
      ];

  const article = parsed.blocks.map((block) => renderBlock(block, context)).join("\n");
  const sidebarToc = renderSidebarToc(parsed.headings, context);
  const pageToc = renderPageToc(
    parsed.headings.filter((heading) => heading.level === 2),
    context,
  );

  const body = `<div class="docs-layout">
  <button class="docs-overlay" type="button" aria-label="${ui.closeMenu}" tabindex="-1"></button>
  <aside class="docs-sidebar" id="docs-sidebar">
    <button class="docs-menu-close" type="button" aria-label="${ui.closeMenu}"><span aria-hidden="true">×</span></button>
    <p class="sidebar-eyebrow">${config.eyebrow}</p>
    <a class="sidebar-title" href="${path.posix.basename(config.output)}">${escapeHtml(title)}</a>
    <p class="sidebar-meta">${config.lang.toUpperCase()} · ${sectionCount} ${
      config.lang === "en"
        ? sectionCount === 1
          ? "section"
          : "sections"
        : pluralRu(sectionCount, "раздел", "раздела", "разделов")
    }</p>
    <label class="docs-search">
      <span class="visually-hidden">${ui.searchLabel}</span>
      <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5"></circle><path d="m10.5 10.5 3 3"></path></svg>
      <input type="search" placeholder="${ui.search}" aria-label="${ui.searchLabel}" autocomplete="off" />
    </label>
    <nav class="docs-toc" aria-label="${ui.toc}">
      ${sidebarToc}
      <p class="toc-empty">${ui.noResults}</p>
    </nav>
    <div class="sidebar-footer">
      <a href="${REPO}/issues" target="_blank" rel="noopener noreferrer">${ui.issue} ↗</a>
    </div>
  </aside>
  <main class="docs-main" id="main">
    <div class="doc-hero">
      <div class="doc-breadcrumb">
        <a href="../docs/index.html">${ui.breadcrumbDocs}</a>
        <span aria-hidden="true">/</span>
        <span>${config.eyebrow.toLowerCase()}</span>
      </div>
      <div class="doc-hero-row">
        <div>
          <h1>${escapeHtml(title)}</h1>
          <p class="doc-subtitle">${escapeHtml(config.subtitle)}</p>
        </div>
        ${languageSwitch(config.languages)}
      </div>
      <div class="doc-meta">${meta.map((item) => `<span>${renderInline(item, context)}</span>`).join("")}</div>
    </div>
    <article class="doc-content">
      ${article}
    </article>
    <nav class="doc-next" aria-label="${ui.next}">
      <a href="${config.next.href}">
        <span class="next-eyebrow">${config.next.eyebrow}</span>
        <span class="next-title">${config.next.title}</span>
        <span class="next-text">${config.next.text}</span>
      </a>
      <a class="doc-top-link" href="#main">${ui.backToTop}</a>
    </nav>
  </main>
  <aside class="docs-aside">${pageToc}</aside>
</div>`;

  const html = pageShell({
    lang: config.lang,
    title: config.title,
    description: config.description,
    prefix: "../",
    active: config.active,
    body,
  });

  validateAnchors(html, config.output);
  write(config.output, html);
  console.log(`[docs] ${config.output} (${sectionCount} sections)`);
  return { ...config, title, parsed, sectionCount };
};

/* -------------------------------------------------------------------------- */
/* Grammar page                                                               */
/* -------------------------------------------------------------------------- */

const buildGrammar = () => {
  const lang = "ru";
  const ui = UI[lang];
  const source = read("spec/grammar.ebnf");
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const productions = [];

  for (const line of lines) {
    const start = line.match(/^([a-z_][a-z0-9_]*)\s*=/);
    if (start) {
      productions.push({ name: start[1], lines: [line] });
    } else if (productions.length) {
      productions.at(-1).lines.push(line);
    }
  }

  const context = {
    lang,
    sourceRel: "spec/grammar.ebnf",
    outputRel: "spec/grammar.html",
    copyLabel: ui.copy,
    copiedLabel: ui.copied,
    failedLabel: ui.failed,
    anchorLabel: ui.anchor,
  };

  const sidebarToc = productions
    .map(
      (production) =>
        `<div class="toc-section"><a class="toc-link toc-level-2" href="#prod-${production.name}">${production.name}</a></div>`,
    )
    .join("");

  const article = `<p class="doc-lead">Полная синтаксическая грамматика Ixion в нотации EBNF. Правила сгруппированы по объявлениям и выражениям; каждое правило можно открыть по прямой ссылке.</p>
<p>Машиночитаемая копия: <a href="grammar.ebnf">grammar.ebnf</a>.</p>
<div class="grammar-list">
${productions
  .map(
    (production) => `<section class="grammar-item" id="prod-${production.name}">
  <h2>${production.name}<a class="heading-anchor" href="#prod-${production.name}" aria-label="${ui.anchor}">#</a></h2>
  <pre class="grammar-code" tabindex="0"><code class="language-ebnf">${highlight(production.lines.join("\n").replace(/\s+$/, ""), "ebnf")}</code></pre>
</section>`,
  )
  .join("\n")}
</div>`;

  const body = `<div class="docs-layout docs-layout-narrow">
  <button class="docs-overlay" type="button" aria-label="${ui.closeMenu}" tabindex="-1"></button>
  <aside class="docs-sidebar" id="docs-sidebar">
    <button class="docs-menu-close" type="button" aria-label="${ui.closeMenu}"><span aria-hidden="true">×</span></button>
    <p class="sidebar-eyebrow">СПРАВОЧНИК</p>
    <a class="sidebar-title" href="grammar.html">Грамматика Ixion</a>
    <p class="sidebar-meta">EBNF · ${productions.length} ${pluralRu(productions.length, "правило", "правила", "правил")}</p>
    <label class="docs-search">
      <span class="visually-hidden">${ui.searchLabel}</span>
      <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5"></circle><path d="m10.5 10.5 3 3"></path></svg>
      <input type="search" placeholder="${ui.search}" aria-label="${ui.searchLabel}" autocomplete="off" />
    </label>
    <nav class="docs-toc" aria-label="${ui.toc}">
      ${sidebarToc}
      <p class="toc-empty">${ui.noResults}</p>
    </nav>
    <div class="sidebar-footer">
      <a href="../spec/specification.ru.html">Спецификация языка ↗</a>
    </div>
  </aside>
  <main class="docs-main" id="main">
    <div class="doc-hero">
      <div class="doc-breadcrumb">
        <a href="../docs/index.html">${ui.breadcrumbDocs}</a>
        <span aria-hidden="true">/</span>
        <span>грамматика</span>
      </div>
      <div class="doc-hero-row">
        <div>
          <h1>Грамматика Ixion</h1>
          <p class="doc-subtitle">Полная синтаксическая грамматика языка в нотации EBNF.</p>
        </div>
        <div class="doc-lang-switch"><span class="active">EBNF</span></div>
      </div>
      <div class="doc-meta"><span><strong>Правил:</strong> ${productions.length}</span><span><a href="grammar.ebnf">Скачать .ebnf</a></span></div>
    </div>
    <article class="doc-content grammar-content">
      ${article}
    </article>
    <nav class="doc-next" aria-label="${ui.next}">
      <a href="../spec/specification.ru.html">
        <span class="next-eyebrow">ДАЛЬШЕ</span>
        <span class="next-title">Спецификация языка</span>
        <span class="next-text">Нормативное описание типов, вычисления и синтаксиса.</span>
      </a>
      <a class="doc-top-link" href="#main">${ui.backToTop}</a>
    </nav>
  </main>
</div>`;

  const html = pageShell({
    lang,
    title: "Грамматика Ixion",
    description:
      "Полная синтаксическая грамматика языка Ixion в нотации EBNF.",
    prefix: "../",
    active: "grammar",
    body,
    bodyClass: "docs-page grammar-page",
  });

  validateAnchors(html, "spec/grammar.html");
  write("spec/grammar.html", html);
  console.log(`[docs] spec/grammar.html (${productions.length} productions)`);
  return { productions };
};

/* -------------------------------------------------------------------------- */
/* Documentation hub                                                          */
/* -------------------------------------------------------------------------- */

const buildHub = (builtDocuments) => {
  const lang = "ru";
  const guide = builtDocuments.find((document) => document.key === "guide");
  const spec = builtDocuments.find((document) => document.key === "spec-ru");
  const grammar = builtDocuments.find((document) => document.key === "grammar");
  const guideSections = guide?.sectionCount ?? 0;
  const specSections = spec?.sectionCount ?? 0;
  const grammarRules = grammar?.productions.length ?? 0;

  const body = `<main class="hub-main" id="main">
  <section class="hub-hero">
    <p class="eyebrow">ДОКУМЕНТАЦИЯ</p>
    <h1>Всё о языке <span>Ixion</span></h1>
    <p class="hub-lead">Руководство для начинающих, нормативная спецификация и полная грамматика — в одном месте. Начните с практики или перейдите к точному контракту языка.</p>
  </section>

  <section class="hub-grid" aria-label="Разделы документации">
    <a class="hub-card" href="ru.html">
      <span class="card-number">01</span>
      <h2>Руководство для начинающих</h2>
      <p>Пошаговое введение: первая программа, типы, списки, структуры, enum, сопоставление с образцом, модули и стандартная библиотека.</p>
      <span class="card-foot">
        <span class="card-tags"><span>RU</span><span>${guideSections} ${pluralRu(guideSections, "раздел", "раздела", "разделов")}</span></span>
        <span class="card-arrow" aria-hidden="true">↗</span>
      </span>
    </a>
    <a class="hub-card" href="../spec/specification.ru.html">
      <span class="card-number">02</span>
      <h2>Спецификация языка</h2>
      <p>Нормативный контракт Ixion Core 1.0: статическая корректность, система типов, вычисление, операторы и шаблоны.</p>
      <span class="card-foot">
        <span class="card-tags"><span>RU</span><span>EN</span><span>${specSections} ${pluralRu(specSections, "раздел", "раздела", "разделов")}</span></span>
        <span class="card-arrow" aria-hidden="true">↗</span>
      </span>
    </a>
    <a class="hub-card" href="../spec/grammar.html">
      <span class="card-number">03</span>
      <h2>Грамматика</h2>
      <p>Полная синтаксическая грамматика языка в нотации EBNF. Удобный справочник с прямыми ссылками на каждое правило.</p>
      <span class="card-foot">
        <span class="card-tags"><span>EBNF</span><span>${grammarRules} ${pluralRu(grammarRules, "правило", "правила", "правил")}</span></span>
        <span class="card-arrow" aria-hidden="true">↗</span>
      </span>
    </a>
  </section>

  <section class="hub-note">
    <div>
      <p class="eyebrow">С ЧЕГО НАЧАТЬ</p>
      <h2>Если вы только знакомитесь с языком</h2>
      <p>Откройте руководство и пройдите разделы по порядку. Каждая тема опирается на предыдущие, а примеры можно запускать локально.</p>
      <a class="text-link" href="ru.html">Открыть руководство →</a>
    </div>
    <div>
      <p class="eyebrow">ТОЧНЫЙ КОНТРАКТ</p>
      <h2>Если нужны нормативные правила</h2>
      <p>Спецификация описывает статическую корректность, вычисление и границы языка. Английская и русская версии задают один контракт.</p>
      <a class="text-link" href="../spec/specification.ru.html">Открыть спецификацию →</a>
    </div>
  </section>

  <section class="hub-quick">
    <p class="eyebrow">БЫСТРЫЕ ССЫЛКИ</p>
    <div class="quick-links">
      <a href="ru.html#первая-программа">Первая программа</a>
      <a href="ru.html#значения-и-базовые-типы">Базовые типы</a>
      <a href="ru.html#структуры-и-обновление-with">Структуры</a>
      <a href="ru.html#enum-несколько-форм-одного-типа">Enum</a>
      <a href="ru.html#case-и-шаблоны">Case и шаблоны</a>
      <a href="ru.html#модули-и-несколько-файлов">Модули</a>
      <a href="ru.html#стандартные-модули">Стандартные модули</a>
    </div>
  </section>
</main>`;

  const html = pageShell({
    lang,
    title: "Документация Ixion",
    description:
      "Документация языка программирования Ixion: руководство для начинающих, спецификация Core 1.0 и грамматика в EBNF.",
    prefix: "../",
    active: "docs",
    body,
    bodyClass: "docs-page docs-hub-page",
    hasSidebar: false,
    progress: false,
  });

  validateAnchors(html, "docs/index.html");
  write("docs/index.html", html);
  console.log("[docs] docs/index.html");
};

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

const built = documents.map(buildDocument);
const grammar = buildGrammar();
built.push({ key: "grammar", ...grammar });
buildHub(built);

console.log("[docs] done");
