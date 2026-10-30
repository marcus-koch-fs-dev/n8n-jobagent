# Wird aus dem Projektordner gebaut (Build-Kontext = Repo-Wurzel, siehe docker-compose.yml).

# Stufe 1: React-Oberfläche bauen (Node läuft nur im Container).
FROM node:22-slim AS ui
WORKDIR /ui
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm test && npm run build

# Stufe 2: Browser-Dienst.
# Offizielles Playwright-Image: enthält Node.js, Chromium und alle Systembibliotheken.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

# Für den sichtbaren Modus: virtueller Bildschirm (Xvfb), kleiner Fenstermanager,
# VNC-Server und noVNC (VNC im Browser unter http://localhost:6080).
RUN apt-get update \
 && apt-get install -y --no-install-recommends xvfb x11vnc fluxbox novnc websockify \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/package.json backend/tsconfig.json ./
# Chromium bringt das Basis-Image schon mit, deshalb kein erneuter Browser-Download.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
# Abhängigkeiten installieren, TypeScript bauen und die Tests laufen lassen, danach nur die Laufzeit-Abhängigkeiten behalten.
COPY backend/vorlagen ./vorlagen
COPY backend/src ./src
RUN npm install && npm test && npm prune --omit=dev
COPY backend/*.html backend/start.sh ./
COPY --from=ui /ui/dist ./ui
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

ENV DISPLAY=:99
EXPOSE 3000 6080
CMD ["./start.sh"]
