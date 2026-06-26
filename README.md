# Assignment 2 - Utilizing External API Services

This project is a standalone Node/Express website that provides:
- Calgary weather data with current temperature, condition, daily high/low, and timestamp
- A currency exchange converter with 22 selectable currencies and live conversion results
- Client-side caching for weather (`localStorage`) and exchange rates (`sessionStorage`)
- Client and server rate limiting to prevent accidental repeated calls
- Secure API key handling with server-side `.env` configuration
- Automatic fallback providers for local testing when API keys are not configured

## APIs Used
- Weather: OpenWeather Current Weather API (primary)
- Currency: ExchangeRate-API (primary)
- Fallback weather: Open-Meteo
- Fallback currency: Frankfurter

## Setup
1. Open terminal in `assignment2-api-services`
2. Install dependencies:
   - `npm install`
3. Create `.env` at the project root alongside `server.js`:
   - `OPENWEATHER_API_KEY=your_key_here`
   - `EXCHANGERATE_API_KEY=your_key_here`
   - `PORT=8080`
4. Start the app:
   - `npm start`
5. Open in browser:
   - `http://localhost:8080`

## Deployment
This project requires a Node.js server, so GitHub Pages cannot host the live app directly.

### Recommended: Render.com
1. Create a new Web Service on Render.
2. Connect it to the `main` branch of this repository.
3. Use these settings:
   - Environment: `Node`
   - Build command: `npm install`
   - Start command: `npm start`
4. Add required environment variables on Render:
   - `OPENWEATHER_API_KEY`
   - `EXCHANGERATE_API_KEY`
   - `PORT` (optional; Render provides one automatically)

A `render.yaml` file is included to support Render auto-deploy.

## Files to know
- `server.js` - backend API proxy and static file server
- `public/index.html` - main website markup
- `public/app.js` - frontend weather and currency logic
- `public/styles.css` - site styling
- `.env.example` - sample API key configuration

## Assignment Mapping
- Weather for Calgary with temperature, description, timestamp, and high/low: implemented in `/api/weather` and displayed on the page.
- Currency converter with from/to selection: implemented using the currency selector UI with 22 currencies.
- Exchange rate display (`1 USD = 1.44 CAD`): shown in the conversion result area.
- API key protection: keys are loaded from `.env` in `server.js` and not exposed in frontend code.
- Persistency:
  - Weather cached in `localStorage`
  - Exchange rates cached in `sessionStorage`
- Rate limiting:
  - Server-side cooldowns in `server.js`
  - Client-side click cooldowns in `public/app.js`

## Notes
- Do not commit `.env`.
- `.env.example` is provided as a template.
- The live app has been verified locally in two browser tabs.
