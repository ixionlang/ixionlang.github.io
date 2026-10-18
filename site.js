"use strict";
const app = Elm.Main.init({ node: document.getElementById("elm-app") });
app.ports.copyCode.subscribe(async (source) => {
  try {
    await navigator.clipboard.writeText(source);
    app.ports.copyResult.send(true);
  } catch (_) {
    app.ports.copyResult.send(false);
  }
});
// Keep the example selector usable with the standard tab keyboard controls.
document.addEventListener("keydown", (event) => {
  if (event.target.getAttribute("role") !== "tab") return;
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const index = tabs.indexOf(event.target);
  let next;
  if (event.key === "ArrowDown" || event.key === "ArrowRight")
    next = (index + 1) % tabs.length;
  if (event.key === "ArrowUp" || event.key === "ArrowLeft")
    next = (index + tabs.length - 1) % tabs.length;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = tabs.length - 1;
  if (next === undefined) return;
  event.preventDefault();
  tabs[next].focus();
  tabs[next].click();
});
