import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";
import { stopMusic } from "./game/sfx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary
      gameName="Reverse Boss Runner"
      accent="#f43f5e"
      saveKeys={["reverse-boss-runner-save-v1"]}
      onCrash={() => stopMusic()}
    >
      <App />
    </ErrorBoundary>
  </StrictMode>
);
