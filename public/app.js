/*
Assignment 2: Utilizing External API Services
Author: Jordan Champagne
Date: 2026-06-26

Purpose:
- Render Calgary weather information (temperature, description, timestamp).
- Render currency conversion for selected amount and currencies.

Persistency:
- localStorage: weather cache with TTL.
- sessionStorage: exchange-rates cache per base currency with TTL.

Rate Limiting:
- Client-side click cooldown to reduce consecutive API calls.

AI-use declaration:
GitHub Copilot was used to help draft code, explain parts of the assignment by drawing parallels to PLC programming and robotics principles, and help fix errors and refine the code.
*/

const WEATHER_CACHE_PREFIX = "a2_weather_cache_";
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;

const EXCHANGE_CACHE_PREFIX = "a2_exchange_cache_";
const EXCHANGE_CACHE_TTL_MS = 3 * 60 * 1000;

const CURRENCY_INFO = {
  USD: { name: "US Dollar", countryCode: "US", symbol: "$" },
  CAD: { name: "Canadian Dollar", countryCode: "CA", symbol: "CA$" },
  MXN: { name: "Mexican Peso", countryCode: "MX", symbol: "MX$" },
  BRL: { name: "Brazilian Real", countryCode: "BR", symbol: "R$" },
  CLP: { name: "Chilean Peso", countryCode: "CL", symbol: "CLP" },
  GBP: { name: "British Pound Sterling", countryCode: "GB", symbol: "GBP" },
  EUR: { name: "Euro", countryCode: "EU", symbol: "EUR" },
  CHF: { name: "Swiss Franc", countryCode: "CH", symbol: "CHF" },
  DKK: { name: "Danish Krone", countryCode: "DK", symbol: "DKK" },
  NOK: { name: "Norwegian Krone", countryCode: "NO", symbol: "NOK" },
  JPY: { name: "Japanese Yen", countryCode: "JP", symbol: "JPY" },
  CNY: { name: "Chinese Yuan", countryCode: "CN", symbol: "CNY" },
  INR: { name: "Indian Rupee", countryCode: "IN", symbol: "INR" },
  KRW: { name: "South Korean Won", countryCode: "KR", symbol: "KRW" },
  SGD: { name: "Singapore Dollar", countryCode: "SG", symbol: "SGD" },
  HKD: { name: "Hong Kong Dollar", countryCode: "HK", symbol: "HK$" },
  THB: { name: "Thai Baht", countryCode: "TH", symbol: "THB" },
  AED: { name: "UAE Dirham", countryCode: "AE", symbol: "AED" },
  SAR: { name: "Saudi Riyal", countryCode: "SA", symbol: "SAR" },
  ZAR: { name: "South African Rand", countryCode: "ZA", symbol: "ZAR" },
  AUD: { name: "Australian Dollar", countryCode: "AU", symbol: "A$" },
  NZD: { name: "New Zealand Dollar", countryCode: "NZ", symbol: "NZ$" }
};

const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_INFO);
const MAX_CONVERT_AMOUNT = 1_000_000_000;

const LOCATION_PRESETS = [
  { id: "calgary-downtown", label: "Calgary - Downtown", lat: 51.0447, lon: -114.0719, timezone: "America/Edmonton" },
  { id: "calgary-nw", label: "Calgary - NW", lat: 51.0913, lon: -114.1298, timezone: "America/Edmonton" },
  { id: "calgary-ne", label: "Calgary - NE", lat: 51.0670, lon: -113.9710, timezone: "America/Edmonton" },
  { id: "calgary-sw", label: "Calgary - SW", lat: 50.9973, lon: -114.1297, timezone: "America/Edmonton" },
  { id: "calgary-se", label: "Calgary - SE", lat: 50.9773, lon: -113.9853, timezone: "America/Edmonton" },
  { id: "airdrie", label: "Airdrie", lat: 51.2927, lon: -114.0144, timezone: "America/Edmonton" },
  { id: "okotoks", label: "Okotoks", lat: 50.7254, lon: -113.9753, timezone: "America/Edmonton" },
  { id: "cochrane", label: "Cochrane", lat: 51.1897, lon: -114.4687, timezone: "America/Edmonton" },
  { id: "banff", label: "Banff", lat: 51.1784, lon: -115.5708, timezone: "America/Edmonton" },
  { id: "red-deer", label: "Red Deer", lat: 52.2690, lon: -113.8116, timezone: "America/Edmonton" },
  { id: "edmonton", label: "Edmonton", lat: 53.5461, lon: -113.4938, timezone: "America/Edmonton" },
  { id: "chestermere", label: "Chestermere", lat: 51.0397, lon: -113.8187, timezone: "America/Edmonton" },
  { id: "canmore", label: "Canmore", lat: 51.0890, lon: -115.3590, timezone: "America/Edmonton" },
  { id: "lethbridge", label: "Lethbridge", lat: 49.6956, lon: -112.8451, timezone: "America/Edmonton" },
  { id: "medicine-hat", label: "Medicine Hat", lat: 50.0405, lon: -110.6761, timezone: "America/Edmonton" },
  { id: "vancouver", label: "Vancouver", lat: 49.2827, lon: -123.1207, timezone: "America/Vancouver" },
  { id: "victoria", label: "Victoria", lat: 48.4284, lon: -123.3656, timezone: "America/Vancouver" },
  { id: "kelowna", label: "Kelowna", lat: 49.8880, lon: -119.4960, timezone: "America/Vancouver" },
  { id: "saskatoon", label: "Saskatoon", lat: 52.1332, lon: -106.6700, timezone: "America/Regina" },
  { id: "regina", label: "Regina", lat: 50.4452, lon: -104.6189, timezone: "America/Regina" },
  { id: "winnipeg", label: "Winnipeg", lat: 49.8951, lon: -97.1384, timezone: "America/Winnipeg" },
  { id: "toronto", label: "Toronto", lat: 43.6532, lon: -79.3832, timezone: "America/Toronto" },
  { id: "ottawa", label: "Ottawa", lat: 45.4215, lon: -75.6972, timezone: "America/Toronto" },
  { id: "montreal", label: "Montreal", lat: 45.5017, lon: -73.5673, timezone: "America/Toronto" },
  { id: "halifax", label: "Halifax", lat: 44.6488, lon: -63.5752, timezone: "America/Halifax" }
];

