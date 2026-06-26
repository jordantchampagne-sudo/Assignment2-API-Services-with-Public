/*
Assignment 2: Utilizing External API Services
Author: Jordan Champagne
Date: 2026-06-26

Purpose:
- Provide secure backend proxy endpoints for weather and currency services.
- Keep API keys in server-side .env so keys are not exposed to client code.

External APIs:
1) OpenWeather Current Weather API
  Endpoint: /data/2.5/weather?q=Calgary,CA&units=metric&appid=API_KEY
2) ExchangeRate-API
  Endpoint: /v6/API_KEY/latest/BASE_CURRENCY

Rate Limiting:
- In-memory server cooldown for weather and exchange endpoints.

AI-use declaration:
GitHub Copilot was used to help draft code, explain parts of the assignment by drawing parallels to PLC programming and robotics principles, and help fix errors and refine the code.
*/

const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8080);

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const EXCHANGERATE_API_KEY = process.env.EXCHANGERATE_API_KEY;

app.use(express.static(path.join(__dirname, "public")));

// Simple in-memory rate limiter per endpoint to prevent accidental spam clicks.
const lastCall = {
  weather: 0,
  exchange: 0
};

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function hitRateLimit(type, minMs) {
  const now = Date.now();
  if (now - lastCall[type] < minMs) {
    return true;
  }
  lastCall[type] = now;
  return false;
}

function describeOpenMeteoCode(code) {
  const map = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "depositing rime fog",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    61: "slight rain",
    63: "moderate rain",
    65: "heavy rain",
    71: "slight snow fall",
    73: "moderate snow fall",
    75: "heavy snow fall",
    80: "rain showers",
    81: "moderate rain showers",
    82: "violent rain showers",
    95: "thunderstorm"
  };
  return map[code] || "unknown";
}

function classifyOpenMeteoCode(code) {
  if ([0, 1].includes(code)) return "clear";
  if ([2, 3].includes(code)) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75].includes(code)) return "snow";
  if ([95].includes(code)) return "storm";
  return "cloudy";
}

app.get("/api/weather", async (req, res) => {
  if (hitRateLimit("weather", 3000)) {
    return res.status(429).json({ error: "Weather API rate-limited. Wait a few seconds." });
  }

  const lat = Number(req.query.lat ?? 51.0447);
  const lon = Number(req.query.lon ?? -114.0719);
  const label = String(req.query.label || "Calgary, CA");
  const timezone = String(req.query.timezone || "America/Edmonton");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: "Invalid coordinates provided for weather request." });
  }

  try {
    if (OPENWEATHER_API_KEY) {
      const endpoint = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      const response = await fetchWithTimeout(endpoint);

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch weather data." });
      }

      const data = await response.json();

      const payload = {
        location: label,
        temperatureC: data.main?.temp,
        highC: data.main?.temp_max,
        lowC: data.main?.temp_min,
        description: data.weather?.[0]?.description || "N/A",
        conditionType: String(data.weather?.[0]?.main || "clouds").toLowerCase(),
        // Weather timestamp comes from the upstream weather payload.
        timestamp: data.dt ? new Date(data.dt * 1000).toISOString() : new Date().toISOString()
      };

      return res.json(payload);
    }

    // Fallback for local testing when no API key is configured.
    const fallbackEndpoint = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=${encodeURIComponent(timezone)}`;
    const fallbackResponse = await fetchWithTimeout(fallbackEndpoint);

    if (!fallbackResponse.ok) {
      return res.status(fallbackResponse.status).json({ error: "Failed to fetch weather data (fallback)." });
    }

    const fallbackData = await fallbackResponse.json();
    return res.json({
      location: label,
      temperatureC: fallbackData.current?.temperature_2m,
      highC: fallbackData.daily?.temperature_2m_max?.[0],
      lowC: fallbackData.daily?.temperature_2m_min?.[0],
      description: describeOpenMeteoCode(fallbackData.current?.weather_code),
      conditionType: classifyOpenMeteoCode(fallbackData.current?.weather_code),
      timestamp: fallbackData.current?.time ? new Date(fallbackData.current.time).toISOString() : new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: "Unexpected weather service error." });
  }
});

app.get("/api/exchange", async (req, res) => {
  if (hitRateLimit("exchange", 1500)) {
    return res.status(429).json({ error: "Currency API rate-limited. Wait a moment." });
  }

  const base = String(req.query.base || "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(base)) {
    return res.status(400).json({ error: "Invalid base currency." });
  }

  try {
    if (EXCHANGERATE_API_KEY) {
      const endpoint = `https://v6.exchangerate-api.com/v6/${EXCHANGERATE_API_KEY}/latest/${base}`;
      const response = await fetchWithTimeout(endpoint);

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch exchange rates." });
      }

      const data = await response.json();

      if (data.result !== "success" || !data.conversion_rates) {
        return res.status(500).json({ error: "Currency service returned invalid data." });
      }

      return res.json({
        base,
        // Return all rates for one base so frontend can cache and reuse locally.
        rates: data.conversion_rates,
        timestamp: data.time_last_update_utc || new Date().toISOString()
      });
    }

    // Fallback for local testing when no API key is configured.
    const fallbackEndpoint = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`;
    const fallbackResponse = await fetchWithTimeout(fallbackEndpoint);

    if (!fallbackResponse.ok) {
      return res.status(fallbackResponse.status).json({ error: "Failed to fetch exchange rates (fallback)." });
    }

    const fallbackData = await fallbackResponse.json();
    return res.json({
      base,
      rates: fallbackData.rates,
      timestamp: fallbackData.date || new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: "Unexpected currency service error." });
  }
});

app.listen(PORT, () => {
  console.log(`Assignment 2 app running on http://localhost:${PORT}`);
});
