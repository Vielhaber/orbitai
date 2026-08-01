/**
 * B2B Sales Strategist - Application Logic & Enablement Cockpit
 *
 * This file wires up the DOM. Reusable/pure logic lives in ./js/utils.js
 * (HTML escaping, safe URLs, Markdown rendering) and ./js/api.js (all network
 * calls + offline mock data). The Gemini API key is never handled here - it
 * is sent once to the server via api.js and lives server-side from then on.
 */

import {
  escapeHtml,
  renderSafeLink,
  formatMarkdown,
  inlineMarkdown,
  sha256Hex,
} from "./utils.js";

import {
  apiGetConfigStatus,
  apiSaveConfig,
  apiListModels,
  apiGenerate,
  apiGenerateImage,
  apiScrape,
  apiGeocode,
  apiAdminStats,
  apiAdminExport,
  apiInviteMember,
  apiListTeam,
  parseGeminiResponse,
  buildStrategistPrompt,
  buildLeadFinderPrompt,
  buildOfferExtractionPrompt,
  buildOfferMatchPrompt,
  buildChatPrompt,
  buildLandingPagePrompt,
  buildReklamationPrompt,
  buildProduktlistingPrompt,
  buildSocialKampagnePrompt,
  buildTrendRadarPrompt,
  buildSocialContentPrompt,
  extractHtmlFromResponse,
  generateLocalMockData,
  generateLocalMockLeads,
  generateMockLandingpageHTML,
} from "./api.js";

import { syncToCloud, syncSettingsToCloud } from "./cloud.js";
import { getCurrentUserEmail } from "./auth.js";
import { ADMIN_EMAIL } from "./config.js";

const PREPACKAGED_DEMOS = window.PREPACKAGED_DEMOS || {};

