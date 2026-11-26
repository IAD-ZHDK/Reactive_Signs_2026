// Shared keyboard switcher for the team posters.
// Used by the exhibition page and the Room Tracking view so switching behaves
// identically everywhere. The team list comes from teams.js (window.teams).
//
// Usage:
//   initPosterSwitcher({ frame: "poster", label: "posterLabel", basePath: "Teams/" });
//
// Options:
//   frame     iframe element or its id (required) — gets its src swapped
//   label     label element or its id (optional) — shows "Team X (n/total)"
//   basePath  path prefix to the Teams folder ("Teams/" or "../Teams/")
//   onChange  optional callback(poster, index) after each switch
//
// Keys: ← / → (or ↑ / ↓) step through teams, 1–9 jump to a team.
function initPosterSwitcher(options) {
  options = options || {};

  const list =
    Array.isArray(window.teams) && window.teams.length
      ? window.teams
      : [{ folder: "Example", label: "Example" }];

  const el = (ref) =>
    typeof ref === "string" ? document.getElementById(ref) : ref;
  const frame = el(options.frame);
  const label = el(options.label);
  const base = options.basePath || "Teams/";

  let current = 0;

  function show(index) {
    current = (index + list.length) % list.length;
    const poster = list[current];
    if (frame) frame.src = base + poster.folder + "/index.html";
    if (label) {
      label.textContent =
        poster.label + "  (" + (current + 1) + "/" + list.length + ")";
      label.classList.add("visible");
      clearTimeout(show._t);
      show._t = setTimeout(() => label.classList.remove("visible"), 2000);
    }
    if (typeof options.onChange === "function") options.onChange(poster, current);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") show(current + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") show(current - 1);
    else if (event.key >= "1" && event.key <= "9") {
      const n = Number(event.key) - 1;
      if (n < list.length) show(n);
    }
  });

  // Show the label briefly on load so it's clear which poster is up.
  show(0);

  return {
    show,
    next: () => show(current + 1),
    prev: () => show(current - 1),
  };
}