const weatherStatus = document.getElementById("weatherStatus");
const weatherMeta = document.getElementById("weatherMeta");
const weatherResult = document.getElementById("weatherResult");
const loadWeatherBtn = document.getElementById("loadWeatherBtn");
const locationSelect = document.getElementById("locationSelect");

const amountInput = document.getElementById("amount");
const fromCurrency = document.getElementById("fromCurrency");
const toCurrency = document.getElementById("toCurrency");
const convertBtn = document.getElementById("convertBtn");
const reverseBtn = document.getElementById("reverseBtn");
const exchangeStatus = document.getElementById("exchangeStatus");
const exchangeRateLine = document.getElementById("exchangeRateLine");
const exchangeMeta = document.getElementById("exchangeMeta");
const exchangeResult = document.getElementById("exchangeResult");
const fromFieldFlag = document.getElementById("fromFieldFlag");
const toFieldFlag = document.getElementById("toFieldFlag");
const weatherIcon = document.getElementById("weatherIcon");
const weatherMood = document.getElementById("weatherMood");

let lastWeatherClickMs = 0;
let lastConvertClickMs = 0;

function fillCurrencySelects() {
  SUPPORTED_CURRENCIES.sort((a, b) => a.localeCompare(b)).forEach((currency) => {
    const info = CURRENCY_INFO[currency];
    const optionLabel = `${currency} (${info.symbol}) - ${info.name}`;
    fromCurrency.add(new Option(optionLabel, currency));
    toCurrency.add(new Option(optionLabel, currency));
  });

  fromCurrency.value = "USD";
  toCurrency.value = "CAD";
}

function fillLocationSelect() {
  LOCATION_PRESETS.forEach((location) => {
    locationSelect.add(new Option(location.label, location.id));
  });

  locationSelect.value = "calgary-downtown";
}

function getSelectedLocation() {
  return LOCATION_PRESETS.find((location) => location.id === locationSelect.value) || LOCATION_PRESETS[0];
}

function getWeatherCacheKey(locationId) {
  return `${WEATHER_CACHE_PREFIX}${locationId}`;
}

function getFlagUrl(countryCode) {
  if (countryCode === "EU") {
    return "https://upload.wikimedia.org/wikipedia/commons/b/b7/Flag_of_Europe.svg";
  }
  return `https://flagcdn.com/${countryCode.toLowerCase()}.svg`;
}

function updateCurrencyPreview() {
  const fromCode = fromCurrency.value;
  const toCode = toCurrency.value;
  const fromInfo = CURRENCY_INFO[fromCode];
  const toInfo = CURRENCY_INFO[toCode];

  if (fromInfo) {
    fromFieldFlag.src = getFlagUrl(fromInfo.countryCode);
    fromFieldFlag.alt = `${fromCode} flag`;
    fromCurrency.title = `${fromCode} (${fromInfo.symbol}) - ${fromInfo.name}`;
  }

  if (toInfo) {
    toFieldFlag.src = getFlagUrl(toInfo.countryCode);
    toFieldFlag.alt = `${toCode} flag`;
    toCurrency.title = `${toCode} (${toInfo.symbol}) - ${toInfo.name}`;
  }
}

