import React from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";

const container = document.getElementById("root");

const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <LanguageProvider>
      <ThemeProvider defaultTheme="system">
        <App />
      </ThemeProvider>
    </LanguageProvider>
  </React.StrictMode>
);
