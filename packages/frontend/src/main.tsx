import React from "react";
import ReactDOM from "react-dom/client";
import { configureAuth } from "./auth";
import App from "./App";
import "./styles.css";

configureAuth();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
