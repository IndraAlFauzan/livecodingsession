import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import CoursePage from "./pages/CoursePage.jsx";
import MeetingPage from "./pages/MeetingPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/mk/:slug" element={<CoursePage />} />
        <Route path="/mk/:slug/p/:meetingId" element={<MeetingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
