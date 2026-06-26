# Assignment 2 - Utilizing External API Services

This project includes:
- Weather service for Calgary (temperature, description, timestamp)
- Currency exchange converter with 22 currencies
- Local/session storage caching
- Rate limiting
- API key protection via `.env`

## APIs Used
- Weather: OpenWeather Current Weather API
- Currency: ExchangeRate-API

## Setup
1. Open terminal in `assignment2-api-services`
2. Install dependencies:
   - `npm install`
3. Create `.env` in this folder (same level as `server.js`):
   - `OPENWEATHER_API_KEY=your_key_here`
   - `EXCHANGERATE_API_KEY=your_key_here`
   - `PORT=8080`
4. Start the app:
   - `npm start`
5. Open:
   - `http://localhost:8080`

## Assignment Requirement Mapping
- Weather for Calgary with temp, description, timestamp: implemented in `/api/weather` and rendered on page.
- Currency converter with at least 10 currencies and from/to selection: implemented in converter UI (22 available).
- Exchange rate display (example `1 USD = 1.44 CAD`): shown in converter result area.
- API key protection: keys loaded from `.env` on server, never hard-coded in frontend.
- Data persistency:
  - Weather cached in `localStorage`
   - Exchange rates cached in `sessionStorage` (per base currency)
- Rate limiting:
  - Server-side endpoint cooldowns
  - Client-side click cooldowns

## Notes
- Do not commit `.env`.
- If weather/currency requests fail, check API keys first.
