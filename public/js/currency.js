const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "JPY", "AUD", "NZD", "CHF", "CNY", "MXN", "INR", "SEK"];
const RATE_LIMIT_MS = 10_000;
const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_KEY = "assignment2_currency_cache";
const LAST_CALL_KEY = "assignment2_currency_last_call";

const amountEl = document.getElementById("amount");
const fromEl = document.getElementById("fromCurrency");
const toEl = document.getElementById("toCurrency");
const formEl = document.getElementById("currencyForm");
const rateLineEl = document.getElementById("rateLine");
const resultEl = document.getElementById("conversionResult");
const metaEl = document.getElementById("currencyMeta");
const statusEl = document.getElementById("currencyStatus");

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.classList.remove("ok", "warn");
  if (type) statusEl.classList.add(type);
}

function fillCurrencySelect(selectEl, selected) {
  selectEl.innerHTML = "";
  for (const code of CURRENCIES) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = code;
    if (code === selected) option.selected = true;
    selectEl.appendChild(option);
  }
}

function canCallApi() {
  // Keep API usage under control for repeated user clicks/submits.
  const lastCall = Number(sessionStorage.getItem(LAST_CALL_KEY) || 0);
  const elapsed = Date.now() - lastCall;
  return elapsed >= RATE_LIMIT_MS;
}

function markApiCall() {
  sessionStorage.setItem(LAST_CALL_KEY, String(Date.now()));
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function saveCache(payload) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

function getCache() {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function render(payload) {
  const amount = Number(payload.amount);
  rateLineEl.textContent = `1 ${payload.from} = ${Number(payload.rate).toFixed(4)} ${payload.to}`;
  resultEl.textContent = `${amount.toFixed(2)} ${payload.from} = ${Number(payload.converted).toFixed(2)} ${payload.to}`;
  metaEl.textContent = `Last updated: ${new Date(payload.timestamp).toLocaleString()}`;
}

async function fetchConversion(amount, from, to) {
  if (!canCallApi()) {
    setStatus("Rate limit: wait a few seconds before requesting again.", "warn");
    return;
  }

  setStatus("Fetching exchange rate...");

  try {
    const response = await fetch(`/api/exchange?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`);
    const data = await parseJsonSafe(response);

    if (!response.ok) {
      throw new Error(data.error || "Exchange request failed");
    }

    render(data);
    saveCache({ ...data, savedAt: Date.now() });
    markApiCall();
    setStatus("Exchange rate updated.", "ok");
  } catch (error) {
    setStatus(`Error: ${error.message}`, "warn");
  }
}

function loadCacheIfFresh() {
  const cached = getCache();
  if (!cached) return false;

  // Reuse local data until TTL expires, then allow fresh API retrieval.
  const age = Date.now() - Number(cached.savedAt || 0);
  if (age > CACHE_TTL_MS) return false;

  amountEl.value = cached.amount;
  fromEl.value = cached.from;
  toEl.value = cached.to;
  render(cached);
  setStatus("Loaded cached exchange data.", "ok");
  return true;
}

fillCurrencySelect(fromEl, "USD");
fillCurrencySelect(toEl, "CAD");

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(amountEl.value);
  if (Number.isNaN(amount) || amount <= 0) {
    setStatus("Enter a valid amount greater than zero.", "warn");
    return;
  }
  fetchConversion(amount, fromEl.value, toEl.value);
});

if (!loadCacheIfFresh()) {
  fetchConversion(Number(amountEl.value), fromEl.value, toEl.value);
}
