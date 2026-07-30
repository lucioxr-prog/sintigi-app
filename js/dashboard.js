// dashboard.js — ricerca verso il motore VPS + storico lavori SOLO locale
// (IndexedDB nel browser del cliente). Nessuna query/risultato viene mai
// inviata al Google Sheet: e' l'unico modo per rendere "dati cliente mai
// visibili a Luciano" una garanzia architetturale reale, non una promessa
// (vedi discussione in README.md principale).

const DB_NOME = "uiux_storico_locale";
const DB_VERSIONE = 1;
const STORE_NOME = "ricerche";
const INTERVALLO_RICONTROLLO_MS = 5 * 60 * 1000; // 5 minuti: aggiorna countdown e rileva revoche admin

function apriDb() {
  return new Promise((resolve, reject) => {
    const richiesta = indexedDB.open(DB_NOME, DB_VERSIONE);
    richiesta.onupgradeneeded = () => {
      const db = richiesta.result;
      if (!db.objectStoreNames.contains(STORE_NOME)) {
        const store = db.createObjectStore(STORE_NOME, { keyPath: "id", autoIncrement: true });
        store.createIndex("timestamp", "timestamp");
      }
    };
    richiesta.onsuccess = () => resolve(richiesta.result);
    richiesta.onerror = () => reject(richiesta.error);
  });
}

async function salvaNelloStorico(voce) {
  const db = await apriDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOME, "readwrite");
    tx.objectStore(STORE_NOME).add({ ...voce, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function leggiStorico() {
  const db = await apriDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOME, "readonly");
    const richiesta = tx.objectStore(STORE_NOME).index("timestamp").getAll();
    richiesta.onsuccess = () => resolve(richiesta.result.reverse()); // piu' recenti prima
    richiesta.onerror = () => reject(richiesta.error);
  });
}

async function cancellaStorico() {
  const db = await apriDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOME, "readwrite");
    tx.objectStore(STORE_NOME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function esportaStoricoJson(voci) {
  const blob = new Blob([JSON.stringify(voci, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "storico_ui-ux-pro-max_" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

// ============ Ricerca ============

async function eseguiRicerca(query, opzioni) {
  const risultato = await chiamaMotore({ query, ...opzioni });
  await salvaNelloStorico({ query, opzioni, risultato });
  return risultato;
}

// ============ Countdown abbonamento ============

function aggiornaBannerScadenza() {
  const banner = document.getElementById("banner-scadenza");
  if (!banner) return;
  const giorni = parseInt(sessionStorage.getItem("uiux_giorni_rimanenti"), 10);
  if (!Number.isFinite(giorni) || giorni > 10) {
    banner.style.display = "none";
    return;
  }
  banner.style.display = "block";
  banner.textContent =
    giorni >= 0
      ? `Il tuo abbonamento scade tra ${giorni} ${giorni === 1 ? "giorno" : "giorni"}.`
      : "Il tuo abbonamento risulta scaduto.";
}

async function ricontrollaLicenza() {
  try {
    const risposta = await chiamaAppsScript("check_license", {
      token: sessionStorage.getItem("uiux_token"),
    });
    if (!risposta.ok) {
      logout();
      return;
    }
    sessionStorage.setItem(
      "uiux_giorni_rimanenti",
      risposta.giorni_rimanenti != null ? String(risposta.giorni_rimanenti) : ""
    );
    sessionStorage.setItem("uiux_data_scadenza", risposta.data_scadenza || "");
    aggiornaBannerScadenza();
  } catch (err) {
    // Errore di rete transitorio: non forzare logout, riprovera' al giro successivo.
    console.warn("Ricontrollo licenza fallito (rete?):", err);
  }
}

function avviaRicontrolloPeriodico() {
  setInterval(ricontrollaLicenza, INTERVALLO_RICONTROLLO_MS);
}