function getWeatherIconPath(conditionType, description) {
  const type = String(conditionType || "").toLowerCase();
  const text = String(description || "").toLowerCase();

  if (["thunderstorm", "storm"].includes(type) || text.includes("thunder")) return "assets/weather/storm.svg";
  if (["snow"].includes(type) || text.includes("snow")) return "assets/weather/snow.svg";
  if (["rain", "drizzle"].includes(type) || text.includes("rain") || text.includes("drizzle")) return "assets/weather/rain.svg";
  if (["mist", "fog", "haze"].includes(type) || text.includes("fog") || text.includes("mist")) return "assets/weather/fog.svg";
  if (["clouds", "cloudy"].includes(type) || text.includes("cloud") || text.includes("overcast")) return "assets/weather/cloudy.svg";
  return "assets/weather/clear.svg";
}

function getWeatherMoodText(conditionType, description) {
  const type = String(conditionType || "").toLowerCase();
  const text = String(description || "").toLowerCase();

  if (type.includes("storm") || type.includes("thunder") || text.includes("thunder")) {
    return "Stormy. Drive carefully.";
  }
  if (type.includes("snow") || text.includes("snow")) {
    return "Snowy. Layer up.";
  }
  if (type.includes("rain") || type.includes("drizzle") || text.includes("rain") || text.includes("drizzle")) {
    return "Wet out. Bring rain gear.";
  }
  if (type.includes("fog") || type.includes("mist") || type.includes("haze") || text.includes("fog") || text.includes("mist")) {
    return "Low visibility.";
  }
  if (type.includes("cloud") || text.includes("cloud") || text.includes("overcast") || text.includes("partly")) {
    return "Mostly cloudy.";
  }

  return `Now: ${toTitleLikeText(description)}.`;
}

function updateWeatherVisual(data) {
  if (!weatherIcon || !weatherMood) return;
  weatherIcon.src = getWeatherIconPath(data.conditionType, data.description);
  weatherIcon.alt = `${data.description} icon`;
  weatherMood.textContent = getWeatherMoodText(data.conditionType, data.description);
}

function formatCurrencyAmount(value, currencyCode) {
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: currencyCode
    }).format(value);
  } catch (_error) {
    return `${value.toFixed(2)} ${currencyCode}`;
  }
}

