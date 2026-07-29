/**
 * Entry point loaded by index.html (replaces the old direct `app.js`
 * module script). Owns the login gate and decides WHEN app.js's init()
 * runs: only after a Supabase session exists and this tenant's cloud data
 * has been pulled into localStorage. app.js itself is completely unaware
 * of auth - it just reads localStorage like it always did.
 */
import { init } from "./app.js";
import { getSession, onAuthStateChange, signIn, signUp, signOut } from "./auth.js";
import { hydrateFromCloud } from "./cloud.js";

const loginGate = document.getElementById("login-gate");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const loginInfo = document.getElementById("login-info");
const btnLogin = document.getElementById("btn-login");
const btnSignup = document.getElementById("btn-signup");
const loginSpinner = document.getElementById("login-spinner");
const btnLogout = document.getElementById("btn-logout");

let appStarted = false;

function setLoginBusy(busy) {
  if (btnLogin) btnLogin.disabled = busy;
  if (btnSignup) btnSignup.disabled = busy;
  if (loginSpinner) loginSpinner.style.display = busy ? "inline-block" : "none";
}

function showLoginError(message) {
  if (loginInfo) loginInfo.style.display = "none";
  if (loginError) {
    loginError.textContent = message;
    loginError.style.display = "block";
  }
}

function showLoginInfo(message) {
  if (loginError) loginError.style.display = "none";
  if (loginInfo) {
    loginInfo.textContent = message;
    loginInfo.style.display = "block";
  }
}

async function startApp() {
  if (appStarted) return;
  appStarted = true;
  if (loginGate) loginGate.style.display = "none";
  try {
    await hydrateFromCloud();
  } catch (err) {
    console.error("Cloud-Hydration fehlgeschlagen, starte mit dem letzten lokalen Stand:", err);
  }
  init();
}

function showLoginGate() {
  appStarted = false;
  if (loginGate) loginGate.style.display = "flex";
}

if (btnLogin) {
  btnLogin.addEventListener("click", async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    if (!email || !password) {
      showLoginError("Bitte E-Mail und Passwort eingeben.");
      return;
    }
    setLoginBusy(true);
    try {
      await signIn(email, password);
      // onAuthStateChange fires startApp() once the session is set.
    } catch (err) {
      showLoginError(err.message || "Anmeldung fehlgeschlagen.");
    } finally {
      setLoginBusy(false);
    }
  });
}

if (btnSignup) {
  btnSignup.addEventListener("click", async () => {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    if (!email || !password) {
      showLoginError("Bitte E-Mail und Passwort eingeben.");
      return;
    }
    if (password.length < 8) {
      showLoginError("Das Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    setLoginBusy(true);
    try {
      const data = await signUp(email, password);
      if (!data.session) {
        showLoginInfo(
          "Registrierung erfolgreich! Falls E-Mail-Bestätigung aktiv ist, prüfe dein Postfach und melde dich danach an."
        );
      }
    } catch (err) {
      showLoginError(err.message || "Registrierung fehlgeschlagen.");
    } finally {
      setLoginBusy(false);
    }
  });
}

if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    await signOut();
    location.reload();
  });
}

onAuthStateChange((session) => {
  if (session) {
    startApp();
  } else {
    showLoginGate();
  }
});

(async () => {
  const session = await getSession();
  if (session) {
    startApp();
  } else {
    showLoginGate();
  }
})();
