import React from "react";
import ReactDOM from "react-dom/client";
// import App from "./App";
import "./index.css";
import TestScene from "./TestScene"; // ← comment ทับ App ไว้ก่อน

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* <App /> */}
    <TestScene />
  </React.StrictMode>
);