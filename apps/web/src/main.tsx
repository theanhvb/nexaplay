import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AppDialogHost } from "./components/AppDialog";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <AppDialogHost />
  </React.StrictMode>
);