function isFresh(timestamp, ttlMs) {
  return Date.now() - timestamp < ttlMs;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

function toTitleLikeText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

async function parseResponseJsonSafe(response) {
  try {
    return await response.json();
  } catch (_error) {
    return {};
  }
}

function setWeatherStatus(message, isError = false) {
  weatherStatus.textContent = message;
  weatherStatus.style.color = isError ? "#a61b1b" : "#2c3e50";
}

function setExchangeStatus(message, isError = false) {
  exchangeStatus.textContent = message;
  exchangeStatus.style.color = isError ? "#a61b1b" : "#2c3e50";
}

function renderWeather(data, sourceLabel) {
  const time = formatDateTime(data.timestamp);
  const highText = Number.isFinite(Number(data.highC)) ? `${Number(data.highC).toFixed(1)} C` : "N/A";
  const lowText = Number.isFinite(Number(data.lowC)) ? `${Number(data.lowC).toFixed(1)} C` : "N/A";
  updateWeatherVisual(data);
  weatherMeta.textContent = `Source: ${sourceLabel} | Last updated: ${time}`;
  weatherResult.innerHTML = `
    <p><strong>Location:</strong> ${data.location}</p>
    <p><strong>Temperature:</strong> ${data.temperatureC} C</p>
    <p><strong>High / Low:</strong> ${highText} / ${lowText}</p>
    <p><strong>Timestamp:</strong> ${time}</p>
  `;
}

async function loadWeather(forceRefresh = false) {
  const now = Date.now();
  // Client-side rate limiting on top of server-side limit.
  if (now - lastWeatherClickMs < 2000) {
    setWeatherStatus("Please Wait a Moment Before Requesting Weather Again", true);
    return;
  }
  lastWeatherClickMs = now;

  const selectedLocation = getSelectedLocation();
  const weatherCacheKey = getWeatherCacheKey(selectedLocation.id);

  if (!forceRefresh) {
    const cachedRaw = localStorage.getItem(weatherCacheKey);
    if (cachedRaw) {
      const cached = safeJsonParse(cachedRaw);
      if (!cached) {
        localStorage.removeItem(weatherCacheKey);
      } else if (
        isFresh(cached.fetchedAt, WEATHER_CACHE_TTL_MS)
        && cached.data?.location === selectedLocation.label
        && Number.isFinite(Number(cached.data?.highC))
        && Number.isFinite(Number(cached.data?.lowC))
      ) {
        renderWeather(cached.data, "Local Cache");
        setWeatherStatus("Weather Loaded");
        return;
      }
    }
  }

  try {
    setWeatherStatus("Loading Weather...");
    const params = new URLSearchParams({
      lat: String(selectedLocation.lat),
      lon: String(selectedLocation.lon),
      label: selectedLocation.label,
      timezone: selectedLocation.timezone
    });
    const response = await fetch(`/api/weather?${params.toString()}`);
    const payload = await parseResponseJsonSafe(response);

    if (!response.ok) {
      throw new Error(payload.error || "Could Not Fetch Weather");
    }

    renderWeather(payload, "Live API");
    setWeatherStatus("Weather Loaded");

    localStorage.setItem(weatherCacheKey, JSON.stringify({
      fetchedAt: Date.now(),
      data: payload
    }));
  } catch (error) {
    weatherMeta.textContent = "";
    setWeatherStatus(error.message, true);
  }
}

async function getRatesForBase(base) {
  const cacheKey = `${EXCHANGE_CACHE_PREFIX}${base}`;
  const cachedRaw = sessionStorage.getItem(cacheKey);

  if (cachedRaw) {
    const cached = safeJsonParse(cachedRaw);
    if (!cached) {
      sessionStorage.removeItem(cacheKey);
    } else if (isFresh(cached.fetchedAt, EXCHANGE_CACHE_TTL_MS)) {
      return {
        rates: cached.rates,
        source: "Session Cache",
        checkedAt: cached.fetchedAt,
        providerUpdatedAt: cached.providerUpdatedAt || cached.updatedAt || cached.fetchedAt
      };
    }
  }

  const response = await fetch(`/api/exchange?base=${encodeURIComponent(base)}`);
  const payload = await parseResponseJsonSafe(response);

  if (!response.ok) {
      throw new Error(payload.error || "Could Not Fetch Exchange Rates");
  }

  sessionStorage.setItem(cacheKey, JSON.stringify({
    fetchedAt: Date.now(),
    providerUpdatedAt: payload.timestamp || null,
    rates: payload.rates
  }));

  return {
    rates: payload.rates,
    source: "Live API",
    checkedAt: Date.now(),
    providerUpdatedAt: payload.timestamp || null
  };
}

async function convertCurrency() {
  const now = Date.now();
  // Client-side rate limiting on top of server-side limit.
  if (now - lastConvertClickMs < 1000) {
    setExchangeStatus("Please Wait a Moment Before Converting Again", true);
    return;
  }
  lastConvertClickMs = now;

  const amount = Number(amountInput.value);
  const from = fromCurrency.value;
  const to = toCurrency.value;

  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_CONVERT_AMOUNT) {
    setExchangeStatus("Please enter an amount between 0.01 and 1,000,000,000", true);
    return;
  }

  try {
    setExchangeStatus("Loading Exchange Data...");
    const { rates, source, checkedAt, providerUpdatedAt } = await getRatesForBase(from);
    const rate = rates[to];

    if (!rate) {
      throw new Error(`Rate Not Available for ${to}`);
    }

    const converted = amount * rate;
    exchangeRateLine.textContent = `1 ${from} (${CURRENCY_INFO[from].symbol}) = ${rate.toFixed(4)} ${to} (${CURRENCY_INFO[to].symbol})`;
    const providerText = providerUpdatedAt
      ? ` | Provider Updated: ${formatDateTime(providerUpdatedAt)}`
      : " | Provider Updated: Not Provided";
    exchangeMeta.textContent = `Source: ${source} | Last Checked: ${formatDateTime(checkedAt)}${providerText}`;
    exchangeResult.textContent = `${formatCurrencyAmount(amount, from)} = ${formatCurrencyAmount(converted, to)}`;
    setExchangeStatus("Conversion Complete");
  } catch (error) {
    exchangeRateLine.textContent = "";
    exchangeMeta.textContent = "";
    exchangeResult.textContent = "";
    setExchangeStatus(error.message, true);
  }
}

function reverseCurrencies() {
  const from = fromCurrency.value;
  const to = toCurrency.value;
  fromCurrency.value = to;
  toCurrency.value = from;
  updateCurrencyPreview();
  convertCurrency();
}

fillCurrencySelects();
fillLocationSelect();
updateCurrencyPreview();
loadWeatherBtn.addEventListener("click", () => loadWeather(true));
locationSelect.addEventListener("change", () => loadWeather(true));
convertBtn.addEventListener("click", convertCurrency);
reverseBtn.addEventListener("click", reverseCurrencies);
fromCurrency.addEventListener("change", updateCurrencyPreview);
toCurrency.addEventListener("change", updateCurrencyPreview);

// Auto-load once to show immediate working output.
loadWeather();
convertCurrency();
