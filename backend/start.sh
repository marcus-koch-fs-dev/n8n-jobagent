#!/bin/sh
# Startet den virtuellen Bildschirm + noVNC und danach den Browser-Dienst.
# So kannst du jederzeit unter http://localhost:6080 zusehen, wenn der
# Browser im sichtbaren Modus läuft.
set -e

rm -f /tmp/.X99-lock
Xvfb :99 -screen 0 1400x950x24 -nolisten tcp &
sleep 1
fluxbox >/dev/null 2>&1 &
x11vnc -display :99 -forever -shared -nopw -localhost -rfbport 5900 -quiet >/dev/null 2>&1 &
websockify --web /usr/share/novnc 6080 localhost:5900 >/dev/null 2>&1 &

# Chromium sperrt das Profil mit einer Lock-Datei. Nach einem harten Neustart
# des Containers kann sie liegen bleiben, deshalb hier aufräumen.
rm -f /data/browser-profile/SingletonLock /data/browser-profile/SingletonSocket /data/browser-profile/SingletonCookie

exec node dist/server.js
