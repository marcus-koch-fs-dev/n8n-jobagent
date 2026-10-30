import { createApp } from './app.js'
import { MAX_CONCURRENCY, PORT } from './config.js'
import { log } from './lib/util.js'

// Einstiegspunkt: Anwendung aufbauen und auf dem Port lauschen.
createApp().listen(PORT, () => log(`Browser-Dienst läuft auf Port ${PORT} (max. ${MAX_CONCURRENCY} parallel)`))
