import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppProvider } from "./context/AppContext";
import App from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--card, #18181b)",
              color: "var(--text, #fafafa)",
              border: "1px solid var(--border-strong, #3f3f46)",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "13.5px",
              fontWeight: 500,
              borderRadius: "8px",
              boxShadow: "0 8px 24px rgba(0,0,0,.3)",
            },
            success: { iconTheme: { primary: "#22d3ee", secondary: "#18181b" } },
            error:   { iconTheme: { primary: "#f87171", secondary: "#18181b" } },
          }}
        />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
