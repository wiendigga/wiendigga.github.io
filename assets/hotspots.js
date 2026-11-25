// Draws a faint coloured shape over each leaf/page that holds a project,
// shows a hint card on hover or focus, and on touch screens opens the
// card on the first tap and the project on the second.
(function () {
  const SLOTS = window.WIENDIGGA_SLOTS || {};
  const PROJECTS = window.WIENDIGGA_PROJECTS || [];
  const PALETTE = ["#e4572e", "#2e86ab", "#f2a541", "#3bb273", "#7768ae"];
  const SVG_NS = "http://www.w3.org/2000/svg";
  // Traced paths are stored at 4x scale with a flipped y axis.
  const PATH_TRANSFORM = "matrix(0.25 0 0 -0.25 0 768)";

  const stage = document.getElementById("stage");
  const svg = document.getElementById("hotspots");
  const card = document.getElementById("card");
  let active = null;
  let touch = window.matchMedia("(hover: none)").matches;
  let wasActive = false;

  PROJECTS.forEach((p, i) => {
    const slot = SLOTS[p.slot];
    if (!slot) { console.warn("Unknown slot", p.slot); return; }
    const a = document.createElementNS(SVG_NS, "a");
    a.setAttribute("href", p.url);
    a.setAttribute("class", "spot");
    a.setAttribute("aria-label", p.name + ": " + p.hint);
    a.style.setProperty("--tint", p.color || PALETTE[i % PALETTE.length]);
    a.style.setProperty("--delay", (i * 1.7) + "s");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", slot.d);
    path.setAttribute("transform", PATH_TRANSFORM);
    // Invisible wider outline so small leaves are easy to hit with a finger.
    const hit = path.cloneNode();
    hit.setAttribute("class", "hit");
    a.append(hit, path);
    svg.appendChild(a);

    const show = () => open(a, p, slot);
    a.addEventListener("pointerdown", (e) => {
      touch = e.pointerType !== "mouse";
      wasActive = active === a;
    });
    a.addEventListener("mouseenter", () => { if (!touch) show(); });
    a.addEventListener("mouseleave", () => { if (!touch) close(); });
    a.addEventListener("focus", () => { if (!touch) show(); });
    a.addEventListener("blur", () => { if (!touch) close(); });
    // Touch: first tap shows the card, second tap opens the project.
    a.addEventListener("click", (e) => {
      if (touch && !wasActive) { e.preventDefault(); show(); }
      wasActive = false;
    });
  });

  function open(a, p, slot) {
    if (active) active.classList.remove("on");
    active = a;
    a.classList.add("on");
    card.innerHTML = "";
    if (p.thumb) {
      const img = document.createElement("img");
      img.src = p.thumb; img.alt = "";
      card.appendChild(img);
    }
    const t = document.createElement("strong"); t.textContent = p.name;
    const h = document.createElement("span"); h.textContent = p.hint;
    card.append(t, h);
    if (touch) {
      const link = document.createElement("a");
      link.href = p.url; link.textContent = "Open →";
      card.appendChild(link);
    }
    card.style.setProperty("--tint", a.style.getPropertyValue("--tint"));
    card.hidden = false;
    place(slot.box);
  }

  function place(box) {
    // Image coords -> stage px. Card sits above the shape, or below if no room.
    const s = stage.clientWidth / 1408;
    const cx = (box[0] + box[2]) / 2 * s;
    const top = box[1] * s, bottom = box[3] * s;
    const w = card.offsetWidth, h = card.offsetHeight, gap = 10;
    let x = Math.min(Math.max(cx - w / 2, 4), stage.clientWidth - w - 4);
    let y = top - h - gap;
    if (y < 4) y = bottom + gap;
    card.style.left = x + "px";
    card.style.top = y + "px";
  }

  function close() {
    if (active) active.classList.remove("on");
    active = null;
    card.hidden = true;
  }

  document.addEventListener("click", (e) => {
    if (active && !e.target.closest(".spot") && !card.contains(e.target)) close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("resize", close);
})();
