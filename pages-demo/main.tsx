import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { DemoStoreProvider } from "./demo-store";
import { brand } from "@/config/brand";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error(`${brand.productName} demo root was not found`);

createRoot(root).render(
  <StrictMode>
    <DemoStoreProvider>
      <App />
    </DemoStoreProvider>
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}
