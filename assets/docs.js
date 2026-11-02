"use strict";

(() => {
  const body = document.body;
  const mobile = () => window.matchMedia("(max-width: 900px)").matches;
  const menuButton = document.querySelector(".docs-menu-toggle");
  const closeButton = document.querySelector(".docs-menu-close");
  const sidebar = document.querySelector(".docs-sidebar");
  const overlay = document.querySelector(".docs-overlay");
  const search = document.querySelector(".docs-search input");
  const toc = document.querySelector(".docs-toc");
  const sections = [...document.querySelectorAll(".toc-section")];
  const empty = document.querySelector(".toc-empty");

  const closeMenu = () => {
    body.classList.remove("docs-nav-open");
    menuButton?.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    body.classList.add("docs-nav-open");
    menuButton?.setAttribute("aria-expanded", "true");
  };

  menuButton?.addEventListener("click", () => {
    if (body.classList.contains("docs-nav-open")) closeMenu();
    else openMenu();
  });

  overlay?.addEventListener("click", closeMenu);
  closeButton?.addEventListener("click", closeMenu);

  sidebar?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (mobile()) closeMenu();
    });
  });

  const isTyping = (target) =>
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      if (search && document.activeElement === search) search.blur();
      return;
    }

    if (event.key === "/" && !isTyping(event.target) && search) {
      event.preventDefault();
      if (mobile()) openMenu();
      search.focus();
      search.select();
    }
  });

  /* Section filter -------------------------------------------------------- */

  const filterSections = () => {
    if (!search) return;
    const query = search.value.trim().toLowerCase();
    let visible = 0;

    for (const section of sections) {
      const title = section.querySelector(".toc-level-2");
      const titleMatches =
        !query || (title?.textContent ?? "").toLowerCase().includes(query);
      let childMatches = false;

      for (const child of section.querySelectorAll(".toc-level-3")) {
        const matches =
          !query ||
          titleMatches ||
          child.textContent.toLowerCase().includes(query);
        child.hidden = !matches;
        if (matches) childMatches = true;
      }

      const show = titleMatches || childMatches;
      section.hidden = !show;
      if (show) visible += 1;
    }

    toc?.classList.toggle("is-empty", visible === 0);
    if (empty) empty.hidden = visible !== 0;
  };

  search?.addEventListener("input", filterSections);
  search?.addEventListener("search", filterSections);

  /* Copy code ------------------------------------------------------------- */

  const copyText = async (value) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) throw new Error("copy failed");
  };

  document.querySelectorAll(".code-copy").forEach((button) => {
    button.addEventListener("click", async () => {
      const block = button.closest(".code-block");
      const code = block?.querySelector("code")?.textContent ?? "";
      const original = button.dataset.label || button.textContent;

      try {
        await copyText(code);
        button.dataset.label = original;
        button.textContent = button.dataset.copiedLabel || "Скопировано";
        button.classList.add("is-copied");
        window.setTimeout(() => {
          button.textContent = original;
          button.classList.remove("is-copied");
        }, 1600);
      } catch (_) {
        button.dataset.label = original;
        button.textContent = button.dataset.failedLabel || "Не удалось";
        window.setTimeout(() => {
          button.textContent = original;
        }, 1600);
      }
    });
  });

  /* Reading progress ------------------------------------------------------ */

  const progress = document.querySelector(".reading-progress span");

  const updateProgress = () => {
    if (!progress) return;
    const root = document.documentElement;
    const max = root.scrollHeight - root.clientHeight;
    const value = max > 0 ? (root.scrollTop / max) * 100 : 0;
    progress.style.width = `${Math.min(100, Math.max(0, value))}%`;
  };

  /* Active section -------------------------------------------------------- */

  const headings = [
    ...document.querySelectorAll(
      ".doc-content h2[id], .doc-content h3[id], .grammar-item[id]"
    ),
  ];
  const sidebarLinks = [...document.querySelectorAll(".docs-toc a")];
  const pageLinks = [...document.querySelectorAll(".page-toc a")];
  const pageHeadings = headings.filter((heading) => heading.tagName === "H2");

  const markActive = (links, id) => {
    for (const link of links) {
      link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
    }
  };

  const updateActive = () => {
    if (!headings.length) return;
    const offset = 128;
    let current = headings[0];
    let currentSection = pageHeadings[0];

    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= offset) current = heading;
      else break;
    }

    for (const heading of pageHeadings) {
      if (heading.getBoundingClientRect().top <= offset) currentSection = heading;
      else break;
    }

    markActive(sidebarLinks, current.id);
    if (currentSection) markActive(pageLinks, currentSection.id);
  };

  let frame = 0;
  const onScroll = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      updateProgress();
      updateActive();
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  updateProgress();
  updateActive();
})();
