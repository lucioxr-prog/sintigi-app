// auth.js — gestione sessione. sessionStorage (non localStorage): scompare
// alla chiusura della scheda/browser invece di restare per sempre sul disco.
// Non e' httpOnly (non ottenibile in pratica con Apps Script come backend
// cross-origin): un XSS sulla pagina potrebbe leggerlo, come qualunque dato
// in sessionStorage/localStorage. Il token e' comunque a validita' breve
// (1 ora, vedi Code.gs TOKEN_VALIDITA_SECONDI) e non contiene la password.

const CHIAVI_SESSIONE = [
  "uiux_token", "uiux_email", "uiux_prodotto",
  "uiux_data_scadenza", "uiux_giorni_rimanenti",
];

function salvaSessione({ token, email, prodotto, data_scadenza, giorni_rimanenti }) {
  sessionStorage.setItem("uiux_token", token);
  sessionStorage.setItem("uiux_email", email || "");
  sessionStorage.setItem("uiux_prodotto", prodotto || "");
  sessionStorage.setItem("uiux_data_scadenza", data_scadenza || "");
  sessionStorage.setItem(
    "uiux_giorni_rimanenti",
    giorni_rimanenti != null ? String(giorni_rimanenti) : ""
  );
}

function leggiSessione() {
  return {
    token: sessionStorage.getItem("uiux_token"),
    email: sessionStorage.getItem("uiux_email"),
    prodotto: sessionStorage.getItem("uiux_prodotto"),
    data_scadenza: sessionStorage.getItem("uiux_data_scadenza"),
    giorni_rimanenti: sessionStorage.getItem("uiux_giorni_rimanenti"),
  };
}

function pulisciSessione() {
  CHIAVI_SESSIONE.forEach((k) => sessionStorage.removeItem(k));
}

function sessioneAttiva() {
  return !!sessionStorage.getItem("uiux_token");
}

/** Da chiamare in cima a dashboard.html: senza sessione, torna al login. */
function richiediSessione() {
  if (!sessioneAttiva()) {
    window.location.href = "index.html";
  }
}

function logout() {
  pulisciSessione();
  window.location.href = "index.html";
}
