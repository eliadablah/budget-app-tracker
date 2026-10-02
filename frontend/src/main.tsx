// src/main.tsx
// What: the actual entry point - mounts the React app into the <div id="root">
// in index.html. Nothing else should go in this file.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
