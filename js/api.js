// api.js — wrapper fetch verso Apps Script (licenze) e verso il motore VPS (ricerca).
// Configura questi due valori dopo aver fatto il deploy (vedi apps-script/README.md
// e engine-server/README.md):
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwM2hrlggjt_9LPrgpIEGbxYRLV5NSmamvkhX7zdPxguiZCuBxVZIJRA-r_tVptKgBtpA/exec";
const MOTORE_URL = "https://api.sintesidigitale.com/search";

/**
 * Content-Type "text/plain" deliberato (non "application/json"): i Web App
 * di Apps Script gestiscono male il preflight CORS su richieste "non semplici".
 * Restando una "simple request" (niente header custom, Content-Type tra quelli
 * ammessi), il browser non manda l'OPTIONS di preflight e la risposta cross-origin
 * si legge normalmente. Code.gs fa comunque JSON.parse(e.postData.contents)
 * a prescindere dal Content-Type dichiarato.
 */
async function chiamaAppsScript(azione, dati = {}) {
  let risposta;
  try {
    risposta = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: azione, ...dati }),
    });
  } catch (err) {
    throw new Error("Impossibile contattare il server di autenticazione. Controlla la connessione.");
  }
  if (!risposta.ok) {
    throw new Error("Errore del server di autenticazione (HTTP " + risposta.status + ").");
  }
  return risposta.json();
}

/**
 * Chiama il motore di ricerca VPS. Il token va nell'header Authorization:
 * qui non c'e' il vincolo "simple request" di Apps Script perche' il motore
 * (FastAPI) gestisce correttamente il preflight CORS lato server.
 */
async function chiamaMotore(payload) {
  const token = sessionStorage.getItem("uiux_token");
  if (!token) {
    throw new Error("SESSIONE_SCADUTA");
  }
  let risposta;
  try {
    risposta = await fetch(MOTORE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error("Impossibile contattare il motore di ricerca. Controlla la connessione.");
  }
  if (risposta.status === 401 || risposta.status === 403) {
    throw new Error("SESSIONE_SCADUTA");
  }
  if (!risposta.ok) {
    const testo = await risposta.text().catch(() => "");
    throw new Error("Errore del motore di ricerca (HTTP " + risposta.status + "): " + testo);
  }
  return risposta.json();
}
