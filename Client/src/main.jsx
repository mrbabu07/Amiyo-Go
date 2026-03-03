import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "./i18n/i18n.js";
import { initializePWA } from "./utils/pwa.js";

// Currency is now fixed to BDT - no need to store in localStorage
// All prices displayed in BDT (৳) - stored as USD in database, converted for display

// Initialize PWA features
initializePWA().then((pwaStatus) => {
  if (pwaStatus) {
    console.log("🎉 PWA features initialized:", pwaStatus);
  }
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
