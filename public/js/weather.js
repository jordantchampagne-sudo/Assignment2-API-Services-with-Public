const WEATHER_CACHE_KEY = "assignment2_weather_cache";
const WEATHER_LAST_CALL_KEY = "assignment2_weather_last_call";
const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
const WEATHER_RATE_LIMIT_MS = 10_000;

const locationEl = document.getElementById("weatherLocation");
const tempEl = document.getElementById("weatherTemp");
const descriptionEl = document.getElementById("weatherDescription");
const timeEl = document.getElementById("weatherTime");
const statusEl = document.getElementById("weatherStatus");
const refreshBtn = document.getElementById("refreshWeatherBtn");

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.classList.remove("ok", "warn");
  if (type) statusEl.classList.add(type);
}

function saveWeather(payload) {
  localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(payload));
}

function loadWeather() {
  const raw = localStorage.getItem(WEATHER_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function canCallApi() {
  // Basic per-session cooldown to prevent rapid repeated calls.
  const last = Number(sessionStorage.getItem(WEATHER_LAST_CALL_KEY) || 0);
  return Date.now() - last >= WEATHER_RATE_LIMIT_MS;
}

function markCall() {
  sessionStorage.setItem(WEATHER_LAST_CALL_KEY, String(Date.now()));
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function renderWeather(data) {
  locationEl.textContent = `${data.city}, CA`;
  tempEl.textContent = `${Number(data.temperatureC).toFixed(1)} °C`;
  descriptionEl.textContent = data.description;
  timeEl.textContent = new Date(data.timestamp).toLocaleString();
}

async function fetchWeather() {
  if (!canCallApi()) {
    setStatus("Rate limit: wait a few seconds before refreshing weather.", "warn");
    return;
  }

  setStatus("Fetching weather data...");

  try {
    const response = await fetch("/api/weather");
    const data = await parseJsonSafe(response);

    if (!response.ok) {
      throw new Error(data.error || "Weather request failed");
    }

    const payload = { ...data, savedAt: Date.now() };
    renderWeather(payload);
    saveWeather(payload);
    markCall();
    setStatus("Weather updated.", "ok");
  } catch (error) {
    setStatus(`Error: ${error.message}`, "warn");
  }
}

function loadCacheIfFresh() {
  const cached = loadWeather();
  if (!cached) return false;

  // Serve from localStorage first; refresh from API once cache is stale.
  const age = Date.now() - Number(cached.savedAt || 0);
  if (age > WEATHER_CACHE_TTL_MS) return false;

  renderWeather(cached);
  setStatus("Loaded cached weather data.", "ok");
  return true;
}

refreshBtn.addEventListener("click", fetchWeather);

if (!loadCacheIfFresh()) {
  fetchWeather();
}
