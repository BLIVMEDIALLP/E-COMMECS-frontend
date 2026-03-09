import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ShriAaumStore from "./store/ShriAaumStore";
import AdminApp from "./admin/AdminApp";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* ── Public Store ── */}
        <Route path="/*" element={<ShriAaumStore />} />

        {/* ── Admin Panel ── */}
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
