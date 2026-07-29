/**
 * Entry point loaded by index.html (replaces the old direct `app.js`
 * module script). Owns the login gate and decides WHEN app.js's init()
 * runs: only after a Supabase session exists and this tenant's cloud data
 * has been pulled into localStorage. app.js itself is completely unaware
 * of auth - it just reads localStorage like it always did.
 */
import { init } from "./app.js";
import {
  getSession,
  onAuthStateChange,
  signIn,
  signUp,
  signOut,
  requestPasswordReset,
  updatePassword,
} from "./auth.js";
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

// Passwort-vergessen
const btnForgotPassword = document.getElementById("btn-forgot-password");
const forgotPasswordCard = document.getElementById("forgot-password-card");
const forgotPasswordEmail = document.getElementById("forgot-password-email");
const forgotPasswordError = document.getElementById("forgot-password-error");
const forgotPasswordInfo = document.getElementById("forgot-password-info");
const btnSendReset = document.getElementById("btn-send-reset");
const btnCancelForgotPassword = document.getElementById("btn-cancel-forgot-password");

// Neues Passwort setzen (nach Klick auf den Reset-Link)
const recoveryCard = document.getElementById("recovery-card");
const recoveryPassword = document.getElementById("recovery-password");
const recoveryError = document.getElementById("recovery-error");
const btnSetNewPassword = document.getElementById("btn-set-new-password");

const mainLoginCard = document.getElementById("main-login-card");

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
  if (mainLoginCard) mainLoginCard.style.display = "flex";
  if (forgotPasswordCard) forgotPasswordCard.style.display = "none";
  if (recoveryCard) recoveryCard.style.display = "none";
}

function showRecoveryCard() {
  appStarted = false;
  if (loginGate) loginGate.style.display = "flex";
  if (mainLoginCard) mainLoginCard.style.display = "none";
  if (forgotPasswordCard) forgotPasswordCard.style.display = "none";
  if (recoveryCard) recoveryCard.style.display = "flex";
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

// --- Passwort vergessen ---

if (btnForgotPassword) {
  btnForgotPassword.addEventListener("click", () => {
    if (forgotPasswordEmail && loginEmail) forgotPasswordEmail.value = loginEmail.value;
    if (forgotPasswordError) forgotPasswordError.style.display = "none";
    if (forgotPasswordInfo) forgotPasswordInfo.style.display = "none";
    if (mainLoginCard) mainLoginCard.style.display = "none";
    if (forgotPasswordCard) forgotPasswordCard.style.display = "flex";
  });
}

if (btnCancelForgotPassword) {
  btnCancelForgotPassword.addEventListener("click", () => {
    if (forgotPasswordCard) forgotPasswordCard.style.display = "none";
    if (mainLoginCard) mainLoginCard.style.display = "flex";
  });
}

if (btnSendReset) {
  btnSendReset.addEventListener("click", async () => {
    const email = forgotPasswordEmail.value.trim();
    if (forgotPasswordError) forgotPasswordError.style.display = "none";
    if (forgotPasswordInfo) forgotPasswordInfo.style.display = "none";
    if (!email) {
      if (forgotPasswordError) {
        forgotPasswordError.textContent = "Bitte E-Mail-Adresse eingeben.";
        forgotPasswordError.style.display = "block";
      }
      return;
    }
    btnSendReset.disabled = true;
    try {
      await requestPasswordReset(email);
      if (forgotPasswordInfo) {
        forgotPasswordInfo.textContent = "E-Mail verschickt! Prüfe dein Postfach (auch Spam-Ordner) und klicke auf den Link, um ein neues Passwort zu setzen.";
        forgotPasswordInfo.style.display = "block";
      }
    } catch (err) {
      if (forgotPasswordError) {
        forgotPasswordError.textContent = err.message || "Anfrage fehlgeschlagen.";
        forgotPasswordError.style.display = "block";
      }
    } finally {
      btnSendReset.disabled = false;
    }
  });
}

// --- Neues Passwort setzen (nach Klick auf den Reset-Link) ---

if (btnSetNewPassword) {
  btnSetNewPassword.addEventListener("click", async () => {
    const newPassword = recoveryPassword.value;
    if (recoveryError) recoveryError.style.display = "none";
    if (!newPassword || newPassword.length < 8) {
      if (recoveryError) {
        recoveryError.textContent = "Das Passwort muss mindestens 8 Zeichen haben.";
        recoveryError.style.display = "block";
      }
      return;
    }
    btnSetNewPassword.disabled = true;
    try {
      await updatePassword(newPassword);
      // Recovery-Session ist jetzt eine ganz normale Session - direkt in die App.
      startApp();
    } catch (err) {
      if (recoveryError) {
        recoveryError.textContent = err.message || "Passwort konnte nicht gespeichert werden.";
        recoveryError.style.display = "block";
      }
    } finally {
      btnSetNewPassword.disabled = false;
    }
  });
}

onAuthStateChange((session, event) => {
  if (event === "PASSWORD_RECOVERY") {
    // Supabase gibt uns hier bereits eine gültige (temporäre) Session, aber
    // der Nutzer soll erst ein neues Passwort setzen, bevor er ins Cockpit
    // kommt - deshalb NICHT startApp() aufrufen.
    showRecoveryCard();
    return;
  }
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
