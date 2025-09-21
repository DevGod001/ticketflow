import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";
import { restoreEssentialData } from "@/utils/restoreUserData.js";

// Make restore function available globally for browser console
if (typeof window !== "undefined") {
  window.restoreUserData = restoreEssentialData;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
