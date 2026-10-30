// Job-Agent: Stellen öffnen
// ---------------------------------------------------------------
// Diese Erweiterung kann genau eine Sache: Wenn die Ergebnis-Seite
// (http://localhost:3000) darum bittet, öffnet sie eine Liste von
// Links – als Tab-Gruppe im aktuellen Fenster oder in einem neuen Fenster.
// Sie liest keine Seiteninhalte und hat keinen Zugriff auf andere Seiten.

const ERLAUBT = 'http://localhost:3000/';
const FARBEN = ['green', 'blue', 'purple', 'cyan', 'orange', 'pink', 'yellow', 'red'];
let farbIndex = 0;

chrome.runtime.onMessageExternal.addListener((nachricht, absender, antworten) => {
  // Nur Anfragen von der eigenen Ergebnis-Seite annehmen
  if (!absender.url || !absender.url.startsWith(ERLAUBT)) return;

  if (nachricht && nachricht.typ === 'ping') {
    antworten({ ok: true, version: chrome.runtime.getManifest().version });
    return;
  }

  if (nachricht && nachricht.typ === 'oeffnen' && Array.isArray(nachricht.urls)) {
    const urls = nachricht.urls.filter((u) => /^https?:\/\//i.test(String(u))).slice(0, 30);
    if (!urls.length) {
      antworten({ ok: false, fehler: 'keine gültigen Links' });
      return;
    }
    (async () => {
      if (nachricht.modus === 'fenster') {
        // Neues Fenster mit allen Links als Tabs
        await chrome.windows.create({ url: urls, focused: true });
      } else {
        // Tab-Gruppe im Fenster der Ergebnis-Seite – Position jedes Tabs ausdrücklich setzen,
        // damit die Reihenfolge genau der Liste entspricht (sonst entscheidet der Browser).
        const fensterId = absender.tab ? absender.tab.windowId : undefined;
        const vorhanden = await chrome.tabs.query(fensterId ? { windowId: fensterId } : { currentWindow: true });
        const start = vorhanden.length;
        const tabs = [];
        for (const [i, url] of urls.entries()) tabs.push(await chrome.tabs.create({ url, windowId: fensterId, index: start + i, active: false }));
        const gruppe = await chrome.tabs.group({ tabIds: tabs.map((t) => t.id), createProperties: fensterId ? { windowId: fensterId } : undefined });
        await chrome.tabGroups.update(gruppe, {
          title: String(nachricht.titel || 'Stellen').slice(0, 40),
          color: FARBEN[farbIndex++ % FARBEN.length],
          collapsed: false,
        });
        await chrome.tabs.update(tabs[0].id, { active: true });
      }
      antworten({ ok: true, anzahl: urls.length });
    })().catch((e) => antworten({ ok: false, fehler: String(e && e.message ? e.message : e) }));
    return true; // Antwort kommt asynchron
  }
});