function init() {
  // DOM Elements
  const apiKeyInput = document.getElementById("api-key-input");
  const toggleKeyVisibilityBtn = document.getElementById("toggle-key-visibility");
  const saveKeyBtn = document.getElementById("btn-save-key");
  const apiStatusDot = document.getElementById("api-status-dot");
  const apiIconStatus = document.getElementById("api-icon-status");
  const modelSelect = document.getElementById("select-model");

  const industryInput = document.getElementById("input-industry");
  const productInput = document.getElementById("input-product");
  const productUrlInput = document.getElementById("input-product-url");
  const generateForm = document.getElementById("strategist-form");
  const generateBtn = document.getElementById("btn-generate");
  const printBtn = document.getElementById("btn-print");
  const downloadMdBtn = document.getElementById("btn-download-md");
  const saveCampaignBtn = document.getElementById("btn-save-campaign");
  const savedCampaignsList = document.getElementById("saved-campaigns-list");

  // View states
  const welcomeCard = document.getElementById("welcome-card");
  const errorCard = document.getElementById("error-card");
  const errorCardText = document.getElementById("error-card-text");
  const loadingIndicator = document.getElementById("loading-indicator");
  const loadingTextStatus = document.getElementById("loading-text-status");
  const reportContainer = document.getElementById("report-container");

  // Email Personalization Inputs
  const emailContactInput = document.getElementById("email-contact-name");
  const emailCompanyInput = document.getElementById("email-client-company");
  const emailSenderInput = document.getElementById("email-sender-name");

  // Visual Chart Elements
  const chartValStandard = document.getElementById("chart-val-standard");
  const chartValOptimized = document.getElementById("chart-val-optimized");
  const chartBarStandard = document.getElementById("chart-bar-standard");
  const chartBarOptimized = document.getElementById("chart-bar-optimized");

  // CRM DOM elements
  const btnAddLead = document.getElementById("btn-add-lead");
  const btnCancelLead = document.getElementById("btn-cancel-lead");
  const leadFormContainer = document.getElementById("lead-form-container");
  const crmLeadForm = document.getElementById("crm-lead-form");
  const crmLeadsTableBody = document.getElementById("crm-leads-table-body");

  // Lead inputs
  const leadCompanyInput = document.getElementById("lead-company");
  const leadContactInput = document.getElementById("lead-contact");
  const leadEmailInput = document.getElementById("lead-email");
  const leadPhoneInput = document.getElementById("lead-phone");
  const leadStatusSelect = document.getElementById("lead-status");
  const leadPotenzialSelect = document.getElementById("lead-potenzial");
  const leadNotesInput = document.getElementById("lead-notes");

  // Global Directory elements
  const selectClient = document.getElementById("select-client");
  const csvFileInput = document.getElementById("csv-file-input");
  const btnImportCsv = document.getElementById("btn-import-csv");
  const btnShowDirectory = document.getElementById("btn-show-directory");
  const directoryContainer = document.getElementById("directory-container");
  const directoryTableBody = document.getElementById("directory-table-body");
  const btnClearDirectory = document.getElementById("btn-clear-directory");
  const clientCountSpan = document.getElementById("client-count");

  // Global Lead Finder elements (CRM Panel)
  const btnShowLeadFinder = document.getElementById("btn-show-lead-finder");
  const leadFinderContainer = document.getElementById("lead-finder-container");
  const btnCancelFinder = document.getElementById("btn-cancel-finder");
  const btnRunFinder = document.getElementById("btn-run-finder");
  const finderProductInput = document.getElementById("finder-product");
  const finderRegionInput = document.getElementById("finder-region");
  const finderIndustryInput = document.getElementById("finder-industry");
  const finderLoading = document.getElementById("finder-loading");
  const finderResults = document.getElementById("finder-results");
  const finderResultsList = document.getElementById("finder-results-list");

  // Global Lead Finder elements (Main Dashboard Page)
  const btnHeaderLeadFinder = document.getElementById("btn-header-lead-finder");
  const btnWelcomeLeadFinder = document.getElementById("btn-welcome-lead-finder");
  const leadFinderCardMain = document.getElementById("lead-finder-card-main");
  const btnBackToWelcome = document.getElementById("btn-back-to-welcome");
  const btnRunFinderMain = document.getElementById("btn-run-finder-main");
  const finderProductMain = document.getElementById("finder-product-main");
  const finderRegionMain = document.getElementById("finder-region-main");
  const finderIndustryMain = document.getElementById("finder-industry-main");
  const finderLoadingMain = document.getElementById("finder-loading-main");
  const finderResultsMain = document.getElementById("finder-results-main");
  const finderResultsListMain = document.getElementById("finder-results-list-main");

  // Eigenes Angebot (Website auslesen/manuell) + Historie
  const finderOfferHistory = document.getElementById("finder-offer-history");
  const finderOfferWebsite = document.getElementById("finder-offer-website");
  const btnExtractOffer = document.getElementById("btn-extract-offer");
  const finderOfferExtractLoading = document.getElementById("finder-offer-extract-loading");
  const finderOfferText = document.getElementById("finder-offer-text");
  const btnSaveOffer = document.getElementById("btn-save-offer");
  const finderOfferHint = document.getElementById("finder-offer-hint");
  const finderAnalysisMain = document.getElementById("finder-analysis-main");

  // Entfernungs-Sortierung
  const finderSortDistance = document.getElementById("finder-sort-distance");
  const finderDistanceStatus = document.getElementById("finder-distance-status");

  // Settings & Whitelabel DOM Elements
  const btnHeaderSettings = document.getElementById("btn-header-settings");
  const btnBackFromSettings = document.getElementById("btn-back-from-settings");
  const settingsCard = document.getElementById("settings-card");
  const settingAppName = document.getElementById("setting-app-name");
  const settingAppColor = document.getElementById("setting-app-color");
  const settingHideKey = document.getElementById("setting-hide-key");
  const settingAdminPass = document.getElementById("setting-admin-pass");
  const btnResetSettings = document.getElementById("btn-reset-settings");
  const btnSaveSettings = document.getElementById("btn-save-settings");
  const colorHexLabel = document.getElementById("color-hex-label");
  const btnExportBackup = document.getElementById("btn-export-backup");
  const btnImportBackup = document.getElementById("btn-import-backup");
  const backupFileInput = document.getElementById("backup-file-input");

  // Chat Assistant DOM Elements
  const btnChatMic = document.getElementById("btn-chat-mic");
  const chatInput = document.getElementById("chat-input");
  const btnChatSend = document.getElementById("btn-chat-send");
  const chatMessagesBox = document.getElementById("chat-messages-box");

  // Landingpage Generator DOM Elements
  const btnHeaderLandingpageGen = document.getElementById("btn-header-landingpage-generator");
  const landingpageCard = document.getElementById("landingpage-generator-card");
  const btnBackFromLandingpage = document.getElementById("btn-back-from-landingpage");
  const landingpageIndustryInput = document.getElementById("landingpage-industry");
  const landingpageProductInput = document.getElementById("landingpage-product");
  const landingpagePromptInput = document.getElementById("landingpage-prompt");
  const btnGenerateLandingpage = document.getElementById("btn-generate-landingpage");
  const btnLandingpagePreviewTab = document.getElementById("btn-landingpage-preview-tab");
  const btnLandingpageCodeTab = document.getElementById("btn-landingpage-code-tab");
  const btnLandingpageCopyCode = document.getElementById("btn-landingpage-copy-code");
  const btnLandingpageDownloadHtml = document.getElementById("btn-landingpage-download-html");
  const landingpageLoading = document.getElementById("landingpage-loading");
  const landingpagePreviewFrame = document.getElementById("landingpage-preview-frame");
  const landingpageCodeArea = document.getElementById("landingpage-code-area");

  // KI-Werkzeuge DOM Elements
  const btnHeaderAiTools = document.getElementById("btn-header-ai-tools");
  const aiToolsCard = document.getElementById("ai-tools-card");
  const btnBackFromAiTools = document.getElementById("btn-back-from-ai-tools");

  // Admin-Dashboard DOM Elements
  const btnHeaderAdmin = document.getElementById("btn-header-admin");
  const adminCard = document.getElementById("admin-card");
  const btnBackFromAdmin = document.getElementById("btn-back-from-admin");
  const btnAdminExport = document.getElementById("btn-admin-export");
  const adminSummary = document.getElementById("admin-summary");
  const adminTenantsTable = document.getElementById("admin-tenants-table");

  // Team DOM Elements
  const teamInviteEmail = document.getElementById("team-invite-email");
  const btnTeamInvite = document.getElementById("btn-team-invite");
  const teamInviteMessage = document.getElementById("team-invite-message");
  const teamMembersList = document.getElementById("team-members-list");
  const btnRestartTour = document.getElementById("btn-restart-tour");

  // Global State
  let currentEmails = [];
  let currentCampaignKey = null;
  let currentCampaignData = null;
  let activeLeads = [];
  let globalClients = []; // Global client database loaded from localStorage
  let apiKeyConfigured = false; // Whether a Gemini key is stored server-side
  let landingpageGeneratedHtml = ""; // Last landing page HTML generated by the Landingpage generator

  // Banner fields
  const overviewIndustry = document.getElementById("overview-industry");
  const overviewProduct = document.getElementById("overview-product");

  // Tab panels and buttons (Global)
  const tabButtons = document.querySelectorAll(".tab-navigation .tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  // Content panels
  const contentModule1 = document.getElementById("content-module1");
  const contentModuleFit = document.getElementById("content-module-fit");
  const contentModule2 = document.getElementById("content-module2");
  const contentModule3 = document.getElementById("content-module3");

  // Playbook Sub-Elements
  const containerEmailA = document.getElementById("container-email-a");
  const containerEmailB = document.getElementById("container-email-b");
  const containerEmailC = document.getElementById("container-email-c");
  const contentModule4Questions = document.getElementById("content-module4-questions");
  const objectionsContainer = document.getElementById("objections-container");
  const timelineContainer = document.getElementById("timeline-container");

  // Prepackaged Demo buttons
  const demoItems = document.querySelectorAll(".demo-item");

  // ROI Calculator Sliders (Retail & POS Focus)
  const sliderEK = document.getElementById("slider-ek");
  const sliderUVP = document.getElementById("slider-uvp");
  const sliderQty = document.getElementById("slider-qty");
  const sliderPOS = document.getElementById("slider-pos");
  const sliderCross = document.getElementById("slider-cross");

  // ROI Calculator Labels
  const labelEKVal = document.getElementById("calc-ek-val");
  const labelUVPVal = document.getElementById("calc-uvp-val");
  const labelQtyVal = document.getElementById("calc-qty-val");
  const labelPOSVal = document.getElementById("calc-pos-val");
  const labelCrossVal = document.getElementById("calc-cross-val");

  // ROI Calculator Outputs
  const outputMarginTotal = document.getElementById("calc-margin-total");
  const outputProfitMonthly = document.getElementById("calc-profit-monthly");
  const outputBenefitAnnual = document.getElementById("calc-benefit-annual");

  // Initialize Lucide Icons
  lucide.createIcons();

  // --- API KEY STATUS (server-side only, never stored in localStorage) ---

  function updateKeyFieldStyling(value) {
    if (value.length > 10) {
      apiKeyInput.className = "form-input status-valid";
    } else if (value.length === 0) {
      apiKeyInput.className = "form-input status-empty";
    } else {
      apiKeyInput.className = "form-input";
    }
  }

  function setApiKeyConfigured(isConfigured) {
    apiKeyConfigured = isConfigured;
    if (apiStatusDot) apiStatusDot.classList.toggle("active", isConfigured);
    if (apiIconStatus) {
      apiIconStatus.setAttribute("data-lucide", isConfigured ? "check-circle-2" : "shield-alert");
      apiIconStatus.style.color = isConfigured ? "var(--color-success)" : "";
    }
    apiKeyInput.placeholder = isConfigured
      ? "Key ist hinterlegt (zum Ändern neuen Key eingeben)"
      : "AI-Key hier eintragen...";
    lucide.createIcons();
  }

  if (modelSelect) {
    modelSelect.addEventListener("change", () => {
      const selected = modelSelect.options[modelSelect.selectedIndex];
      modelSelect.title = selected ? selected.text : "";
    });
  }

  async function refreshModelOptions() {
    try {
      const models = await apiListModels();
      if (models.length === 0) return;

      modelSelect.innerHTML = "";
      models.forEach(m => {
        const option = document.createElement("option");
        option.value = m.name;

        // Deliberately no longer hardcode a specific model name as
        // "(Empfohlen)" here: Google has already retired one previously-
        // recommended model (gemini-2.5-flash) out from under existing API
        // keys without notice, which silently broke every AI feature for
        // accounts that got auto-defaulted to it. Just show Google's own
        // displayName plus a generic size/speed hint - no name-specific
        // favoritism that can go stale.
        let displayName = m.displayName || m.name;
        if (m.name.includes("lite")) displayName += " (Lite - Schnell/Kostenlos)";
        else if (m.name.includes("pro")) displayName += " (Pro - Tiefe Analyse)";
        else if (m.name.includes("flash")) displayName += " (Flash)";

        option.text = displayName;
        option.title = displayName;
        modelSelect.appendChild(option);
      });

      // Default to whatever Google's API returned first for this key - that
      // ordering reflects which models Google currently considers current/
      // available for THIS account, which is far more reliable than a
      // hardcoded preference list that inevitably goes stale as Google
      // retires and renames models over time.
      if (modelSelect.options.length > 0) {
        modelSelect.options[0].selected = true;
      }
      const selectedOpt = modelSelect.options[modelSelect.selectedIndex];
      if (selectedOpt) modelSelect.title = selectedOpt.text;
    } catch (err) {
      console.error("Failed to load models dynamically:", err);
    }
  }

  // Check on load whether a key is already configured server-side
  (async function initApiKeyStatus() {
    const status = await apiGetConfigStatus();
    setApiKeyConfigured(!!status.configured);
    if (status.configured) {
      refreshModelOptions();
    }

    const noBackendBanner = document.getElementById("no-backend-banner");
    if (noBackendBanner && !status.backendAvailable && !sessionStorage.getItem("hide_no_backend_banner")) {
      noBackendBanner.style.display = "flex";
      lucide.createIcons();
      const dismissBtn = document.getElementById("btn-dismiss-no-backend-banner");
      if (dismissBtn) {
        dismissBtn.addEventListener("click", () => {
          noBackendBanner.style.display = "none";
          sessionStorage.setItem("hide_no_backend_banner", "true");
        });
      }
    }
  })();

  apiKeyInput.addEventListener("input", () => {
    updateKeyFieldStyling(apiKeyInput.value.trim());
  });

  if (saveKeyBtn) {
    saveKeyBtn.addEventListener("click", async () => {
      const key = apiKeyInput.value.trim();
      if (!key) {
        alert("Bitte gib zuerst einen API-Key ein.");
        return;
      }
      try {
        await apiSaveConfig(key);
        apiKeyInput.value = "";
        setApiKeyConfigured(true);
        refreshModelOptions();

        const originalHTML = saveKeyBtn.innerHTML;
        saveKeyBtn.innerHTML = `<i data-lucide="check" style="color: var(--color-success)"></i> Aktiviert!`;
        saveKeyBtn.style.borderColor = "var(--color-success)";
        lucide.createIcons();

        setTimeout(() => {
          saveKeyBtn.innerHTML = originalHTML;
          saveKeyBtn.style.borderColor = "rgba(255, 255, 255, 0.15)";
          lucide.createIcons();
        }, 2000);
      } catch (err) {
        alert("Der Key konnte nicht gespeichert werden: " + err.message);
      }
    });
  }

  // Toggle API Key visibility
  toggleKeyVisibilityBtn.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
    const icon = toggleKeyVisibilityBtn.querySelector("i");
    icon.setAttribute("data-lucide", isPassword ? "eye-off" : "eye");
    lucide.createIcons();
  });

  // --- ADMIN SETTINGS & WHITELABEL LOAD LOGIC ---

  // One-time migration: older versions stored the admin PIN in plaintext.
  // If we find one, hash it and drop the plaintext copy.
  (async function migrateLegacyAdminPassword() {
    const legacyPlain = localStorage.getItem("sales_admin_pass");
    if (legacyPlain) {
      if (!localStorage.getItem("sales_admin_pass_hash")) {
        localStorage.setItem("sales_admin_pass_hash", await sha256Hex(legacyPlain));
      }
      localStorage.removeItem("sales_admin_pass");
    }
  })();

  // Wandelt "#f59e0b" in "245, 158, 11" um, damit rgba(var(--accent-rgb), x)
  // in CSS funktioniert. Gibt null zurück, wenn der Wert kein gültiger Hex-Code ist.
  function hexToRgbString(hex) {
    if (typeof hex !== "string") return null;
    const match = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
    if (!match) return null;
    const int = parseInt(match[1], 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `${r}, ${g}, ${b}`;
  }

  function applyAppBranding() {
    const appName = localStorage.getItem("sales_app_name") || "OrbitAI Sales";
    const appColor = localStorage.getItem("sales_app_color") || "#00f2fe";
    const hideKey = localStorage.getItem("sales_hide_key") === "true";

    // 1. App-Name (Sidebar Header)
    const brandTitleElement = document.querySelector(".brand-title h1");
    if (brandTitleElement) {
      if (appName === "OrbitAI Sales") {
        brandTitleElement.innerHTML = `OrbitAI <span style="color: var(--accent-cyan);">Sales</span>`;
      } else {
        brandTitleElement.innerText = appName;
      }
    }

    // 2. App-Titel im Tab und Header-Titel
    document.title = appName + " - B2B Enablement Cockpit";
    const headerTitleElement = document.querySelector(".header-title h2");
    if (headerTitleElement) {
      headerTitleElement.innerText = appName + " & B2B Enablement Cockpit";
    }

    // 3. Farbthema anwenden (inkl. RGB-Kanal für halbtransparente Glass-Hintergründe,
    //    z. B. bei KI Lead-Scout und KI-Werkzeuge)
    document.documentElement.style.setProperty('--accent-cyan', appColor);
    document.documentElement.style.setProperty('--accent-blue', appColor);
    const accentRgb = hexToRgbString(appColor);
    if (accentRgb) {
      document.documentElement.style.setProperty('--accent-rgb', accentRgb);
    }

    // 4. API-Key Box verbergen
    const apiKeyCard = document.getElementById("api-key-card");
    if (apiKeyCard) {
      apiKeyCard.style.display = hideKey ? "none" : "block";
    }

    // Set input values in settings card
    if (settingAppName) settingAppName.value = appName;
    if (settingAppColor) {
      settingAppColor.value = appColor;
      if (colorHexLabel) colorHexLabel.innerText = appColor;
    }
    if (settingHideKey) settingHideKey.checked = hideKey;

    // NOTE: the admin PIN is stored as a SHA-256 hash, never in plaintext, so
    // it cannot be shown back in this field. Leaving it blank on save keeps
    // the existing PIN unchanged (use "Branding zurücksetzen" to remove it).
    const hasStoredPass = !!localStorage.getItem("sales_admin_pass_hash");
    if (settingAdminPass) {
      settingAdminPass.value = "";
      settingAdminPass.placeholder = hasStoredPass
        ? "Passwort gesetzt (leer lassen = unverändert)"
        : "Standard: kein Passwort gesetzt";
    }
  }

  // Apply immediately on load
  applyAppBranding();

  // Global Tab Switcher (5 Tabs)
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");

      // Deactivate all tabs & panels
      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));

      // Activate target
      btn.classList.add("active");
      document.getElementById(targetId).classList.add("active");

      // Auto-close overlay views (Lead Scout, Setup & Landingpage-Gen) when switching tabs
      if (leadFinderCardMain) leadFinderCardMain.style.display = "none";
      if (settingsCard) settingsCard.style.display = "none";
      if (landingpageCard) landingpageCard.style.display = "none";
      if (aiToolsCard) aiToolsCard.style.display = "none";

      if (currentCampaignData) {
        if (reportContainer) reportContainer.style.display = "flex";
      } else {
        if (welcomeCard) welcomeCard.style.display = "flex";
      }
    });
  });

  // Prepackaged Demo Click Handlers
  demoItems.forEach(item => {
    item.addEventListener("click", () => {
      // Clear saved campaigns list active states
      document.querySelectorAll("#saved-campaigns-list .demo-item").forEach(i => i.classList.remove("active"));
      demoItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      const demoKey = item.getAttribute("data-demo");
      const demoData = PREPACKAGED_DEMOS[demoKey];

      if (demoData) {
        // Populate inputs
        industryInput.value = demoData.industry;
        productInput.value = demoData.product;
        productUrlInput.value = "";

        // Reset CRM states
        currentCampaignKey = null;
        currentCampaignData = JSON.parse(JSON.stringify(demoData)); // Deep clone
        activeLeads = [];
        renderLeadsTable();

        // Setup Save button
        saveCampaignBtn.style.display = "flex";
        saveCampaignBtn.innerHTML = `<i data-lucide="bookmark"></i> Kampagne speichern`;
        saveCampaignBtn.style.borderColor = "";
        saveCampaignBtn.style.background = "";
        lucide.createIcons();

        // Display full structured report
        displayReport(demoData.industry, demoData.product, demoData);
      }
    });
  });

  // Print / PDF Trigger
  printBtn.addEventListener("click", () => {
    window.print();
  });

  // Download Report as Markdown Trigger
  downloadMdBtn.addEventListener("click", () => {
    const industry = overviewIndustry.innerText;
    const product = overviewProduct.innerText;

    if (industry === "-" || reportContainer.style.display === "none") {
      alert("Bitte generiere oder lade zuerst einen Bericht, bevor du ihn exportierst.");
      return;
    }

    // Construct Markdown file content
    let md = `# Sales Playbook & B2B Vertriebscockpit\n\n`;
    md += `## EINGABEDATEN\n`;
    md += `* **Zielgruppe / Branche:** ${industry}\n`;
    md += `* **Produkt / Dienstleistung:** ${product}\n\n`;

    md += `## 1. BEDARFSERMITTLUNG & SCHMERZPUNKTE\n`;
    md += `${document.getElementById("content-module1").innerText}\n\n`;

    md += `## 2. ARGUMENTATION: PRODUKT-BRANCHEN-FIT\n`;
    md += `${document.getElementById("content-module-fit").innerText}\n\n`;

    md += `## 3. BRAUCHBARKEIT & ROI-KALKULATION\n`;
    md += `${document.getElementById("content-module2").innerText}\n\n`;
    md += `### Kalkulations-Parameter:\n`;
    md += `* Einkaufspreis (EK): ${sliderEK.value} €\n`;
    md += `* Verkaufspreis (UVP): ${sliderUVP.value} €\n`;
    md += `* Handelsmarge pro Stück: ${outputMarginTotal.innerText}\n`;
    md += `* Geplante Absatzmenge / Monat: ${sliderQty.value} Stk.\n`;
    md += `* Absatzsteigerung am POS: ${sliderPOS.value} %\n`;
    md += `* Cross-Selling-Umsatz pro Kauf: ${sliderCross.value} €\n`;
    md += `* Gesamter Monatsgewinn (mit POS): ${outputProfitMonthly.innerText}\n`;
    md += `* POS-Zusatzertrag / Jahr: ${outputBenefitAnnual.innerText}\n\n`;

    md += `## 4. GO-TO-MARKET-STRATEGIE & ICP\n`;
    md += `${document.getElementById("content-module3").innerText}\n\n`;

    md += `## 5. AKQUISITIONSTEMPLATES & VERKAUFSGESPRÄCH\n`;
    md += `### Outreach E-Mail-Templates (Personalisiert)\n\n`;
    md += `#### Option A: Nutzenfokus\n`;
    md += `> **Betreff:** ${document.getElementById("container-email-a").querySelector("strong")?.nextSibling?.textContent || ""}\n`;
    md += `${Array.from(document.getElementById("container-email-a").querySelectorAll("blockquote p")).map(p => `> ${p.innerText}`).join("\n")}\n\n`;

    md += `#### Option B: Social Proof\n`;
    md += `> **Betreff:** ${document.getElementById("container-email-b").querySelector("strong")?.nextSibling?.textContent || ""}\n`;
    md += `${Array.from(document.getElementById("container-email-b").querySelectorAll("blockquote p")).map(p => `> ${p.innerText}`).join("\n")}\n\n`;

    md += `#### Option C: Soft Outreach\n`;
    md += `> **Betreff:** ${document.getElementById("container-email-c").querySelector("strong")?.nextSibling?.textContent || ""}\n`;
    md += `${Array.from(document.getElementById("container-email-c").querySelectorAll("blockquote p")).map(p => `> ${p.innerText}`).join("\n")}\n\n`;

    md += `### Leitfaden für das Erstgespräch\n`;
    md += `${contentModule4Questions.innerText}\n\n`;

    // Download logic
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const link = document.createElement("a");
    const filename = `B2B_Playbook_${product.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Bind input listeners for live email personalization
  [emailContactInput, emailCompanyInput, emailSenderInput].forEach(input => {
    input.addEventListener("input", updatePersonalizedEmails);
  });

  // ROI Calculator - Bind Event Listeners to Sliders
  [sliderEK, sliderUVP, sliderQty, sliderPOS, sliderCross].forEach(slider => {
    slider.addEventListener("input", recalculateROI);
  });

  /**
   * Recalculates the margin and POS presentation metrics in real time
   */
  function recalculateROI() {
    const ek = parseFloat(sliderEK.value);
    const uvp = parseFloat(sliderUVP.value);
    const qty = parseInt(sliderQty.value);
    const posBoost = parseFloat(sliderPOS.value) / 100;
    const crossSelling = parseFloat(sliderCross.value);

    // Update Slider text displays
    labelEKVal.innerText = ek.toLocaleString("de-DE") + " €";
    labelUVPVal.innerText = uvp.toLocaleString("de-DE") + " €";
    labelQtyVal.innerText = qty.toLocaleString("de-DE") + " Stk.";
    labelPOSVal.innerText = (posBoost * 100) + " %";
    labelCrossVal.innerText = crossSelling.toLocaleString("de-DE") + " €";

    // Perform calculations
    const marginUnit = uvp - ek;
    const marginPercent = uvp > 0 ? (marginUnit / uvp) * 100 : 0;

    // Standard sales without POS Display
    const standardProfitMonthly = qty * marginUnit;

    // Optimized sales with POS Display
    const optimizedQty = qty * (1 + posBoost);

    // Cross selling profit (assume 40% margin on cross selling items)
    const crossSellingProfit = optimizedQty * crossSelling * 0.40;

    const optimizedProfitMonthly = (optimizedQty * marginUnit) + crossSellingProfit;
    const monthlyBenefit = optimizedProfitMonthly - standardProfitMonthly;
    const annualBenefit = monthlyBenefit * 12;

    // Update Output display HTML
    outputMarginTotal.innerText = `${marginUnit.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})} € (${marginPercent.toFixed(1)}%)`;
    outputProfitMonthly.innerText = optimizedProfitMonthly.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " €";
    outputBenefitAnnual.innerText = annualBenefit.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " €";

    // Update Visual Chart Comparison (Cachesafe check)
    if (chartValStandard && chartValOptimized && chartBarStandard && chartBarOptimized) {
      chartValStandard.innerText = standardProfitMonthly.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " €";
      chartValOptimized.innerText = optimizedProfitMonthly.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " €";

      const maxVal = Math.max(standardProfitMonthly, optimizedProfitMonthly, 1);
      const pctStandard = (standardProfitMonthly / maxVal) * 100;
      const pctOptimized = (optimizedProfitMonthly / maxVal) * 100;

      chartBarStandard.style.width = pctStandard + "%";
      chartBarOptimized.style.width = pctOptimized + "%";
    }
  }

  // Sub-Tab Switcher for 3 Email Outreach Options in Tab 5
  const emailSubTabButtons = document.querySelectorAll(".email-tabs .email-tab-btn");
  const emailPanels = document.querySelectorAll(".email-panel");

  emailSubTabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-email");

      // Toggle buttons
      emailSubTabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Toggle panels
      emailPanels.forEach(p => p.classList.remove("active"));

      let panelEl;
      if (targetId === "email-a") panelEl = document.getElementById("email-panel-a");
      if (targetId === "email-b") panelEl = document.getElementById("email-panel-b");
      if (targetId === "email-c") panelEl = document.getElementById("email-panel-c");
      if (panelEl) panelEl.classList.add("active");
    });
  });

  // Form submission handler (Generate via backend Gemini proxy)
  generateForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const industry = industryInput.value.trim();
    const product = productInput.value.trim();
    const productUrl = productUrlInput.value.trim();

    if (!industry || !product) return;

    demoItems.forEach(i => i.classList.remove("active"));

    if (!apiKeyConfigured) {
      // Instantly run B2B Offline simulation without prompt blocks
      const mockData = generateLocalMockData(industry, product);
      displayReport(industry, product, mockData);
      return;
    }

    // UI state: Show loading
    welcomeCard.style.display = "none";
    errorCard.style.display = "none";
    if (leadFinderCardMain) leadFinderCardMain.style.display = "none";
    reportContainer.style.display = "none";
    loadingIndicator.style.display = "flex";
    generateBtn.disabled = true;

    const loadingPhases = [
      "Strukturiere Branchen-Herausforderungen...",
      "Ermittle Schmerzpunkte und Triggermomente...",
      "Berechne ROI-Heuristiken & Produkt-Markt-Fit...",
      "Formuliere 3 Akquisitions-E-Mails...",
      "Befülle Einwand-Trainer & Nachfass-Sequenz...",
      "Finalisiere Sales-Enablement Cockpit..."
    ];

    let phaseIndex = 0;
    loadingTextStatus.innerText = loadingPhases[phaseIndex];
    const interval = setInterval(() => {
      phaseIndex = (phaseIndex + 1) % loadingPhases.length;
      loadingTextStatus.innerText = loadingPhases[phaseIndex];
    }, 2500);

    // Scrape website if provided (server-side, SSRF-guarded)
    let scrapedText = "";
    if (productUrl) {
      loadingTextStatus.innerText = "Analysiere Produkt-Website...";
      try {
        scrapedText = await apiScrape(productUrl);
      } catch (scrapeErr) {
        console.error("Server-side scraping failed:", scrapeErr);
      }
    }

    try {
      const selectedModel = modelSelect ? modelSelect.value : "gemini-2.5-flash";
      const prompt = buildStrategistPrompt(industry, product, scrapedText);
      const responseContent = await apiGenerate(prompt, selectedModel);
      const parsedData = parseGeminiResponse(responseContent);

      clearInterval(interval);
      loadingIndicator.style.display = "none";
      generateBtn.disabled = false;

      // Reset CRM & Save state for newly generated report
      currentCampaignKey = null;
      currentCampaignData = parsedData;
      activeLeads = [];

      // Auto-add selected client as first lead if one was chosen
      const selectedClientId = selectClient.value;
      if (selectedClientId && globalClients) {
        const client = globalClients.find(c => c.id === selectedClientId);
        if (client) {
          activeLeads.push({
            id: "lead_" + Date.now(),
            company: client.company,
            contact: client.contact || "",
            email: client.email || "",
            phone: client.phone || "",
            status: "Neu",
            potenzial: "Mittel",
            notes: "Automatisch aus globaler Kundenkartei importiert"
          });
        }
      }
      renderLeadsTable();

      saveCampaignBtn.style.display = "flex";
      saveCampaignBtn.innerHTML = `<i data-lucide="bookmark"></i> Kampagne speichern`;
      saveCampaignBtn.style.borderColor = "";
      saveCampaignBtn.style.background = "";
      lucide.createIcons();

      displayReport(industry, product, parsedData);
    } catch (err) {
      clearInterval(interval);
      loadingIndicator.style.display = "none";
      generateBtn.disabled = false;
      welcomeCard.style.display = "flex";

      // Directly fallback to offline simulation to prevent blocky UX
      const mockData = generateLocalMockData(industry, product);
      displayReport(industry, product, mockData);
      alert(`Hinweis: Da das Limit der Live-KI erreicht ist, wurde das Cockpit im Offline-Modus geladen:\n\n${err.message || err}`);
    }
  });

  /**
   * Displays the entire dashboard report and binds widget interactivity
   */
  function displayReport(industry, product, data) {
    // Set banner headers
    overviewIndustry.innerText = industry;
    overviewProduct.innerText = product;

    // Render MD to HTML for standard tabs (formatMarkdown escapes all raw text)
    contentModule1.innerHTML = formatMarkdown(data.modules.module1);
    contentModuleFit.innerHTML = formatMarkdown(data.modules.module_fit);
    contentModule2.innerHTML = formatMarkdown(data.modules.module2);
    contentModule3.innerHTML = formatMarkdown(data.modules.module3);

    // Setup ROI Sliders with Product defaults
    if (data.roi_defaults) {
      sliderEK.value = data.roi_defaults.ek;
      sliderUVP.value = data.roi_defaults.uvp;
      sliderQty.value = data.roi_defaults.monthly_qty;
      sliderPOS.value = data.roi_defaults.pos_boost;
      sliderCross.value = data.roi_defaults.cross_selling;
      recalculateROI();
    }

    // Render 3 Email Templates
    if (data.emails && data.emails.length >= 3) {
      currentEmails = data.emails;
      updatePersonalizedEmails();
    } else {
      // Fallback
      containerEmailA.innerHTML = "<p>Keine E-Mail-Vorlage vorhanden.</p>";
      containerEmailB.innerHTML = "";
      containerEmailC.innerHTML = "";
    }

    // Render Questions in Tab 5
    if (data.questions_raw) {
      contentModule4Questions.innerHTML = formatMarkdown(data.questions_raw);
    } else {
      contentModule4Questions.innerHTML = "<h4>Leitfaden</h4><p>Bereit für Gespräche.</p>";
    }

    // Render Objections Widget
    renderObjectionsWidget(data.objections);

    // Render Timeline Widget
    renderTimelineWidget(data.followup);

    // Bind clipboard actions
    bindCopyButtons();

    welcomeCard.style.display = "none";
    loadingIndicator.style.display = "none";
    if (leadFinderCardMain) leadFinderCardMain.style.display = "none";
    reportContainer.style.display = "flex";

    // Automatically switch to first tab
    document.getElementById("tab-module1").click();

    // Automatically reset email sub-tab
    document.getElementById("btn-email-a").click();
  }

  /**
   * Updates the email templates on the UI with user personalization inputs
   */
  function updatePersonalizedEmails() {
    if (!currentEmails || currentEmails.length === 0) return;

    const contact = emailContactInput.value.trim() || "[Nachname]";
    const company = emailCompanyInput.value.trim() || "[Firmenname]";
    const sender = emailSenderInput.value.trim() || "[Ihr Name]";

    const personalized = currentEmails.map(email => {
      let personalizedBody = email.body
        .replace(/\[Nachname\]/g, contact)
        .replace(/\[Ansprechpartner\]/g, contact)
        .replace(/\[Firmenname\]/g, company)
        .replace(/\[Ihr Name\]/g, sender);

      let personalizedSubject = email.subject
        .replace(/\[Nachname\]/g, contact)
        .replace(/\[Ansprechpartner\]/g, contact)
        .replace(/\[Firmenname\]/g, company)
        .replace(/\[Ihr Name\]/g, sender);

      return {
        type: email.type,
        subject: personalizedSubject,
        body: personalizedBody
      };
    });

    containerEmailA.innerHTML = renderEmailBlock(personalized[0]);
    containerEmailB.innerHTML = renderEmailBlock(personalized[1]);
    containerEmailC.innerHTML = renderEmailBlock(personalized[2]);

    // Bind copy functionality to the newly generated buttons
    bindCopyButtons();
    lucide.createIcons();
  }

  /**
   * Formats an email template with a copy button and a send button.
   * All AI-generated text is escaped before being placed in the DOM.
   */
  function renderEmailBlock(email) {
    const emailBodyText = email.body.replace(/^>\s?/gm, "");
    const fullText = `Betreff: ${email.subject}\n\n${emailBodyText}`;
    const cleanText = escapeHtml(fullText.trim());

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(emailBodyText)}`;

    return `
      <h5 style="margin-bottom: 0.5rem; color: var(--accent-cyan); font-size: 0.95rem;">${escapeHtml(email.type)}</h5>
      <div class="blockquote-wrapper" style="margin-top: 0.5rem;">
        <a class="blockquote-copy-btn" style="right: 7.5rem; text-decoration: none; display: flex; align-items: center; gap: 0.25rem; background: var(--accent-cyan); color: #000; border-color: var(--accent-cyan);" href="${escapeHtml(mailtoUrl)}">
          <i data-lucide="send" style="width: 14px; height: 14px;"></i> Senden
        </a>
        <button class="blockquote-copy-btn btn-copy-email" data-clipboard="${cleanText}">
          <i data-lucide="copy" style="width: 14px; height: 14px;"></i> Kopieren
        </button>
        <blockquote>
          <p><strong>Betreff:</strong> ${escapeHtml(email.subject)}</p>
          <br>
          ${email.body.split("\n").map(line => `<p>${inlineMarkdown(line.replace(/^>\s?/, ""))}</p>`).join("")}
        </blockquote>
      </div>
    `;
  }

  /**
   * Renders the interactive Objection Handler cards
   */
  function renderObjectionsWidget(objections) {
    if (!objections || objections.length === 0) {
      objectionsContainer.innerHTML = "<p>Keine spezifischen Einwände gelistet.</p>";
      return;
    }

    objectionsContainer.innerHTML = objections.map((obj, index) => `
      <div class="objection-card" id="obj-card-${index}">
        <div class="objection-header">
          <span>${escapeHtml(obj.title)}</span>
          <i data-lucide="chevron-down" style="width: 18px; height: 18px;"></i>
        </div>
        <div class="objection-body">
          <div class="objection-content markdown-body">
            ${formatMarkdown(obj.content)}
          </div>
        </div>
      </div>
    `).join("");

    lucide.createIcons();

    // Bind Accordion Click handlers
    objections.forEach((_, index) => {
      const card = document.getElementById(`obj-card-${index}`);
      const header = card.querySelector(".objection-header");

      header.addEventListener("click", () => {
        const isExpanded = card.classList.contains("expanded");

        // Collapse all others
        document.querySelectorAll(".objection-card").forEach(c => c.classList.remove("expanded"));

        // Toggle current
        if (!isExpanded) {
          card.classList.add("expanded");
        }
      });
    });
  }

  /**
   * Renders the interactive 14-Day Timeline widget
   */
  function renderTimelineWidget(timeline) {
    if (!timeline || timeline.length === 0) {
      timelineContainer.innerHTML = "<p>Kein Nachfassplan vorhanden.</p>";
      return;
    }

    timelineContainer.innerHTML = timeline.map(step => `
      <div class="timeline-item">
        <div class="timeline-badge"></div>
        <div class="timeline-header">
          <span class="timeline-day">${escapeHtml(step.day)}</span>
          <span class="timeline-title">${escapeHtml(step.title)}</span>
        </div>
        <div class="timeline-body">
          ${inlineMarkdown(step.content)}
        </div>
      </div>
    `).join("");
  }

  /**
   * Binds event listeners to the copy buttons
   */
  function bindCopyButtons() {
    const copyBtns = document.querySelectorAll(".blockquote-copy-btn");
    copyBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const textToCopy = btn.getAttribute("data-clipboard");

        const tempText = document.createElement("textarea");
        tempText.innerHTML = textToCopy;
        const decodedText = tempText.value;

        navigator.clipboard.writeText(decodedText).then(() => {
          btn.innerHTML = `<i data-lucide="check" style="width: 14px; height: 14px;"></i> Kopiert!`;
          btn.style.background = "var(--color-success)";
          btn.style.color = "#ffffff";
          btn.style.borderColor = "var(--color-success)";
          lucide.createIcons();

          setTimeout(() => {
            btn.innerHTML = `<i data-lucide="copy" style="width: 14px; height: 14px;"></i> Kopieren`;
            btn.style.background = "";
            btn.style.color = "";
            btn.style.borderColor = "";
            lucide.createIcons();
          }, 2500);
        }).catch(err => {
          console.error("Fehler beim Kopieren: ", err);
        });
      });
    });
  }

  // --- CRM & SAVED CAMPAIGNS CORE ORCHESTRATION ---

  // Initial rendering of saved campaigns on page load
  renderSavedCampaigns();

  // Save campaign click handler
  saveCampaignBtn.addEventListener("click", () => {
    if (!currentCampaignData) return;

    // Auto-generate key if not present
    if (!currentCampaignKey) {
      const defaultName = `${currentCampaignData.product} - ${currentCampaignData.industry}`.substring(0, 40);
      const name = prompt("Bitte gib einen Namen für diese Kampagne ein:", defaultName);
      if (!name) return;
      currentCampaignKey = "campaign_" + Date.now();
      currentCampaignData.name = name;
    }

    saveCurrentCampaign();

    // Visual indicator that campaign is saved
    saveCampaignBtn.innerHTML = `<i data-lucide="check" style="color: var(--color-success)"></i> Gespeichert`;
    saveCampaignBtn.style.borderColor = "var(--color-success)";
    saveCampaignBtn.style.background = "rgba(16, 185, 129, 0.1)";
    lucide.createIcons();

    alert("Kampagne und Leads erfolgreich lokal gespeichert!");
  });

  btnAddLead.addEventListener("click", () => {
    leadFormContainer.style.display = (leadFormContainer.style.display === "none" || !leadFormContainer.style.display) ? "block" : "none";
  });

  btnCancelLead.addEventListener("click", () => {
    leadFormContainer.style.display = "none";
    crmLeadForm.reset();
  });

  // Submit Lead Form
  crmLeadForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!currentCampaignData) {
      currentCampaignData = {
        product: "Manuelle Leads",
        industry: "B2B",
        name: "Manuelle Leads Kampagne",
        roi_defaults: { ek: 45, uvp: 99, monthly_qty: 250, pos_boost: 25, cross_selling: 12 }
      };
      currentCampaignKey = "campaign_" + Date.now();
    }

    // Generate key on first lead add if not already saved
    if (!currentCampaignKey) {
      const defaultName = `${currentCampaignData.product} - ${currentCampaignData.industry}`.substring(0, 40);
      const name = prompt("Bitte gib einen Namen für diese Kampagne ein, um deine Leads speichern zu können:", defaultName);
      if (!name) return;
      currentCampaignKey = "campaign_" + Date.now();
      currentCampaignData.name = name;
    }

    const lead = {
      id: "lead_" + Date.now(),
      company: leadCompanyInput.value.trim(),
      contact: leadContactInput.value.trim(),
      email: leadEmailInput.value.trim(),
      phone: leadPhoneInput.value.trim(),
      status: leadStatusSelect.value,
      potenzial: leadPotenzialSelect ? leadPotenzialSelect.value : "Mittel",
      notes: leadNotesInput.value.trim()
    };

    activeLeads.push(lead);
    crmLeadForm.reset();
    leadFormContainer.style.display = "none";

    saveCurrentCampaign();
    renderLeadsTable();
  });

  // Save current state (data + leads) to localStorage
  function saveCurrentCampaign() {
    if (!currentCampaignKey || !currentCampaignData) return;

    const campaigns = JSON.parse(localStorage.getItem("sales_campaigns") || "{}");
    campaigns[currentCampaignKey] = {
      id: currentCampaignKey,
      name: currentCampaignData.name || `${currentCampaignData.product} - ${currentCampaignData.industry}`,
      industry: currentCampaignData.industry,
      product: currentCampaignData.product,
      data: currentCampaignData,
      leads: activeLeads
    };

    localStorage.setItem("sales_campaigns", JSON.stringify(campaigns));
    syncToCloud("campaigns", "sales_campaigns", {});
    renderSavedCampaigns();
  }

  // Render Saved Campaigns in Sidebar
  function renderSavedCampaigns() {
    const campaigns = JSON.parse(localStorage.getItem("sales_campaigns") || "{}");
    const keys = Object.keys(campaigns);

    if (keys.length === 0) {
      savedCampaignsList.innerHTML = `<p style="color: var(--text-dim); font-size: 0.75rem; text-align: center; font-style: italic; margin-top: 0.5rem;">Noch keine Kampagnen gespeichert.</p>`;
      return;
    }

    savedCampaignsList.innerHTML = keys.map(key => {
      const camp = campaigns[key];
      const activeClass = currentCampaignKey === camp.id ? "active" : "";
      return `
        <div class="demo-item ${activeClass}" id="btn-camp-${escapeHtml(camp.id)}" style="position: relative; padding-right: 2.25rem;">
          <div onclick="window.loadCampaignFromUI('${camp.id}')" style="cursor: pointer; width: 100%;">
            <h3>${escapeHtml(camp.name)}</h3>
            <p>${escapeHtml(camp.product)} @ ${escapeHtml(String(camp.industry || "").substring(0, 20))}...</p>
          </div>
          <button onclick="window.deleteCampaignFromUI(event, '${camp.id}')" style="position: absolute; right: 0.5rem; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--color-error); cursor: pointer; opacity: 0.6; padding: 0.25rem; transition: opacity 0.2s; display: flex; align-items: center;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6" title="Kampagne löschen">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      `;
    }).join("");

    lucide.createIcons();
  }

  // Global functions attached to window for click triggers inside dynamically rendered HTML
  window.loadCampaignFromUI = function(id) {
    const campaigns = JSON.parse(localStorage.getItem("sales_campaigns") || "{}");
    const camp = campaigns[id];
    if (!camp) return;

    // Set global states
    currentCampaignKey = id;
    currentCampaignData = camp.data;
    activeLeads = camp.leads || [];

    // Select styling in sidebar
    document.querySelectorAll(".demo-item").forEach(item => item.classList.remove("active"));
    const btn = document.getElementById(`btn-camp-${id}`);
    if (btn) btn.classList.add("active");

    // Populate form inputs
    industryInput.value = camp.industry;
    productInput.value = camp.product;
    productUrlInput.value = "";

    // Display report
    displayReport(camp.industry, camp.product, camp.data);

    // Render leads table
    renderLeadsTable();

    // Show save button as green/check
    saveCampaignBtn.style.display = "flex";
    saveCampaignBtn.innerHTML = `<i data-lucide="check" style="color: var(--color-success)"></i> Gespeichert`;
    saveCampaignBtn.style.borderColor = "var(--color-success)";
    saveCampaignBtn.style.background = "rgba(16, 185, 129, 0.1)";
    lucide.createIcons();
  };

  window.deleteCampaignFromUI = function(event, id) {
    event.stopPropagation();
    if (!confirm("Möchtest du diese Kampagne wirklich dauerhaft löschen? Alle zugehörigen Leads gehen verloren.")) return;

    const campaigns = JSON.parse(localStorage.getItem("sales_campaigns") || "{}");
    delete campaigns[id];
    localStorage.setItem("sales_campaigns", JSON.stringify(campaigns));
    syncToCloud("campaigns", "sales_campaigns", {});

    if (currentCampaignKey === id) {
      currentCampaignKey = null;
      currentCampaignData = null;
      activeLeads = [];
      saveCampaignBtn.style.display = "none";
      welcomeCard.style.display = "flex";
      reportContainer.style.display = "none";
    }

    renderSavedCampaigns();
  };

  // Render Leads Table
  function potenzialBadgeStyle(potenzial) {
    if (potenzial === "Hoch") return "background: rgba(16, 185, 129, 0.15); color: #10b981;";
    if (potenzial === "Gering") return "background: rgba(59, 130, 246, 0.15); color: #3b82f6;";
    return "background: rgba(245, 158, 11, 0.15); color: #f59e0b;"; // Mittel (default)
  }

  function renderLeadsTable() {
    if (activeLeads.length === 0) {
      crmLeadsTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="padding: 2rem; text-align: center; color: var(--text-dim); font-style: italic; background: rgba(0,0,0,0.05);">
            Keine Leads vorhanden. Klicke oben auf "Lead hinzufügen", um den ersten Kontakt anzulegen.
          </td>
        </tr>
      `;
      return;
    }

    crmLeadsTableBody.innerHTML = activeLeads.map(lead => {
      let statusColor = "rgba(255,255,255,0.05)";
      if (lead.status === "Neu") statusColor = "rgba(59, 130, 246, 0.15); color: #3b82f6;";
      else if (lead.status === "E-Mail gesendet") statusColor = "rgba(245, 158, 11, 0.15); color: #f59e0b;";
      else if (lead.status === "Erstgespräch") statusColor = "rgba(139, 92, 246, 0.15); color: #8b5cf6;";
      else if (lead.status === "Angebot") statusColor = "rgba(236, 72, 153, 0.15); color: #ec4899;";
      else if (lead.status === "Gewonnen") statusColor = "rgba(16, 185, 129, 0.15); color: #10b981;";
      else if (lead.status === "Abgelehnt") statusColor = "rgba(239, 68, 68, 0.15); color: #ef4444;";

      const potenzial = lead.potenzial || "Mittel";

      return `
        <tr style="border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.01);">
          <td style="padding: 0.75rem 1rem; font-weight: 500; color: var(--text-main);">${escapeHtml(lead.company)}</td>
          <td style="padding: 0.75rem 1rem; color: var(--text-main);">${escapeHtml(lead.contact) || "-"}</td>
          <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${escapeHtml(lead.email) || "-"}</td>
          <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${escapeHtml(lead.phone) || "-"}</td>
          <td style="padding: 0.75rem 1rem;">
            <span style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; ${potenzialBadgeStyle(potenzial)}">${escapeHtml(potenzial)}</span>
          </td>
          <td style="padding: 0.75rem 1rem;">
            <select onchange="window.updateLeadStatus('${lead.id}', this.value)" style="background: ${statusColor.split(";")[0]}; color: ${statusColor.includes("color:") ? statusColor.split("color: ")[1].replace(";", "") : "var(--text-main)"}; border: none; border-radius: 4px; padding: 0.25rem 0.5rem; font-size: 0.75rem; cursor: pointer; font-weight: 500; outline: none;">
              <option value="Neu" ${lead.status === "Neu" ? "selected" : ""}>Neu</option>
              <option value="E-Mail gesendet" ${lead.status === "E-Mail gesendet" ? "selected" : ""}>E-Mail gesendet</option>
              <option value="Erstgespräch" ${lead.status === "Erstgespräch" ? "selected" : ""}>Erstgespräch</option>
              <option value="Angebot" ${lead.status === "Angebot" ? "selected" : ""}>Angebot</option>
              <option value="Gewonnen" ${lead.status === "Gewonnen" ? "selected" : ""}>Gewonnen</option>
              <option value="Abgelehnt" ${lead.status === "Abgelehnt" ? "selected" : ""}>Abgelehnt</option>
            </select>
          </td>
          <td style="padding: 0.75rem 1rem; color: var(--text-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(lead.notes)}">${escapeHtml(lead.notes) || "-"}</td>
          <td style="padding: 0.75rem 1rem; text-align: right;">
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center;">
              <button onclick="window.prepareEmailForLead('${lead.id}')" class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.7rem; width: auto; gap: 0.25rem; border-color: var(--accent-cyan); color: var(--accent-cyan); display: inline-flex; align-items: center;" title="E-Mail personalisieren">
                <i data-lucide="mail" style="width: 12px; height: 12px;"></i> Mail
              </button>
              <button onclick="window.deleteLead('${lead.id}')" class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.7rem; width: auto; border-color: var(--color-error); color: var(--color-error); display: inline-flex; align-items: center;" title="Lead löschen">
                <i data-lucide="user-x" style="width: 12px; height: 12px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    lucide.createIcons();
  }

  window.updateLeadStatus = function(leadId, newStatus) {
    const lead = activeLeads.find(l => l.id === leadId);
    if (lead) {
      lead.status = newStatus;
      saveCurrentCampaign();
      renderLeadsTable();
    }
  };

  window.deleteLead = function(leadId) {
    if (!confirm("Möchtest du diesen Lead wirklich löschen?")) return;
    activeLeads = activeLeads.filter(l => l.id !== leadId);
    saveCurrentCampaign();
    renderLeadsTable();
  };

  window.prepareEmailForLead = function(leadId) {
    const lead = activeLeads.find(l => l.id === leadId);
    if (!lead) return;

    // Fill personalization inputs
    emailContactInput.value = lead.contact || "";
    emailCompanyInput.value = lead.company || "";

    // Trigger live personalization updates
    updatePersonalizedEmails();

    // Switch to Playbook Tab (Tab 5)
    document.getElementById("tab-module4").click();

    // Switch status to "E-Mail gesendet" automatically
    if (lead.status === "Neu") {
      lead.status = "E-Mail gesendet";
      saveCurrentCampaign();
      renderLeadsTable();
    }
  };

  // --- GLOBAL CLIENT DIRECTORY & CSV IMPORT ---

  // Load Global Clients on Startup
  loadGlobalClients();

  function loadGlobalClients() {
    globalClients = JSON.parse(localStorage.getItem("sales_clients") || "[]");
    updateClientDropdown();
    renderDirectoryTable();
    clientCountSpan.innerText = globalClients.length;
  }

  function saveGlobalClients() {
    localStorage.setItem("sales_clients", JSON.stringify(globalClients));
    syncToCloud("clients", "sales_clients", []);
    updateClientDropdown();
    renderDirectoryTable();
    clientCountSpan.innerText = globalClients.length;
  }

  function renderDirectoryTable() {
    if (!directoryTableBody) return;
    if (globalClients.length === 0) {
      directoryTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-dim); font-style: italic; padding: 1.5rem 1rem;">
            Keine Kunden in der Kartei. Importiere eine CSV oder nutze den Lead-Finder.
          </td>
        </tr>
      `;
      return;
    }

    directoryTableBody.innerHTML = globalClients.map((c) => `
      <tr>
        <td style="font-weight: 600; color: var(--accent-cyan);">${escapeHtml(c.company) || "-"}</td>
        <td>${escapeHtml(c.contact) || "-"}</td>
        <td>${escapeHtml(c.email) || "-"}</td>
        <td>${escapeHtml(c.industry) || "-"}</td>
        <td>${renderSafeLink(c.website)}</td>
        <td>${escapeHtml(c.product) || "-"}</td>
      </tr>
    `).join("");
  }

  // Populate dynamic select-client dropdown
  function updateClientDropdown() {
    selectClient.innerHTML = '<option value="">-- Kein Kunde gewählt --</option>';
    globalClients.forEach(client => {
      const opt = document.createElement("option");
      opt.value = client.id;
      opt.text = `${client.company} (${client.contact || "Kein Kontakt"})`;
      selectClient.appendChild(opt);
    });
  }

  // Handle client selection change to auto-fill form inputs
  selectClient.addEventListener("change", () => {
    const selectedId = selectClient.value;
    if (!selectedId) return;

    const client = globalClients.find(c => c.id === selectedId);
    if (client) {
      industryInput.value = client.industry || "";
      productInput.value = client.product || "";
      productUrlInput.value = client.website || "";

      // Flash indicator animation to show fields filled
      [industryInput, productInput, productUrlInput].forEach(inp => {
        inp.style.borderColor = "var(--accent-cyan)";
        setTimeout(() => inp.style.borderColor = "", 1500);
      });
    }
  });

  // Trigger file dialog
  btnImportCsv.addEventListener("click", () => {
    csvFileInput.click();
  });

  // Handle CSV file selection
  csvFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      const text = evt.target.result;
      parseCSVAndImport(text);
      csvFileInput.value = ""; // Reset
    };
    reader.readAsText(file, "UTF-8");
  });

  // Simple robust CSV parser. Values are stored as-is; all rendering paths
  // (renderDirectoryTable, renderLeadsTable, etc.) escape on output, and
  // website links are additionally scheme-validated via sanitizeUrl().
  function parseCSVAndImport(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) {
      alert("Die CSV-Datei enthält keine ausreichenden Daten.");
      return;
    }

    let importedCount = 0;
    const header = lines[0];
    const delimiter = header.includes(";") ? ";" : ",";

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(delimiter).map(c => c.replace(/^["']|["']$/g, "").trim());

      if (cols[0]) { // Require at least company name
        globalClients.push({
          id: "client_" + Date.now() + "_" + i,
          company: cols[0],
          contact: cols[1] || "",
          email: cols[2] || "",
          industry: cols[3] || "",
          website: cols[4] || "",
          product: cols[5] || ""
        });
        importedCount++;
      }
    }

    if (importedCount > 0) {
      saveGlobalClients();
      alert(`${importedCount} Kunden erfolgreich in die globale Kartei importiert!`);
    } else {
      alert("Es konnten keine Kunden importiert werden. Bitte prüfe das Format der CSV-Datei.");
    }
  }

  // Toggle global directory table visibility
  btnShowDirectory.addEventListener("click", () => {
    directoryContainer.style.display = (directoryContainer.style.display === "none" || !directoryContainer.style.display) ? "block" : "none";
  });

  // Clear global client directory database
  btnClearDirectory.addEventListener("click", () => {
    if (!confirm("Möchtest du die gesamte Kundenkartei wirklich leeren? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
    globalClients = [];
    saveGlobalClients();
    directoryContainer.style.display = "none";
  });

  // --- KI LEAD-FINDER ORCHESTRATION ---

  // Toggle Lead Finder visibility
  btnShowLeadFinder.addEventListener("click", () => {
    leadFinderContainer.style.display = (leadFinderContainer.style.display === "none" || !leadFinderContainer.style.display) ? "block" : "none";
  });

  btnCancelFinder.addEventListener("click", () => {
    leadFinderContainer.style.display = "none";
    finderProductInput.value = "";
    finderRegionInput.value = "";
    finderIndustryInput.value = "";
    finderResults.style.display = "none";
  });

  // Call Gemini (via backend) to search for Leads
  btnRunFinder.addEventListener("click", async () => {
    const product = finderProductInput.value.trim();
    const region = finderRegionInput.value.trim();
    const industry = finderIndustryInput.value.trim();

    if (!apiKeyConfigured) {
      // Instantly run local simulation without dialog blockages
      const mockLeads = generateLocalMockLeads(product, region, industry);
      renderFinderResults(mockLeads);
      return;
    }
    if (!product || !region) {
      alert("Bitte fülle mindestens 'Produkt / Lösung' und 'Region / Stadt' aus.");
      return;
    }

    // Show loading indicator
    finderLoading.style.display = "flex";
    btnRunFinder.disabled = true;
    finderResults.style.display = "none";

    try {
      const selectedModel = modelSelect ? modelSelect.value : "gemini-2.5-flash";
      const leadFinderPrompt = buildLeadFinderPrompt(product, region, industry, 7);
      let rawText = await apiGenerate(leadFinderPrompt, selectedModel);

      // Clean Markdown markers if present
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

      const parsedLeads = JSON.parse(rawText);
      renderFinderResults(parsedLeads);
    } catch (err) {
      console.error("Lead Finder failed:", err);
      const mockLeads = generateLocalMockLeads(product, region, industry);
      renderFinderResults(mockLeads);
      alert(`Hinweis: Da die Live-Recherche fehlgeschlagen ist, wurden simulierte B2B-Abnehmer geladen:\n\n${err.message || err}`);
    } finally {
      finderLoading.style.display = "none";
      btnRunFinder.disabled = false;
    }
  });

  // Render scouted Leads as HTML Cards
  function renderFinderResults(leads) {
    if (!leads || leads.length === 0) {
      finderResultsList.innerHTML = `<p style="color: var(--text-dim); font-size: 0.75rem; text-align: center; font-style: italic;">Keine Leads gefunden.</p>`;
      finderResults.style.display = "block";
      return;
    }

    finderResultsList.innerHTML = leads.map((lead, index) => {
      const cleanLeadStr = escapeHtml(JSON.stringify(lead));
      const potenzial = lead.potenzial || "Mittel";
      return `
        <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.75rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
          <div style="flex: 1; text-align: left;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <h6 style="font-size: 0.85rem; color: var(--accent-cyan); font-weight: 600; margin: 0;">${escapeHtml(lead.company)}</h6>
              <span style="display: inline-block; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.65rem; font-weight: 600; ${potenzialBadgeStyle(potenzial)}">${escapeHtml(potenzial)}</span>
            </div>
            <p style="font-size: 0.75rem; color: var(--text-main); margin-bottom: 0.25rem; margin-top: 0;">
              <strong>Kontakt:</strong> ${escapeHtml(lead.contact) || "-"} | <strong>E-Mail:</strong> ${escapeHtml(lead.email) || "-"}
            </p>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem; margin-top: 0;">
              <strong>Website:</strong> ${renderSafeLink(lead.website)}
            </p>
            <p style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.3; margin: 0;">
              <strong>Hintergrund:</strong> ${escapeHtml(lead.notes) || "-"}
            </p>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.4rem; min-width: 80px;">
            <button onclick="window.addFinderClientToDirectory('${index}', '${cleanLeadStr}')" id="btn-finder-dir-${index}" class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.7rem; width: auto; gap: 0.2rem; display: inline-flex; align-items: center; justify-content: center;" title="Kunden in die globale Kartei aufnehmen">
              <i data-lucide="folder-plus" style="width: 12px; height: 12px;"></i> + Kartei
            </button>
            <button onclick="window.addFinderClientToCampaignLeads('${index}', '${cleanLeadStr}')" id="btn-finder-lead-${index}" class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.7rem; width: auto; gap: 0.2rem; border-color: var(--accent-cyan); color: var(--accent-cyan); display: inline-flex; align-items: center; justify-content: center;" title="Als Lead für aktuelle Kampagne anlegen">
              <i data-lucide="user-plus" style="width: 12px; height: 12px;"></i> + Lead
            </button>
          </div>
        </div>
      `;
    }).join("");

    finderResults.style.display = "block";
    lucide.createIcons();
  }

  // Global functions to add scouted leads to card lists
  window.addFinderClientToDirectory = function(index, leadJsonStr) {
    try {
      const lead = JSON.parse(leadJsonStr);

      // Check if already in directory
      const exists = globalClients.some(c => c.company === lead.company);
      if (exists) {
        alert("Dieses Unternehmen existiert bereits in deiner Kundenkartei.");
        return;
      }

      globalClients.push({
        id: "client_" + Date.now(),
        company: lead.company,
        contact: (lead.contact || "").split(" (")[0] || lead.contact || "",
        email: lead.email || "",
        industry: lead.industry || "",
        website: lead.website || "",
        product: finderProductInput.value.trim()
      });

      saveGlobalClients();

      // Update UI button
      const btn = document.getElementById(`btn-finder-dir-${index}`);
      if (btn) {
        btn.innerHTML = `<i data-lucide="check" style="width: 12px; height: 12px; color: var(--color-success)"></i> Drin`;
        btn.disabled = true;
        lucide.createIcons();
      }
    } catch (e) {
      console.error(e);
    }
  };

  window.addFinderClientToCampaignLeads = function(index, leadJsonStr) {
    try {
      if (!currentCampaignData) {
        currentCampaignData = {
          product: (finderProductMain && finderProductMain.value.trim()) || "Allgemeines Produkt",
          industry: (finderIndustryMain && finderIndustryMain.value.trim()) || "Allgemeine Branche",
          name: "Allgemeine Kampagne - " + ((finderRegionMain && finderRegionMain.value.trim()) || "Lokale Suche"),
          roi_defaults: { ek: 45, uvp: 99, monthly_qty: 250, pos_boost: 25, cross_selling: 12 }
        };
        currentCampaignKey = "campaign_" + Date.now();
      }

      // Generate key on first lead add if not already saved
      if (!currentCampaignKey) {
        const defaultName = `${currentCampaignData.product} - ${currentCampaignData.industry}`.substring(0, 40);
        const name = prompt("Bitte gib einen Namen für diese Kampagne ein, um deine Leads speichern zu können:", defaultName);
        if (!name) return;
        currentCampaignKey = "campaign_" + Date.now();
        currentCampaignData.name = name;
      }

      const lead = JSON.parse(leadJsonStr);

      // Check if already in leads
      const exists = activeLeads.some(l => l.company === lead.company);
      if (exists) {
        alert("Dieses Unternehmen existiert bereits als aktiver Lead in dieser Kampagne.");
        return;
      }

      activeLeads.push({
        id: "lead_" + Date.now(),
        company: lead.company,
        contact: (lead.contact || "").split(" (")[0] || lead.contact || "",
        email: lead.email || "",
        phone: lead.phone || "",
        status: "Neu",
        potenzial: lead.potenzial || "Mittel",
        notes: lead.notes || "Über KI Lead-Finder recherchiert."
      });

      saveCurrentCampaign();
      renderLeadsTable();

      // Update UI button
      const btn = document.getElementById(`btn-finder-lead-${index}`);
      if (btn) {
        btn.innerHTML = `<i data-lucide="check" style="width: 12px; height: 12px; color: var(--color-success)"></i> Drin`;
        btn.disabled = true;
        lucide.createIcons();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- KI LEAD-FINDER MAIN PAGE VIEW ORCHESTRATION ---

  // Toggle views to enter main page Lead Finder
  if (btnWelcomeLeadFinder) btnWelcomeLeadFinder.addEventListener("click", openMainLeadScout);
  if (btnHeaderLeadFinder) btnHeaderLeadFinder.addEventListener("click", openMainLeadScout);

  function openMainLeadScout() {
    if (leadFinderCardMain && leadFinderCardMain.style.display === "flex") {
      leadFinderCardMain.style.display = "none";
      if (currentCampaignData) {
        if (reportContainer) reportContainer.style.display = "flex";
      } else {
        if (welcomeCard) welcomeCard.style.display = "flex";
      }
    } else {
      if (welcomeCard) welcomeCard.style.display = "none";
      if (reportContainer) reportContainer.style.display = "none";
      if (settingsCard) settingsCard.style.display = "none";
      if (landingpageCard) landingpageCard.style.display = "none";
      if (aiToolsCard) aiToolsCard.style.display = "none";
      if (leadFinderCardMain) leadFinderCardMain.style.display = "flex";
    }
  }

  // Toggle back to normal analyzer view
  if (btnBackToWelcome) {
    btnBackToWelcome.addEventListener("click", () => {
      if (leadFinderCardMain) leadFinderCardMain.style.display = "none";
      if (currentCampaignData) {
        if (reportContainer) reportContainer.style.display = "flex";
      } else {
        if (welcomeCard) welcomeCard.style.display = "flex";
      }
    });
  }

  // --- Eigenes Angebot: Website auslesen, manuell eintragen, Historie ---

  function loadOffers() {
    try {
      return JSON.parse(localStorage.getItem("sales_offers") || "[]");
    } catch (_) {
      return [];
    }
  }

  function saveOffers(offers) {
    localStorage.setItem("sales_offers", JSON.stringify(offers));
    syncToCloud("offers", "sales_offers", []);
  }

  function renderOfferHistoryOptions() {
    if (!finderOfferHistory) return;
    const offers = loadOffers();
    const current = finderOfferHistory.value;
    finderOfferHistory.innerHTML =
      `<option value="">-- Gespeichertes Angebot laden --</option>` +
      offers
        .map((o) => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.name)}</option>`)
        .join("");
    if (offers.some((o) => o.id === current)) finderOfferHistory.value = current;
  }
  renderOfferHistoryOptions();

  if (finderOfferHistory) {
    finderOfferHistory.addEventListener("change", () => {
      const offers = loadOffers();
      const selected = offers.find((o) => o.id === finderOfferHistory.value);
      if (!selected) return;
      if (finderOfferText) finderOfferText.value = selected.offerText || "";
      if (finderOfferWebsite) finderOfferWebsite.value = selected.website || "";
    });
  }

  if (btnExtractOffer) {
    btnExtractOffer.addEventListener("click", async () => {
      const website = (finderOfferWebsite.value || "").trim();
      if (!website) {
        alert("Bitte zuerst eine Website-URL eintragen.");
        return;
      }
      if (!apiKeyConfigured) {
        alert("Zum automatischen Auslesen wird ein hinterlegter Gemini API-Key benötigt. Du kannst das Angebot auch direkt manuell in das Textfeld darunter eintragen.");
        return;
      }
      const urlWithScheme = /^https?:\/\//i.test(website) ? website : `https://${website}`;

      if (finderOfferExtractLoading) finderOfferExtractLoading.style.display = "flex";
      if (finderOfferHint) finderOfferHint.style.display = "none";
      btnExtractOffer.disabled = true;
      try {
        const scrapedText = await apiScrape(urlWithScheme);
        if (!scrapedText) {
          alert("Die Website konnte nicht ausgelesen werden. Bitte trage das Angebot stattdessen manuell ein.");
          return;
        }
        const selectedModel = modelSelect ? modelSelect.value : "";
        const offerPrompt = buildOfferExtractionPrompt(scrapedText, urlWithScheme);
        const summary = await apiGenerate(offerPrompt, selectedModel);
        if (finderOfferText) finderOfferText.value = summary.trim();

        // "Anhand der Auslese der Website sollte gleich eine Liste erstellt
        // werden": once we have the offer, immediately continue into the
        // full customer-match search - no second click needed - as long as
        // a search region is already filled in (can't meaningfully search
        // "everywhere"). If it's empty, just point the user at that field
        // instead of guessing a region or throwing a blocking alert.
        if (finderRegionMain && finderRegionMain.value.trim()) {
          await runOfferMatchSearch(finderOfferText.value.trim());
        } else if (finderOfferHint) {
          finderOfferHint.style.display = "block";
        }
      } catch (err) {
        console.error("Angebot auslesen fehlgeschlagen:", err);
        alert("Angebot konnte nicht automatisch ausgelesen werden: " + (err.message || err) + "\n\nDu kannst es stattdessen manuell in das Textfeld eintragen.");
      } finally {
        if (finderOfferExtractLoading) finderOfferExtractLoading.style.display = "none";
        btnExtractOffer.disabled = false;
      }
    });
  }

  /** Runs the combined "match customers to this offer" search: 50-100
   * leads plus a short market analysis, generated together in one call so
   * they stay consistent, then sorted nearest-first from the user's
   * browser location (same distance logic as the manual Lead-Scout run).
   * Triggered automatically right after a successful "Angebot auslesen",
   * but written as its own function so it degrades gracefully (falls back
   * to local mock leads, no analysis text) if no API key is configured. */
  async function runOfferMatchSearch(offerText) {
    const region = finderRegionMain.value.trim();
    const industry = finderIndustryMain.value.trim();
    if (!offerText || !region) return;

    if (finderDistanceStatus) finderDistanceStatus.textContent = "";
    if (finderAnalysisMain) finderAnalysisMain.style.display = "none";
    // This flow exists specifically to sort customers by distance from the
    // user, so switch that on for this run - the user can still uncheck it
    // afterwards for a plain manual re-run.
    if (finderSortDistance) finderSortDistance.checked = true;

    if (!apiKeyConfigured) {
      try {
        const mockLeads = generateLocalMockLeads(offerText, region, industry);
        await applyDistanceSortingIfEnabled(mockLeads, region);
        renderFinderResultsMain(mockLeads);
      } catch (simErr) {
        console.error("Simulation generation or render failed:", simErr);
        alert("Fehler bei der Lead-Simulation: " + simErr.message);
      }
      return;
    }

    if (finderLoadingMain) finderLoadingMain.style.display = "flex";
    const finderLoadingMainText = document.getElementById("finder-loading-main-text");
    if (finderLoadingMainText) {
      finderLoadingMainText.textContent =
        "Erstelle 50-100 passende Leads inkl. Analyse - das kann je nach Region bis zu einigen Minuten dauern...";
    }
    if (btnRunFinderMain) btnRunFinderMain.disabled = true;
    if (finderResultsMain) finderResultsMain.style.display = "none";

    try {
      const selectedModel = modelSelect ? modelSelect.value : "";
      const matchPrompt = buildOfferMatchPrompt(offerText, region, industry);
      let rawText = await apiGenerate(matchPrompt, selectedModel);
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

      const parsed = JSON.parse(rawText);
      const leads = Array.isArray(parsed) ? parsed : parsed.leads || [];
      const analyse = Array.isArray(parsed) ? "" : parsed.analyse || "";

      await applyDistanceSortingIfEnabled(leads, region);
      renderFinderResultsMain(leads);

      if (analyse && finderAnalysisMain) {
        finderAnalysisMain.innerHTML =
          `<strong style="color: var(--accent-cyan);">Analyse:</strong> ${escapeHtml(analyse)}`;
        finderAnalysisMain.style.display = "block";
      }
    } catch (err) {
      console.error("Angebot-Matching fehlgeschlagen:", err);
      const mockLeads = generateLocalMockLeads(offerText, region, industry);
      await applyDistanceSortingIfEnabled(mockLeads, region);
      renderFinderResultsMain(mockLeads);
      alert(`Hinweis: Da die Live-Recherche fehlgeschlagen ist, wurden simulierte B2B-Abnehmer geladen:\n\n${err.message || err}`);
    } finally {
      if (finderLoadingMain) finderLoadingMain.style.display = "none";
      if (btnRunFinderMain) btnRunFinderMain.disabled = false;
    }
  }

  if (btnSaveOffer) {
    btnSaveOffer.addEventListener("click", () => {
      const offerText = (finderOfferText.value || "").trim();
      if (!offerText) {
        alert("Bitte zuerst ein Angebot auslesen oder eintragen, bevor du es speicherst.");
        return;
      }
      const name = prompt("Name für dieses Angebot (z. B. Firmenname oder Produktlinie):", finderOfferWebsite.value || "");
      if (!name || !name.trim()) return;

      const offers = loadOffers();
      offers.unshift({
        id: `offer_${Date.now()}`,
        name: name.trim(),
        website: (finderOfferWebsite.value || "").trim(),
        offerText,
        savedAt: new Date().toISOString(),
      });
      saveOffers(offers);
      renderOfferHistoryOptions();
    });
  }

  // --- Entfernung: Browser-Standort + Geocoding + Haversine ---

  function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371; // Erdradius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getBrowserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Dein Browser unterstützt keine Standortabfrage."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(new Error(err.message || "Standortzugriff wurde abgelehnt.")),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    });
  }

  /** Enriches leads with distanceKm (when possible) and sorts them nearest-
   * first. Geocodes each *unique* lead location once (many leads share the
   * same searched city/region) to stay well under Nominatim's rate limit,
   * and fails open per-lead: a lead whose location can't be geocoded just
   * keeps distanceKm undefined and sorts to the end, instead of breaking
   * the whole search. */
  async function applyDistanceSortingIfEnabled(leads, fallbackRegion) {
    if (!finderSortDistance || !finderSortDistance.checked || !Array.isArray(leads) || leads.length === 0) {
      return leads;
    }
    if (finderDistanceStatus) finderDistanceStatus.textContent = "Standort wird abgefragt...";

    let userLoc;
    try {
      userLoc = await getBrowserLocation();
    } catch (err) {
      console.error("Standortabfrage fehlgeschlagen:", err);
      if (finderDistanceStatus) {
        finderDistanceStatus.textContent = "Standort nicht verfügbar - Sortierung übersprungen (" + err.message + ")";
      }
      return leads;
    }

    if (finderDistanceStatus) finderDistanceStatus.textContent = "Entfernungen werden berechnet...";

    const geocodeCache = new Map();
    for (const lead of leads) {
      const place = (lead.location || fallbackRegion || "").trim();
      if (!place) continue;
      const key = place.toLowerCase();
      if (!geocodeCache.has(key)) {
        // Sequential (not Promise.all) to stay a polite, low-concurrency
        // client against Nominatim's shared free API.
        geocodeCache.set(key, await apiGeocode(place));
      }
      const coords = geocodeCache.get(key);
      if (coords && typeof coords.lat === "number" && typeof coords.lon === "number") {
        lead.distanceKm = haversineKm(userLoc.lat, userLoc.lon, coords.lat, coords.lon);
      }
    }

    leads.sort((a, b) => {
      const da = typeof a.distanceKm === "number" ? a.distanceKm : Infinity;
      const db = typeof b.distanceKm === "number" ? b.distanceKm : Infinity;
      return da - db;
    });

    if (finderDistanceStatus) {
      const known = leads.filter((l) => typeof l.distanceKm === "number").length;
      finderDistanceStatus.textContent = `Nach Entfernung sortiert (${known}/${leads.length} Standorte gefunden).`;
    }
    return leads;
  }

  // Call Gemini (via backend) to search for Leads in main view
  if (btnRunFinderMain) {
    btnRunFinderMain.addEventListener("click", async () => {
      const offerText = finderOfferText ? finderOfferText.value.trim() : "";
      const product = offerText || finderProductMain.value.trim();
      const region = finderRegionMain.value.trim();
      const industry = finderIndustryMain.value.trim();

      if (finderDistanceStatus) finderDistanceStatus.textContent = "";
      if (finderAnalysisMain) finderAnalysisMain.style.display = "none";

      if (!apiKeyConfigured) {
        // Instantly run local simulation without confirm prompts
        try {
          const mockLeads = generateLocalMockLeads(product, region, industry);
          await applyDistanceSortingIfEnabled(mockLeads, region);
          renderFinderResultsMain(mockLeads);
        } catch (simErr) {
          console.error("Simulation generation or render failed:", simErr);
          alert("Fehler bei der Lead-Simulation: " + simErr.message);
        }
        return;
      }
      if (!product || !region) {
        alert("Bitte fülle mindestens 'Produkt / Lösung' (oder ein Angebot oben) und 'Region / Stadt' aus.");
        return;
      }

      // Show loading indicator
      if (finderLoadingMain) finderLoadingMain.style.display = "flex";
      const finderLoadingMainText2 = document.getElementById("finder-loading-main-text");
      if (finderLoadingMainText2) {
        finderLoadingMainText2.textContent =
          "Erstelle 50-100 passende Leads inkl. Analyse - das kann je nach Region bis zu einigen Minuten dauern...";
      }
      btnRunFinderMain.disabled = true;
      if (finderResultsMain) finderResultsMain.style.display = "none";

      try {
        const selectedModel = modelSelect ? modelSelect.value : "gemini-2.5-flash";
        const leadFinderPrompt = buildLeadFinderPrompt(product, region, industry, 50);
        let rawText = await apiGenerate(leadFinderPrompt, selectedModel);

        // Clean Markdown markers if present
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

        const parsedLeads = JSON.parse(rawText);
        await applyDistanceSortingIfEnabled(parsedLeads, region);
        renderFinderResultsMain(parsedLeads);
      } catch (err) {
        console.error("Lead Finder main failed:", err);
        const mockLeads = generateLocalMockLeads(product, region, industry);
        await applyDistanceSortingIfEnabled(mockLeads, region);
        renderFinderResultsMain(mockLeads);
        alert(`Hinweis: Da die Live-Recherche fehlgeschlagen ist, wurden simulierte B2B-Abnehmer geladen:\n\n${err.message || err}`);
      } finally {
        if (finderLoadingMain) finderLoadingMain.style.display = "none";
        btnRunFinderMain.disabled = false;
      }
    });
  }

  // Render scouted Leads in main view
  function renderFinderResultsMain(leads) {
    if (!finderResultsListMain || !finderResultsMain) {
      console.error("Missing DOM elements in renderFinderResultsMain");
      return;
    }
    if (!leads || leads.length === 0) {
      finderResultsListMain.innerHTML = `<p style="color: var(--text-dim); font-size: 0.75rem; text-align: center; font-style: italic;">Keine Leads gefunden.</p>`;
      finderResultsMain.style.display = "block";
      return;
    }

    try {
      finderResultsListMain.innerHTML = leads.map((lead, index) => {
        const cleanLeadStr = escapeHtml(JSON.stringify(lead));
        const potenzial = lead.potenzial || "Mittel";
        return `
          <div style="background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); border-radius: 6px; padding: 1rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
            <div style="flex: 1; text-align: left;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
                <h6 style="font-size: 0.9rem; color: var(--accent-cyan); font-weight: 600; margin: 0;">${escapeHtml(lead.company)}</h6>
                <span style="display: inline-block; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.65rem; font-weight: 600; ${potenzialBadgeStyle(potenzial)}">Potenzial: ${escapeHtml(potenzial)}</span>
                ${
                  typeof lead.distanceKm === "number"
                    ? `<span style="display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.65rem; font-weight: 600; background: rgba(255,255,255,0.06); color: var(--text-muted);"><i data-lucide="map-pin" style="width: 10px; height: 10px;"></i> ${lead.distanceKm < 10 ? lead.distanceKm.toFixed(1) : Math.round(lead.distanceKm)} km entfernt</span>`
                    : ""
                }
              </div>
              <p style="font-size: 0.8rem; color: var(--text-main); margin-bottom: 0.35rem; margin-top: 0;">
                <strong>Kontakt:</strong> ${escapeHtml(lead.contact) || "-"} | <strong>E-Mail:</strong> ${escapeHtml(lead.email) || "-"} | <strong>Tel:</strong> ${escapeHtml(lead.phone) || "-"}
              </p>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem; margin-top: 0;">
                <strong>Website:</strong> ${renderSafeLink(lead.website)} ${lead.location ? `| <strong>Ort:</strong> ${escapeHtml(lead.location)}` : ""}
              </p>
              ${
                lead.passendes_angebot
                  ? `<p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; margin: 0 0 0.35rem 0;"><strong style="color: var(--accent-cyan);">Passendes Angebot:</strong> ${escapeHtml(lead.passendes_angebot)}</p>`
                  : ""
              }
              <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; margin: 0;">
                <strong>Hintergrund:</strong> ${escapeHtml(lead.notes) || "-"}
              </p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; min-width: 90px;">
              <button onclick="window.addFinderClientToDirectory('${index}', '${cleanLeadStr}')" id="btn-finder-dir-${index}" class="btn btn-outline" style="padding: 0.35rem 0.6rem; font-size: 0.75rem; width: 100%; gap: 0.2rem; display: inline-flex; align-items: center; justify-content: center;" title="Kunden in die globale Kartei aufnehmen">
                <i data-lucide="folder-plus" style="width: 13px; height: 13px;"></i> + Kartei
              </button>
              <button onclick="window.addFinderClientToCampaignLeads('${index}', '${cleanLeadStr}')" id="btn-finder-lead-${index}" class="btn btn-outline" style="padding: 0.35rem 0.6rem; font-size: 0.75rem; width: 100%; gap: 0.2rem; border-color: var(--accent-cyan); color: var(--accent-cyan); display: inline-flex; align-items: center; justify-content: center;" title="Als Lead für aktuelle Kampagne anlegen">
                <i data-lucide="user-plus" style="width: 13px; height: 13px;"></i> + Lead
              </button>
            </div>
          </div>
        `;
      }).join("");

      finderResultsMain.style.display = "block";
      lucide.createIcons();
    } catch (renderErr) {
      console.error("renderFinderResultsMain error during map/join:", renderErr);
      alert("Render-Fehler: " + renderErr.message);
    }
  }

  // --- ADMIN SETTINGS & WHITELABEL EVENT LISTENERS ---

  if (btnHeaderSettings) {
    btnHeaderSettings.addEventListener("click", async () => {
      if (settingsCard && settingsCard.style.display === "flex") {
        settingsCard.style.display = "none";
        if (currentCampaignData) {
          if (reportContainer) reportContainer.style.display = "flex";
        } else {
          if (welcomeCard) welcomeCard.style.display = "flex";
        }
      } else {
        const savedHash = localStorage.getItem("sales_admin_pass_hash") || "";
        if (savedHash !== "") {
          const check = prompt("Admin-Passwort eingeben:");
          if (check === null) return; // user cancelled
          const checkHash = await sha256Hex(check);
          if (checkHash !== savedHash) {
            alert("Falsches Passwort! Zugriff verweigert.");
            return;
          }
        }

        if (welcomeCard) welcomeCard.style.display = "none";
        if (reportContainer) reportContainer.style.display = "none";
        if (leadFinderCardMain) leadFinderCardMain.style.display = "none";
        if (landingpageCard) landingpageCard.style.display = "none";
      if (aiToolsCard) aiToolsCard.style.display = "none";
        if (errorCard) errorCard.style.display = "none";

        if (settingsCard) {
          settingsCard.style.display = "flex";
          applyAppBranding();
        }
      }
    });
  }

  if (btnBackFromSettings) {
    btnBackFromSettings.addEventListener("click", () => {
      if (settingsCard) settingsCard.style.display = "none";

      // Restore previous view
      if (currentCampaignData) {
        if (reportContainer) reportContainer.style.display = "flex";
      } else {
        if (welcomeCard) welcomeCard.style.display = "flex";
      }
    });
  }

  if (settingAppColor) {
    settingAppColor.addEventListener("input", () => {
      if (colorHexLabel) colorHexLabel.innerText = settingAppColor.value;
    });
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener("click", async () => {
      const name = settingAppName.value.trim() || "OrbitAI Sales";
      const color = settingAppColor.value || "#00f2fe";
      const hide = settingHideKey.checked;
      const pass = settingAdminPass.value.trim();

      localStorage.setItem("sales_app_name", name);
      localStorage.setItem("sales_app_color", color);
      localStorage.setItem("sales_hide_key", hide ? "true" : "false");

      // Only touch the PIN if the user actually typed a new one. The field is
      // always left blank (see applyAppBranding) since we can't show a hash
      // back as a readable password, so "blank" means "leave it unchanged".
      if (pass !== "") {
        localStorage.setItem("sales_admin_pass_hash", await sha256Hex(pass));
      }

      syncSettingsToCloud();
      applyAppBranding();
      alert("Einstellungen erfolgreich gespeichert und angewendet!");

      // Go back
      btnBackFromSettings.click();
    });
  }

  if (btnResetSettings) {
    btnResetSettings.addEventListener("click", () => {
      if (!confirm("Möchtest du das gesamte Branding auf Werkseinstellungen zurücksetzen?")) return;

      localStorage.removeItem("sales_app_name");
      localStorage.removeItem("sales_app_color");
      localStorage.removeItem("sales_hide_key");
      localStorage.removeItem("sales_admin_pass_hash");
      syncSettingsToCloud();

      applyAppBranding();
      if (settingAdminPass) settingAdminPass.value = "";
      alert("Branding auf Werkseinstellungen zurückgesetzt!");

      // Go back
      btnBackFromSettings.click();
    });
  }

  // --- DATA BACKUP (EXPORT / IMPORT) ---
  // All app data (campaigns, client directory, leads, branding) lives only in
  // this browser's localStorage under "sales_*" keys - there is no server-side
  // database. Clearing site data, switching browsers, or moving to a new
  // machine loses everything unless it's exported here first.

  const BACKUP_KEY_PREFIX = "sales_";

  function collectBackupData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
        data[key] = localStorage.getItem(key);
      }
    }
    return data;
  }

  if (btnExportBackup) {
    btnExportBackup.addEventListener("click", () => {
      const backup = {
        app: "OrbitAI Sales Strategist",
        version: 1,
        exportedAt: new Date().toISOString(),
        data: collectBackupData(),
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `orbitai-sales-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  if (btnImportBackup && backupFileInput) {
    btnImportBackup.addEventListener("click", () => backupFileInput.click());

    backupFileInput.addEventListener("change", () => {
      const file = backupFileInput.files && backupFileInput.files[0];
      if (!file) return;

      if (file.size > 20 * 1024 * 1024) {
        alert("Diese Datei ist zu groß, um ein gültiges Backup zu sein.");
        backupFileInput.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        backupFileInput.value = ""; // allow re-selecting the same file later
        let parsed;
        try {
          parsed = JSON.parse(String(reader.result));
        } catch (err) {
          alert("Diese Datei ist kein gültiges Backup (kein lesbares JSON).");
          return;
        }

        const importedData = parsed && typeof parsed.data === "object" ? parsed.data : null;
        if (!importedData) {
          alert("Diese Datei sieht nicht wie ein OrbitAI-Sales-Backup aus.");
          return;
        }

        const keysToImport = Object.keys(importedData).filter(
          (key) => key.startsWith(BACKUP_KEY_PREFIX) && typeof importedData[key] === "string"
        );
        if (keysToImport.length === 0) {
          alert("In dieser Datei wurden keine importierbaren Daten gefunden.");
          return;
        }

        const confirmed = confirm(
          `Backup importieren?\n\nDas überschreibt alle aktuell gespeicherten Kampagnen, Kunden, Leads und Branding-Einstellungen in diesem Browser mit dem Stand vom ${parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString("de-DE") : "unbekannten Zeitpunkt"}. Diese Aktion kann nicht rückgängig gemacht werden.`
        );
        if (!confirmed) return;

        keysToImport.forEach((key) => localStorage.setItem(key, importedData[key]));
        alert("Backup erfolgreich importiert. Die Seite wird jetzt neu geladen.");
        location.reload();
      };
      reader.onerror = () => alert("Datei konnte nicht gelesen werden.");
      reader.readAsText(file);
    });
  }

  // --- CRM CSV LEADS EXPORT FUNCTION ---

  window.exportLeadsToCSV = function() {
    if (!activeLeads || activeLeads.length === 0) {
      alert("Es sind keine Leads vorhanden, die exportiert werden können. Erstelle oder scoute zuerst Leads für diese Kampagne.");
      return;
    }

    let csvContent = "﻿"; // UTF-8 BOM for Excel compatibility
    csvContent += "Firma;Ansprechpartner;E-Mail;Telefon;Potenzial;Branche;Website;Notizen\n";

    activeLeads.forEach(lead => {
      const row = [
        `"${(lead.company || "").replace(/"/g, '""')}"`,
        `"${(lead.contact || "").replace(/"/g, '""')}"`,
        `"${(lead.email || "").replace(/"/g, '""')}"`,
        `"${(lead.phone || "").replace(/"/g, '""')}"`,
        `"${(lead.potenzial || "Mittel").replace(/"/g, '""')}"`,
        `"${(lead.industry || "").replace(/"/g, '""')}"`,
        `"${(lead.website || "").replace(/"/g, '""')}"`,
        `"${(lead.notes || "").replace(/"/g, '""')}"`
      ].join(";"); // Semicolon separator for European Excel config
      csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const encodedUri = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `B2B_Leads_${currentCampaignKey || "Export"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- KI CHAT ASSISTANT & SPEECH RECOGNITION CORE ---

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isRecording = false;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "de-DE";
    recognition.interimResults = false;

    recognition.onstart = () => {
      isRecording = true;
      if (btnChatMic) {
        btnChatMic.classList.add("recording");
        btnChatMic.innerHTML = `<i data-lucide="mic-off" style="width: 18px; height: 18px;"></i>`;
        lucide.createIcons();
      }
      if (chatInput) chatInput.placeholder = "Ich höre zu... Diktieren beenden durch erneuten Klick.";
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (chatInput) {
        chatInput.value += (chatInput.value ? " " : "") + transcript;
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech Recognition Error:", event.error);
    };

    recognition.onend = () => {
      isRecording = false;
      if (btnChatMic) {
        btnChatMic.classList.remove("recording");
        btnChatMic.innerHTML = `<i data-lucide="mic" style="width: 18px; height: 18px;"></i>`;
        lucide.createIcons();
      }
      if (chatInput) chatInput.placeholder = "Frage die KI oder diktiere Anpassungen (z.B. 'Übersetze E-Mail 1 ins Englische')...";
    };
  }

  if (btnChatMic) {
    btnChatMic.addEventListener("click", () => {
      if (!recognition) {
        alert("Diktierfunktion (Speech-to-Text) wird von deinem Browser leider nicht unterstützt. Bitte nutze Chrome, Safari oder Edge.");
        return;
      }
      if (isRecording) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  }

  // --- SYSTEM COPILOT COMMAND EXECUTOR ---

  function executeSystemCommand(commandName, args) {
    console.log("Executing system command from AI chat:", commandName, args);

    switch (commandName.toLowerCase()) {
      case "analyze":
        if (args.length >= 2) {
          const industry = args[0];
          const product = args[1];

          if (industryInput && productInput) {
            if (settingsCard) settingsCard.style.display = "none";
            if (leadFinderCardMain) leadFinderCardMain.style.display = "none";

            industryInput.value = industry;
            productInput.value = product;

            appendChatMessage("System", `Starte automatische B2B-Bedarfsanalyse für das Produkt **"${product}"** in der Branche **"${industry}"**...`, false);

            setTimeout(() => {
              generateForm.dispatchEvent(new Event("submit"));
            }, 1000);
          }
        }
        break;

      case "scout":
        if (args.length >= 2) {
          const product = args[0];
          const region = args[1];
          const industry = args[2] || "";

          openMainLeadScout();

          if (finderProductMain && finderRegionMain) {
            finderProductMain.value = product;
            finderRegionMain.value = region;
            if (finderIndustryMain) finderIndustryMain.value = industry;

            appendChatMessage("System", `Starte B2B-Leadscouting für **"${product}"** in **"${region}"**...`, false);

            setTimeout(() => {
              btnRunFinderMain.click();
            }, 1000);
          }
        }
        break;

      case "load_demo":
        if (args.length >= 1) {
          const demoName = args[0].toLowerCase();
          let targetId = "";
          if (demoName.includes("predictive") || demoName.includes("manufacturing") || demoName.includes("fertigung")) {
            targetId = "demo-manufacturing";
          } else if (demoName.includes("logistics") || demoName.includes("logistik")) {
            targetId = "demo-logistics";
          } else if (demoName.includes("recruiting") || demoName.includes("hr")) {
            targetId = "demo-recruiting";
          }

          if (targetId) {
            const el = document.getElementById(targetId);
            if (el) {
              appendChatMessage("System", `Lade Demo-Kampagne **"${el.querySelector(".demo-title")?.innerText || demoName}"**...`, false);
              setTimeout(() => {
                el.click();
              }, 1000);
            }
          }
        }
        break;

      case "switch_tab":
        if (args.length >= 1) {
          const tabName = args[0].toLowerCase();
          let targetBtnId = "";

          if (tabName.includes("schmerz") || tabName.includes("pain") || tabName.includes("module1") || tabName.includes("1")) {
            targetBtnId = "tab-module1";
          } else if (tabName.includes("fit") || tabName.includes("eignung") || tabName.includes("module_fit") || tabName.includes("2")) {
            targetBtnId = "tab-module-fit";
          } else if (tabName.includes("roi") || tabName.includes("validierung") || tabName.includes("wert") || tabName.includes("module2") || tabName.includes("3")) {
            targetBtnId = "tab-module2";
          } else if (tabName.includes("market") || tabName.includes("go-to-market") || tabName.includes("module3") || tabName.includes("4")) {
            targetBtnId = "tab-module3";
          } else if (tabName.includes("playbook") || tabName.includes("email") || tabName.includes("mail") || tabName.includes("timeline") || tabName.includes("tools") || tabName.includes("module4") || tabName.includes("5")) {
            targetBtnId = "tab-module4";
          } else if (tabName.includes("crm") || tabName.includes("lead") || tabName.includes("kunden") || tabName.includes("6")) {
            targetBtnId = "tab-crm";
          }

          if (targetBtnId) {
            const btn = document.getElementById(targetBtnId);
            if (btn) {
              appendChatMessage("System", `Wechsle zum Tab **"${btn.innerText.trim()}"**...`, false);
              setTimeout(() => {
                btn.click();
              }, 800);
            }
          }
        }
        break;

      case "export_leads":
        appendChatMessage("System", `Starte Export der B2B-Leads als Excel-CSV...`, false);
        setTimeout(() => {
          window.exportLeadsToCSV();
        }, 1000);
        break;

      case "open_setup":
        appendChatMessage("System", `Öffne das Whitelabel- & Admin-Setup...`, false);
        setTimeout(() => {
          if (btnHeaderSettings) btnHeaderSettings.click();
        }, 800);
        break;

      case "open_landingpage":
        appendChatMessage("System", `Öffne den KI-Landingpage-Generator...`, false);
        setTimeout(() => {
          if (btnHeaderLandingpageGen) btnHeaderLandingpageGen.click();
        }, 800);
        break;

      case "generate_landingpage":
        if (args.length >= 1) {
          const product = args[0];
          const industry = args[1] || "";
          const requirements = args[2] || "";

          if (landingpageCard && landingpageCard.style.display !== "flex") {
            if (btnHeaderLandingpageGen) btnHeaderLandingpageGen.click();
          }

          if (landingpageProductInput) landingpageProductInput.value = product;
          if (landingpageIndustryInput && industry) landingpageIndustryInput.value = industry;
          if (landingpagePromptInput && requirements) landingpagePromptInput.value = requirements;

          appendChatMessage("System", `Generiere Landingpage für **"${product}"**...`, false);

          setTimeout(() => {
            if (btnGenerateLandingpage) btnGenerateLandingpage.click();
          }, 1000);
        }
        break;

      default:
        console.warn("Unknown system command:", commandName);
    }
  }

  function checkAndExecuteSystemCommand(text) {
    const commandMatch = text.match(/\[SYSTEM_COMMAND:\s*([a-zA-Z0-9_]+)\((.*)\)\]/);
    if (commandMatch) {
      const commandName = commandMatch[1];
      const argsStr = commandMatch[2];

      let args = [];
      if (argsStr.trim() !== "") {
        const matches = argsStr.match(/(".*?"|'.*?'|[^,\s]+)(?=\s*,|\s*$)/g) || [argsStr];
        args = matches.map(arg => arg.trim().replace(/^["']|["']$/g, ""));
      }

      executeSystemCommand(commandName, args);
      return text.replace(/\[SYSTEM_COMMAND:.*\]/g, "").trim();
    }
    return text;
  }

  /**
   * Appends a chat message. Both the sender label and the message body are
   * escaped (inlineMarkdown escapes internally, then applies bold/italic),
   * so neither user input, dictated speech, nor AI output can inject HTML.
   */
  function appendChatMessage(sender, text, isUser = false) {
    if (!chatMessagesBox) return;
    const msgDiv = document.createElement("div");
    msgDiv.style.borderRadius = "4px";
    msgDiv.style.padding = "0.5rem 0.75rem";
    msgDiv.style.fontSize = "0.85rem";
    msgDiv.style.lineHeight = "1.4";
    msgDiv.style.maxWidth = "85%";
    msgDiv.style.wordBreak = "break-word";

    const safeBody = inlineMarkdown(text);

    if (isUser) {
      msgDiv.style.background = "rgba(0, 242, 254, 0.1)";
      msgDiv.style.borderLeft = "3px solid var(--accent-cyan)";
      msgDiv.style.alignSelf = "flex-end";
      msgDiv.style.color = "var(--text-main)";
      msgDiv.innerHTML = `<strong>Du:</strong> ${safeBody}`;
    } else {
      msgDiv.style.background = "rgba(255, 255, 255, 0.02)";
      msgDiv.style.borderLeft = "3px solid rgba(255, 255, 255, 0.15)";
      msgDiv.style.alignSelf = "flex-start";
      msgDiv.style.color = "var(--text-main)";
      msgDiv.innerHTML = `<strong>${escapeHtml(sender)}:</strong> ${safeBody}`;
    }

    chatMessagesBox.appendChild(msgDiv);
    chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
  }

  async function handleChatSubmit() {
    if (!chatInput) return;
    const userQuery = chatInput.value.trim();
    if (!userQuery) return;

    appendChatMessage("Du", userQuery, true);
    chatInput.value = "";

    const typingIndicator = document.createElement("div");
    typingIndicator.id = "chat-typing-indicator";
    typingIndicator.style.background = "rgba(255, 255, 255, 0.01)";
    typingIndicator.style.borderLeft = "3px solid var(--accent-cyan)";
    typingIndicator.style.borderRadius = "4px";
    typingIndicator.style.padding = "0.5rem 0.75rem";
    typingIndicator.style.fontSize = "0.85rem";
    typingIndicator.style.alignSelf = "flex-start";
    typingIndicator.style.color = "var(--text-dim)";
    typingIndicator.style.fontStyle = "italic";
    typingIndicator.innerText = "OrbitAI schreibt eine Antwort...";
    if (chatMessagesBox) {
      chatMessagesBox.appendChild(typingIndicator);
      chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
    }

    const industry = industryInput.value.trim();
    const product = productInput.value.trim();

    if (!apiKeyConfigured) {
      setTimeout(() => {
        if (typingIndicator) typingIndicator.remove();

        let cleanReply = "";
        const queryLower = userQuery.toLowerCase();

        if (queryLower.includes("analysier") || queryLower.includes("analyse")) {
          const match = userQuery.match(/(?:analysiere|analyse)\s+([^für]+)\s+für\s+(.+)/i);
          const ind = match ? match[1].trim() : "Logistik";
          const prod = match ? match[2].trim() : "Paket-Scanner";
          cleanReply = `Alles klar! Ich starte die lokale B2B-Bedarfsanalyse für das Produkt **"${prod}"** in der Branche **"${ind}"**.\n\n[SYSTEM_COMMAND: analyze("${ind}", "${prod}")]`;
        } else if (queryLower.includes("scout") || queryLower.includes("suche") || queryLower.includes("lead")) {
          const match = userQuery.match(/(?:scoute|suche|finde)\s+([^in]+)\s+in\s+(.+)/i);
          const prod = match ? match[1].trim() : "Kaffeemaschinen";
          const reg = match ? match[2].trim() : "München";
          cleanReply = `Verstanden! Ich starte das simulierte B2B-Leadscouting für **"${prod}"** in **"${reg}"**.\n\n[SYSTEM_COMMAND: scout("${prod}", "${reg}", "B2B")]`;
        } else if (queryLower.includes("demo") || queryLower.includes("vorlage")) {
          let demoKey = "predictive";
          if (queryLower.includes("logistik") || queryLower.includes("logistics")) {
            demoKey = "logistics";
          } else if (queryLower.includes("recruiting") || queryLower.includes("hr")) {
            demoKey = "recruiting";
          }
          cleanReply = `Lade die Demo-Kampagne offline.\n\n[SYSTEM_COMMAND: load_demo("${demoKey}")]`;
        } else if (queryLower.includes("wechsle") || queryLower.includes("reiter") || queryLower.includes("tab") || queryLower.includes("öffne")) {
          let target = "module1";
          if (queryLower.includes("roi") || queryLower.includes("rechner") || queryLower.includes("wert")) {
            target = "module2";
          } else if (queryLower.includes("crm") || queryLower.includes("lead")) {
            target = "crm";
          } else if (queryLower.includes("playbook") || queryLower.includes("mail")) {
            target = "module4";
          } else if (queryLower.includes("go-to-market") || queryLower.includes("market")) {
            target = "module3";
          } else if (queryLower.includes("fit") || queryLower.includes("eignung")) {
            target = "module_fit";
          } else if (queryLower.includes("setup") || queryLower.includes("einstellung")) {
            target = "setup";
          }

          if (target === "setup") {
            cleanReply = `Öffne das Whitelabel- & Admin-Setup.\n\n[SYSTEM_COMMAND: open_setup()]`;
          } else {
            cleanReply = `Schalte um auf den gewünschten Tab.\n\n[SYSTEM_COMMAND: switch_tab("${target}")]`;
          }
        } else if (queryLower.includes("export")) {
          cleanReply = `Starte Leads-Export für Excel...\n\n[SYSTEM_COMMAND: export_leads()]`;
        } else if (queryLower.includes("landingpage") || queryLower.includes("landing-page") || queryLower.includes("landing page") || queryLower.includes("website erstellen") || (queryLower.includes("generator") && (queryLower.includes("seite") || queryLower.includes("web")))) {
          const match = userQuery.match(/(?:landingpage|landing-page|landing page|website)\s+für\s+(.+)/i);
          const prod = match ? match[1].trim() : (product || "unser Produkt");
          cleanReply = `Alles klar! Ich öffne den KI-Landingpage-Generator und entwerfe eine Seite für **"${prod}"**.\n\n[SYSTEM_COMMAND: generate_landingpage("${prod}", "${industry || ""}", "")]`;
        } else {
          cleanReply = `Als dein B2B-Sales-Copilot empfehle ich für allgemeine Anfragen:\n\n1. **Fokus auf Mehrwert:** Kommuniziere nie Features, sondern immer den finanziellen oder prozessualen ROI.\n2. **Qualifizierung:** Finde heraus, ob das Budget, die Autorität, der Bedarf und die Timeline (BANT) passen.\n3. **Nachfassen:** 80% aller B2B-Abschlüsse benötigen mindestens 5 Nachfass-Kontakte.\n\n*Tipp: Du kannst mich per Sprache steuern! Sag einfach 'Analysiere [Branche] für [Produkt]' oder 'Wechsle zum CRM'.*`;
        }

        const finalReply = checkAndExecuteSystemCommand(cleanReply);
        appendChatMessage("OrbitAI (Simulation)", finalReply, false);
      }, 1000);
      return;
    }

    try {
      const selectedModel = modelSelect ? modelSelect.value : "gemini-2.5-flash";
      const chatPrompt = buildChatPrompt(industry, product, currentCampaignData, userQuery);
      const aiText = await apiGenerate(chatPrompt, selectedModel);

      if (typingIndicator) typingIndicator.remove();

      const cleanReply = checkAndExecuteSystemCommand(aiText);
      appendChatMessage("OrbitAI", cleanReply, false);
    } catch (err) {
      console.error("Chat assistant failed:", err);
      if (typingIndicator) typingIndicator.remove();

      let cleanReply = `Live-Abfrage fehlgeschlagen (${err.message}). Hier ist ein simulierter Impuls zu deiner Frage:\n\nUm "${userQuery}" optimal im B2B-Vertrieb für das Produkt **${product || "Lösung"}** zu nutzen, empfehle ich, den Einwand-Katalog um diesen Punkt zu erweitern oder eine E-Mail mit speziellem Fokus darauf zu versenden.`;

      const queryLower = userQuery.toLowerCase();
      if (queryLower.includes("analysier") || queryLower.includes("scout") || queryLower.includes("demo") || queryLower.includes("wechsle") || queryLower.includes("tab") || queryLower.includes("export") || queryLower.includes("setup")) {
        if (queryLower.includes("analysier") || queryLower.includes("analyse")) {
          const match = userQuery.match(/(?:analysiere|analyse)\s+([^für]+)\s+für\s+(.+)/i);
          const ind = match ? match[1].trim() : "Logistik";
          const prod = match ? match[2].trim() : "Paket-Scanner";
          cleanReply = `Live-Verbindung gestört. Starte simulierte Analyse für **"${prod}"** in der Branche **"${ind}"**.\n\n[SYSTEM_COMMAND: analyze("${ind}", "${prod}")]`;
        } else if (queryLower.includes("scout") || queryLower.includes("suche") || queryLower.includes("lead")) {
          const match = userQuery.match(/(?:scoute|suche|finde)\s+([^in]+)\s+in\s+(.+)/i);
          const prod = match ? match[1].trim() : "Kaffeemaschinen";
          const reg = match ? match[2].trim() : "Salzburg";
          cleanReply = `Live-Verbindung gestört. Starte B2B-Leadscouting für **"${prod}"** in **"${reg}"**.\n\n[SYSTEM_COMMAND: scout("${prod}", "${reg}", "B2B")]`;
        } else if (queryLower.includes("demo") || queryLower.includes("vorlage")) {
          cleanReply = `Lade die Demo-Kampagne offline.\n\n[SYSTEM_COMMAND: load_demo("predictive")]`;
        } else if (queryLower.includes("wechsle") || queryLower.includes("reiter") || queryLower.includes("tab")) {
          cleanReply = `Schalte um auf den gewünschten Tab.\n\n[SYSTEM_COMMAND: switch_tab("crm")]`;
        }
      }

      const finalReply = checkAndExecuteSystemCommand(cleanReply);
      appendChatMessage("OrbitAI (Simulation Fallback)", finalReply, false);
    }
  }

  if (btnChatSend) {
    btnChatSend.addEventListener("click", handleChatSubmit);
  }

  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleChatSubmit();
      }
    });
  }

  // --- LANDINGPAGE GENERATOR CORE ORCHESTRATION ---

  if (btnHeaderLandingpageGen) {
    btnHeaderLandingpageGen.addEventListener("click", () => {
      if (landingpageCard && landingpageCard.style.display === "flex") {
        landingpageCard.style.display = "none";
        if (currentCampaignData) {
          if (reportContainer) reportContainer.style.display = "flex";
        } else {
          if (welcomeCard) welcomeCard.style.display = "flex";
        }
      } else {
        if (welcomeCard) welcomeCard.style.display = "none";
        if (reportContainer) reportContainer.style.display = "none";
        if (leadFinderCardMain) leadFinderCardMain.style.display = "none";
        if (settingsCard) settingsCard.style.display = "none";
        if (errorCard) errorCard.style.display = "none";

        if (landingpageCard) {
          landingpageCard.style.display = "flex";
          if (currentCampaignData) {
            if (landingpageIndustryInput) landingpageIndustryInput.value = currentCampaignData.industry || "";
            if (landingpageProductInput) landingpageProductInput.value = currentCampaignData.product || "";
          }
        }
      }
    });
  }

  if (btnBackFromLandingpage) {
    btnBackFromLandingpage.addEventListener("click", () => {
      if (landingpageCard) landingpageCard.style.display = "none";
      if (aiToolsCard) aiToolsCard.style.display = "none";
      if (currentCampaignData) {
        if (reportContainer) reportContainer.style.display = "flex";
      } else {
        if (welcomeCard) welcomeCard.style.display = "flex";
      }
    });
  }

  if (btnLandingpagePreviewTab) {
    btnLandingpagePreviewTab.addEventListener("click", () => {
      btnLandingpagePreviewTab.classList.add("active");
      btnLandingpageCodeTab.classList.remove("active");
      if (landingpagePreviewFrame) landingpagePreviewFrame.style.display = "block";
      if (landingpageCodeArea) landingpageCodeArea.style.display = "none";
    });
  }

  if (btnLandingpageCodeTab) {
    btnLandingpageCodeTab.addEventListener("click", () => {
      btnLandingpageCodeTab.classList.add("active");
      btnLandingpagePreviewTab.classList.remove("active");
      if (landingpagePreviewFrame) landingpagePreviewFrame.style.display = "none";
      if (landingpageCodeArea) landingpageCodeArea.style.display = "block";
    });
  }

  if (btnLandingpageCopyCode) {
    btnLandingpageCopyCode.addEventListener("click", () => {
      if (landingpageCodeArea && landingpageCodeArea.value) {
        navigator.clipboard.writeText(landingpageCodeArea.value)
          .then(() => alert("HTML-Quellcode erfolgreich in die Zwischenablage kopiert!"))
          .catch(err => alert("Kopieren fehlgeschlagen: " + err));
      } else {
        alert("Es ist noch kein Code generiert worden.");
      }
    });
  }

  if (btnLandingpageDownloadHtml) {
    btnLandingpageDownloadHtml.addEventListener("click", () => {
      if (landingpageCodeArea && landingpageCodeArea.value) {
        const blob = new Blob([landingpageCodeArea.value], { type: "text/html;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "index.html";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Es ist noch kein Code generiert worden.");
      }
    });
  }

  /**
   * Renders the generated landing page HTML into the preview iframe via
   * `srcdoc` (not document.write). The iframe's `sandbox="allow-scripts
   * allow-popups allow-forms"` attribute (set in index.html, no
   * allow-same-origin) gives it an opaque origin either way, so the AI- or
   * offline-generated page can't reach this app's DOM, localStorage or the
   * Gemini key - but srcdoc avoids the open()/write()/close() dance and its
   * edge cases across browsers.
   */
  function showLandingpageResult(html) {
    landingpageGeneratedHtml = html;
    if (landingpageCodeArea) landingpageCodeArea.value = html;
    if (landingpagePreviewFrame) landingpagePreviewFrame.srcdoc = html;
  }

  if (btnGenerateLandingpage) {
    btnGenerateLandingpage.addEventListener("click", async () => {
      const industry = landingpageIndustryInput.value.trim() || "B2B";
      const product = landingpageProductInput.value.trim() || "B2B-Lösung";
      const customRequirements = landingpagePromptInput.value.trim();

      if (landingpageLoading) landingpageLoading.style.display = "flex";
      if (landingpagePreviewFrame) landingpagePreviewFrame.style.display = "none";
      if (landingpageCodeArea) landingpageCodeArea.style.display = "none";
      btnGenerateLandingpage.disabled = true;

      try {
        let htmlCode;

        if (!apiKeyConfigured) {
          // Offline Simulation
          htmlCode = generateMockLandingpageHTML(product, industry, customRequirements);
        } else {
          // Live call through the backend proxy - the Gemini key never reaches the browser
          const selectedModel = modelSelect ? modelSelect.value : "gemini-2.5-flash";
          const promptText = buildLandingPagePrompt(industry, product, customRequirements);
          const rawResponse = await apiGenerate(promptText, selectedModel);
          htmlCode = extractHtmlFromResponse(rawResponse);
        }

        showLandingpageResult(htmlCode);
      } catch (err) {
        console.error("Landingpage Gen failed:", err);
        alert("Generierung fehlgeschlagen. Wir laden ein lokales Fallback-Template:\n\n" + err.message);
        const fallbackHtml = generateMockLandingpageHTML(product, industry, customRequirements);
        showLandingpageResult(fallbackHtml);
      } finally {
        if (landingpageLoading) landingpageLoading.style.display = "none";
        if (btnLandingpagePreviewTab && btnLandingpagePreviewTab.classList.contains("active")) {
          if (landingpagePreviewFrame) landingpagePreviewFrame.style.display = "block";
        } else {
          if (landingpageCodeArea) landingpageCodeArea.style.display = "block";
        }
        btnGenerateLandingpage.disabled = false;
      }
    });
  }

  // --- KI-WERKZEUGE CORE ORCHESTRATION ---

  if (btnHeaderAiTools) {
    btnHeaderAiTools.addEventListener("click", () => {
      if (aiToolsCard && aiToolsCard.style.display === "flex") {
        aiToolsCard.style.display = "none";
        if (currentCampaignData) {
          if (reportContainer) reportContainer.style.display = "flex";
        } else {
          if (welcomeCard) welcomeCard.style.display = "flex";
        }
      } else {
        if (welcomeCard) welcomeCard.style.display = "none";
        if (reportContainer) reportContainer.style.display = "none";
        if (leadFinderCardMain) leadFinderCardMain.style.display = "none";
        if (settingsCard) settingsCard.style.display = "none";
        if (errorCard) errorCard.style.display = "none";
        if (landingpageCard) landingpageCard.style.display = "none";

        if (aiToolsCard) aiToolsCard.style.display = "flex";
      }
    });
  }

  if (btnBackFromAiTools) {
    btnBackFromAiTools.addEventListener("click", () => {
      if (aiToolsCard) aiToolsCard.style.display = "none";
      if (currentCampaignData) {
        if (reportContainer) reportContainer.style.display = "flex";
      } else {
        if (welcomeCard) welcomeCard.style.display = "flex";
      }
    });
  }

  // Tool-Umschalter (nur eines der 5 Panels sichtbar)
  const aiToolNavButtons = [
    { btn: document.getElementById("btn-tool-reklamation"), panel: document.getElementById("tool-panel-reklamation") },
    { btn: document.getElementById("btn-tool-produktlisting"), panel: document.getElementById("tool-panel-produktlisting") },
    { btn: document.getElementById("btn-tool-social-kampagne"), panel: document.getElementById("tool-panel-social-kampagne") },
    { btn: document.getElementById("btn-tool-trend-radar"), panel: document.getElementById("tool-panel-trend-radar") },
    { btn: document.getElementById("btn-tool-social-content"), panel: document.getElementById("tool-panel-social-content") },
  ];
  aiToolNavButtons.forEach(({ btn, panel }) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      aiToolNavButtons.forEach(({ btn: b, panel: p }) => {
        if (b) b.classList.toggle("active", b === btn);
        if (p) p.style.display = p === panel ? "flex" : "none";
      });
    });
  });

  /**
   * Shared helper for the 4 pure-text KI-Werkzeuge (Reklamationen,
   * Produktlistungen, Social-Kampagnen, Trend-Radar): all follow the exact
   * same shape (gather inputs -> build prompt -> apiGenerate -> show text in
   * a readonly textarea + copy button), so one function drives all four
   * instead of copy-pasting the same click handler four times.
   */
  function wireAiTextTool({ buttonId, loadingId, outputId, copyId, buildPrompt }) {
    const btn = document.getElementById(buttonId);
    const loading = document.getElementById(loadingId);
    const output = document.getElementById(outputId);
    const copyBtn = document.getElementById(copyId);
    if (!btn) return;

    btn.addEventListener("click", async () => {
      if (!apiKeyConfigured) {
        alert("Bitte zuerst in den Einstellungen einen Gemini API-Key hinterlegen, um KI-Werkzeuge zu nutzen.");
        return;
      }

      if (loading) loading.style.display = "flex";
      if (output) output.style.display = "none";
      if (copyBtn) copyBtn.style.display = "none";
      btn.disabled = true;

      try {
        const prompt = buildPrompt();
        const selectedModel = modelSelect ? modelSelect.value : "gemini-2.5-flash";
        const text = await apiGenerate(prompt, selectedModel);
        if (output) {
          output.value = text;
          output.style.display = "block";
        }
        if (copyBtn) copyBtn.style.display = "inline-flex";
      } catch (err) {
        console.error(`KI-Werkzeug (${buttonId}) fehlgeschlagen:`, err);
        alert("Generierung fehlgeschlagen: " + err.message);
      } finally {
        if (loading) loading.style.display = "none";
        btn.disabled = false;
      }
    });

    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        if (output && output.value) {
          navigator.clipboard.writeText(output.value)
            .then(() => alert("In die Zwischenablage kopiert!"))
            .catch((err) => alert("Kopieren fehlgeschlagen: " + err));
        }
      });
    }
  }

  wireAiTextTool({
    buttonId: "btn-generate-reklamation",
    loadingId: "reklamation-loading",
    outputId: "reklamation-output",
    copyId: "btn-copy-reklamation",
    buildPrompt: () => {
      const text = document.getElementById("reklamation-input").value.trim();
      const firma = document.getElementById("reklamation-firma").value.trim();
      if (!text) throw new Error("Bitte zuerst den Beschwerdetext einfügen.");
      return buildReklamationPrompt(text, firma, "");
    },
  });

  wireAiTextTool({
    buttonId: "btn-generate-produktlisting",
    loadingId: "produktlisting-loading",
    outputId: "produktlisting-output",
    copyId: "btn-copy-produktlisting",
    buildPrompt: () => {
      const name = document.getElementById("produktlisting-name").value.trim();
      const stichpunkte = document.getElementById("produktlisting-stichpunkte").value.trim();
      const plattform = document.getElementById("produktlisting-plattform").value.trim();
      if (!name || !stichpunkte) throw new Error("Bitte Produktname und Stichpunkte ausfüllen.");
      return buildProduktlistingPrompt(name, stichpunkte, plattform);
    },
  });

  wireAiTextTool({
    buttonId: "btn-generate-social-kampagne",
    loadingId: "social-kampagne-loading",
    outputId: "social-kampagne-output",
    copyId: "btn-copy-social-kampagne",
    buildPrompt: () => {
      const produkt = document.getElementById("social-kampagne-produkt").value.trim();
      const zielgruppe = document.getElementById("social-kampagne-zielgruppe").value.trim();
      const plattform = document.getElementById("social-kampagne-plattform").value;
      if (!produkt || !zielgruppe) throw new Error("Bitte Produkt und Zielgruppe ausfüllen.");
      return buildSocialKampagnePrompt(produkt, zielgruppe, plattform);
    },
  });

  wireAiTextTool({
    buttonId: "btn-generate-trend-radar",
    loadingId: "trend-radar-loading",
    outputId: "trend-radar-output",
    copyId: "btn-copy-trend-radar",
    buildPrompt: () => {
      const branche = document.getElementById("trend-radar-branche").value.trim();
      if (!branche) throw new Error("Bitte eine Branche/Nische angeben.");
      return buildTrendRadarPrompt(branche);
    },
  });

  wireAiTextTool({
    buttonId: "btn-generate-social-content",
    loadingId: "social-content-loading",
    outputId: "social-content-output",
    copyId: "btn-copy-social-content",
    buildPrompt: () => {
      const thema = document.getElementById("social-content-thema").value.trim();
      const plattform = document.getElementById("social-content-plattform").value;
      if (!thema) throw new Error("Bitte ein Thema/Anlass angeben.");
      return buildSocialContentPrompt(thema, plattform);
    },
  });

  // Social-Content: Grafik-Generierung (separater Button, eigener Endpunkt,
  // da Bildgenerierung ein anderes Gemini-Modell nutzt als reiner Text und
  // nicht für jeden API-Key freigeschaltet ist).
  const btnGenerateSocialImage = document.getElementById("btn-generate-social-image");
  const socialImageLoading = document.getElementById("social-image-loading");
  const socialContentImage = document.getElementById("social-content-image");
  const btnDownloadSocialImage = document.getElementById("btn-download-social-image");

  if (btnGenerateSocialImage) {
    btnGenerateSocialImage.addEventListener("click", async () => {
      if (!apiKeyConfigured) {
        alert("Bitte zuerst in den Einstellungen einen Gemini API-Key hinterlegen, um KI-Werkzeuge zu nutzen.");
        return;
      }

      const thema = document.getElementById("social-content-thema").value.trim();
      const plattform = document.getElementById("social-content-plattform").value;
      if (!thema) {
        alert("Bitte ein Thema/Anlass angeben.");
        return;
      }

      if (socialImageLoading) socialImageLoading.style.display = "flex";
      if (socialContentImage) socialContentImage.style.display = "none";
      if (btnDownloadSocialImage) btnDownloadSocialImage.style.display = "none";
      btnGenerateSocialImage.disabled = true;

      try {
        const imagePrompt = `Erstelle eine hochwertige Social-Media-Grafik für einen ${plattform}-Post zum Thema "${thema}". Modernes B2B-Design, professionell, klare Bildsprache, keine Textelemente/Schrift im Bild.`;
        const dataUrl = await apiGenerateImage(imagePrompt);
        if (socialContentImage) {
          socialContentImage.src = dataUrl;
          socialContentImage.style.display = "block";
        }
        if (btnDownloadSocialImage) {
          btnDownloadSocialImage.href = dataUrl;
          btnDownloadSocialImage.style.display = "inline-flex";
        }
      } catch (err) {
        console.error("Social-Grafik-Gen fehlgeschlagen:", err);
        alert(
          "Grafik-Generierung fehlgeschlagen: " + err.message +
          "\n\nHinweis: Bild-Generierung ist nicht für jeden Gemini-API-Key freigeschaltet. Nutze in dem Fall das Bild-Briefing aus dem generierten Text für einen Grafiker oder ein anderes Tool."
        );
      } finally {
        if (socialImageLoading) socialImageLoading.style.display = "none";
        btnGenerateSocialImage.disabled = false;
      }
    });
  }

  // --- ADMIN-DASHBOARD ---
  // Button bleibt für alle anderen Nutzer versteckt (display:none per HTML) -
  // echte Absicherung passiert serverseitig in auth.require_admin, das ist
  // hier nur Komfort, damit niemand sonst überhaupt einen Button sieht, der
  // ohnehin nur 403 zurückgeben würde.
  (async () => {
    try {
      const email = await getCurrentUserEmail();
      if (btnHeaderAdmin && email && ADMIN_EMAIL && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        btnHeaderAdmin.style.display = "flex";
      }
    } catch (err) {
      console.error("Admin-Check fehlgeschlagen:", err);
    }
  })();

  function renderAdminSummary(stats) {
    if (!adminSummary) return;
    const cards = [
      { label: "Kunden gesamt", value: stats.total_tenants },
      { label: "Nutzer gesamt", value: stats.total_members },
      { label: "KI-Aufrufe (24h)", value: stats.total_usage_24h },
      { label: "KI-Aufrufe (7 Tage)", value: stats.total_usage_7d },
    ];
    adminSummary.innerHTML = cards
      .map(
        (c) => `
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; text-align: center;">
        <div style="font-size: 1.6rem; font-weight: 700; color: var(--text-main);">${c.value}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${escapeHtml(c.label)}</div>
      </div>
    `
      )
      .join("");
  }

  function renderAdminTenantsTable(tenants) {
    if (!adminTenantsTable) return;
    if (!tenants.length) {
      adminTenantsTable.innerHTML = `<tr><td colspan="6" style="padding: 1rem; color: var(--text-dim); text-align: center;">Noch keine Kunden.</td></tr>`;
      return;
    }
    adminTenantsTable.innerHTML = tenants
      .map(
        (t) => `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 0.5rem;">${escapeHtml(t.name || "")}</td>
        <td style="padding: 0.5rem;">${escapeHtml(t.plan || "")}</td>
        <td style="padding: 0.5rem;">${t.daily_ai_limit}</td>
        <td style="padding: 0.5rem;">${t.usage_24h}</td>
        <td style="padding: 0.5rem;">${t.usage_7d}</td>
        <td style="padding: 0.5rem; color: var(--text-muted);">${new Date(t.created_at).toLocaleDateString("de-DE")}</td>
      </tr>
    `
      )
      .join("");
  }

  if (btnHeaderAdmin) {
    btnHeaderAdmin.addEventListener("click", async () => {
      if (welcomeCard) welcomeCard.style.display = "none";
      if (reportContainer) reportContainer.style.display = "none";
      if (leadFinderCardMain) leadFinderCardMain.style.display = "none";
      if (settingsCard) settingsCard.style.display = "none";
      if (errorCard) errorCard.style.display = "none";
      if (landingpageCard) landingpageCard.style.display = "none";
      if (aiToolsCard) aiToolsCard.style.display = "none";
      if (adminCard) adminCard.style.display = "flex";

      if (adminSummary) adminSummary.innerHTML = `<p style="color: var(--text-muted);">Lade...</p>`;
      try {
        const stats = await apiAdminStats();
        renderAdminSummary(stats);
        renderAdminTenantsTable(stats.tenants);
      } catch (err) {
        console.error("Admin-Stats laden fehlgeschlagen:", err);
        if (adminSummary) {
          adminSummary.innerHTML = `<p style="color: var(--color-error);">Konnte Statistiken nicht laden: ${escapeHtml(err.message)}</p>`;
        }
      }
    });
  }

  if (btnBackFromAdmin) {
    btnBackFromAdmin.addEventListener("click", () => {
      if (adminCard) adminCard.style.display = "none";
      if (currentCampaignData) {
        if (reportContainer) reportContainer.style.display = "flex";
      } else {
        if (welcomeCard) welcomeCard.style.display = "flex";
      }
    });
  }

  if (btnAdminExport) {
    btnAdminExport.addEventListener("click", async () => {
      btnAdminExport.disabled = true;
      try {
        const data = await apiAdminExport();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `orbitai-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        alert("Export fehlgeschlagen: " + err.message);
      } finally {
        btnAdminExport.disabled = false;
      }
    });
  }

  // --- TEAM ---

  function renderTeamMembers(members) {
    if (!teamMembersList) return;
    if (!members.length) {
      teamMembersList.innerHTML = `<p style="color: var(--text-dim); font-size: 0.8rem; margin: 0;">Noch keine weiteren Team-Mitglieder.</p>`;
      return;
    }
    teamMembersList.innerHTML = members
      .map(
        (m) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.85rem;">
        <span>${escapeHtml(m.email)}</span>
        <span style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">${escapeHtml(m.role)}</span>
      </div>
    `
      )
      .join("");
  }

  async function loadTeamMembers() {
    if (!teamMembersList) return;
    try {
      const members = await apiListTeam();
      renderTeamMembers(members);
    } catch (err) {
      console.error("Team-Mitglieder laden fehlgeschlagen:", err);
    }
  }

  if (btnHeaderSettings) {
    btnHeaderSettings.addEventListener("click", () => {
      // Nach dem (evtl. Admin-Passwort-geschützten) Öffnen-Handler prüfen, ob
      // das Setup wirklich sichtbar wurde, bevor Team-Daten geladen werden.
      setTimeout(() => {
        if (settingsCard && settingsCard.style.display === "flex") loadTeamMembers();
      }, 50);
    });
  }

  if (btnTeamInvite) {
    btnTeamInvite.addEventListener("click", async () => {
      const email = teamInviteEmail.value.trim();
      if (teamInviteMessage) teamInviteMessage.style.display = "none";
      if (!email) return;

      btnTeamInvite.disabled = true;
      try {
        const status = await apiInviteMember(email);
        let message = "";
        let isError = false;
        if (status === "added") {
          message = `${email} wurde zum Team hinzugefügt.`;
          teamInviteEmail.value = "";
          loadTeamMembers();
        } else if (status === "already_member") {
          message = `${email} ist bereits Teammitglied.`;
        } else {
          message = "Diese Person muss sich zuerst selbst mit dieser E-Mail registrieren, dann kannst du sie hinzufügen.";
          isError = true;
        }
        if (teamInviteMessage) {
          teamInviteMessage.textContent = message;
          teamInviteMessage.className = "login-message " + (isError ? "login-message-error" : "login-message-info");
          teamInviteMessage.style.display = "block";
        }
      } catch (err) {
        if (teamInviteMessage) {
          teamInviteMessage.textContent = err.message;
          teamInviteMessage.className = "login-message login-message-error";
          teamInviteMessage.style.display = "block";
        }
      } finally {
        btnTeamInvite.disabled = false;
      }
    });
  }

  // --- ONBOARDING-TOUR ---
  // Selbstgebaut (kein CDN-Abhängigkeit): dimmt die Seite, hebt nacheinander
  // ein paar Kernelemente per Glow-Rahmen hervor und zeigt eine Tooltip-Karte
  // mit Weiter/Überspringen. Läuft automatisch einmal pro Browser (Flag in
  // localStorage) und kann über "Einführungstour erneut starten" im Setup
  // erneut gestartet werden.
  function initOnboardingTour() {
    try {
      if (localStorage.getItem("orbitai_onboarding_seen") === "1") return;
    } catch (e) {
      return;
    }
    setTimeout(() => startOnboardingTour(), 700);
  }

  function startOnboardingTour() {
    const steps = [
      {
        el: () => document.getElementById("api-key-card"),
        title: "1. Gemini API-Key hinterlegen",
        text: "Trag hier deinen Gemini API-Key ein, damit alle KI-Funktionen live arbeiten. Ohne Key läuft die App mit Beispieldaten weiter.",
      },
      {
        el: () => document.querySelector(".config-card"),
        title: "2. Kampagne generieren",
        text: "Branche und Produkt eingeben, dann 'Cockpit generieren' klicken - die KI erstellt eine komplette Vertriebsstrategie mit ROI-Rechner und Einwand-Trainer.",
      },
      {
        el: () => btnHeaderLeadFinder,
        title: "3. KI Lead-Scout",
        text: "Findet passende B2B-Firmen für dein Produkt in einer bestimmten Region.",
      },
      {
        el: () => btnHeaderLandingpageGen,
        title: "4. KI Landingpage-Gen",
        text: "Erstellt eine fertige, responsive Landingpage passend zu deiner Kampagne, direkt als HTML zum Download.",
      },
      {
        el: () => btnHeaderAiTools,
        title: "5. KI-Werkzeuge",
        text: "Reklamationen beantworten, Produktlistungen, Social-Media-Kampagnen, Trend-Radar und Social-Media-Content - fünf weitere KI-Assistenten an einem Ort.",
      },
      {
        el: () => btnHeaderSettings,
        title: "6. Setup",
        text: "Branding anpassen, Team-Mitglieder einladen und Daten-Backups verwalten.",
      },
    ];

    let index = 0;
    let highlightedEl = null;

    const overlay = document.createElement("div");
    overlay.id = "onboarding-overlay";
    overlay.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9998;";

    const tooltip = document.createElement("div");
    tooltip.id = "onboarding-tooltip";
    tooltip.style.cssText =
      "position:fixed; z-index:9999; max-width:320px; background:#0e121e; border:1px solid var(--accent-cyan); border-radius:10px; padding:1.25rem; box-shadow:0 8px 30px rgba(0,0,0,0.6); color:#fff; font-size:0.85rem;";

    document.body.appendChild(overlay);
    document.body.appendChild(tooltip);

    function clearHighlight() {
      if (highlightedEl) {
        highlightedEl.style.position = highlightedEl.dataset.origPosition || "";
        highlightedEl.style.zIndex = "";
        highlightedEl.style.boxShadow = "";
        delete highlightedEl.dataset.origPosition;
        highlightedEl = null;
      }
    }

    function endTour() {
      clearHighlight();
      overlay.remove();
      tooltip.remove();
      try {
        localStorage.setItem("orbitai_onboarding_seen", "1");
      } catch (e) {
        /* ignore */
      }
    }

    function renderStep() {
      clearHighlight();
      while (index < steps.length && !steps[index].el()) index++;
      if (index >= steps.length) {
        endTour();
        return;
      }

      const step = steps[index];
      const el = step.el();
      if (typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        highlightedEl = el;
        el.dataset.origPosition = el.style.position;
        el.style.position = "relative";
        el.style.zIndex = "9999";
        el.style.boxShadow = "0 0 0 4px var(--accent-cyan), 0 0 30px rgba(0, 242, 254, 0.5)";
        if (!el.style.borderRadius) el.style.borderRadius = "8px";

        const isLast = index === steps.length - 1;
        tooltip.innerHTML = `
          <div style="font-weight:700; margin-bottom:0.4rem; color: var(--accent-cyan);">${escapeHtml(step.title)}</div>
          <div style="color:#ccc; line-height:1.4; margin-bottom:1rem;">${escapeHtml(step.text)}</div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <button type="button" id="onboarding-skip" style="background:none;border:none;color:#888;font-size:0.75rem;cursor:pointer;">Tour überspringen</button>
            <button type="button" id="onboarding-next" style="background:var(--accent-cyan);color:#000;border:none;border-radius:6px;padding:0.5rem 1rem;font-weight:600;cursor:pointer;">${isLast ? "Fertig" : "Weiter"}</button>
          </div>
        `;

        const top = Math.min(window.innerHeight - 200, Math.max(20, rect.bottom + 12));
        const left = Math.min(window.innerWidth - 340, Math.max(20, rect.left));
        tooltip.style.top = top + "px";
        tooltip.style.left = left + "px";

        const nextBtn = document.getElementById("onboarding-next");
        const skipBtn = document.getElementById("onboarding-skip");
        if (nextBtn) {
          nextBtn.addEventListener("click", () => {
            index++;
            renderStep();
          });
        }
        if (skipBtn) skipBtn.addEventListener("click", endTour);
      }, 350);
    }

    renderStep();
  }

  initOnboardingTour();

  if (btnRestartTour) {
    btnRestartTour.addEventListener("click", () => {
      if (settingsCard) settingsCard.style.display = "none";
      if (currentCampaignData) {
        if (reportContainer) reportContainer.style.display = "flex";
      } else {
        if (welcomeCard) welcomeCard.style.display = "flex";
      }
      startOnboardingTour();
    });
  }
}

// Not auto-called here: bootstrap.js decides WHEN to call init() (only after
// a Supabase session exists and cloud data has been pulled into
// localStorage) rather than unconditionally on module load.
export { init };
