// Turns the Riesenrad with the current wind in Vienna and shows a small
// "Wind: 16 km/h SW" label on hover. Falls back to a gentle spin when no
// wind data can be loaded.
(function () {
  const rotor = document.getElementById("wheel-rotor");
  const hit = document.getElementById("wheel-hit");
  const label = document.getElementById("wind-label");
  if (!rotor) return;

  const HUB = "translate(621.05 450.09)";
  const DEFAULT_KMH = 15;              // used when no data is available
  const REFRESH_MS = 10 * 60 * 1000;   // GeoSphere updates every 10 minutes
  const DIRS = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];

  // GeoSphere Austria, station 11034 = Wien Innere Stadt (10-minute values).
  // FFAM = mean wind speed in m/s, DD = wind direction in degrees.
  const GEOSPHERE =
    "https://dataset.api.hub.geosphere.at/v1/station/current/tawes-v1-10min" +
    "?station_ids=11034&parameters=FFAM,DD";
  // Backup: Open-Meteo model data for central Vienna.
  const OPEN_METEO =
    "https://api.open-meteo.com/v1/forecast?latitude=48.2082&longitude=16.3738" +
    "&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh";

  async function getJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(url + " -> HTTP " + res.status);
    return res.json();
  }

  async function loadWind() {
    try {
      const p = (await getJSON(GEOSPHERE)).features[0].properties.parameters;
      const ms = p.FFAM.data[0];
      if (typeof ms === "number") return { kmh: ms * 3.6, deg: p.DD && p.DD.data[0] };
    } catch (e) { console.warn("GeoSphere wind unavailable", e); }
    try {
      const c = (await getJSON(OPEN_METEO)).current;
      if (typeof c.wind_speed_10m === "number") return { kmh: c.wind_speed_10m, deg: c.wind_direction_10m };
    } catch (e) { console.warn("Open-Meteo wind unavailable", e); }
    return null;
  }

  function direction(deg) {
    return typeof deg === "number" ? DIRS[Math.round(deg / 45) % 8] : "";
  }

  // Degrees per second. Gentle and roughly linear in everyday wind, then
  // speeding up sharply in storms (cubic term): ~2.5 min per turn at 15 km/h,
  // ~1 min at 30, ~12 s at 80, ~5 s at 120. Calm air leaves it almost still.
  const speedFor = (kmh) => Math.min(0.01 + 0.16 * kmh + 3.06e-5 * kmh ** 3, 120);

  let target = speedFor(DEFAULT_KMH), speed = target, angle = 0, last = null;

  async function refresh() {
    const w = await loadWind();
    if (w) {
      target = speedFor(w.kmh);
      label.textContent = "Wind: " + Math.round(w.kmh) + " km/h " + direction(w.deg);
    } else {
      target = speedFor(DEFAULT_KMH);
      label.textContent = "Wind: gerade keine Daten";
    }
  }
  refresh();
  setInterval(refresh, REFRESH_MS);

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function tick(t) {
    if (last !== null) {
      const dt = Math.min((t - last) / 1000, 0.1);
      speed += (target - speed) * Math.min(dt * 0.5, 1);   // ease into new speeds
      angle = (angle + speed * dt) % 360;
      rotor.setAttribute("transform", HUB + " rotate(" + angle.toFixed(2) + ")");
    }
    last = t;
    requestAnimationFrame(tick);
  }
  if (!still) requestAnimationFrame(tick);

  // Label: hover on desktop, tap on touch screens.
  const show = () => label.classList.add("on");
  const hide = () => label.classList.remove("on");
  hit.addEventListener("mouseenter", show);
  hit.addEventListener("mouseleave", hide);
  hit.addEventListener("click", () => label.classList.toggle("on"));
})();
