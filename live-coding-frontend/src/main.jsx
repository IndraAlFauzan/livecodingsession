import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import StudentGate from "./components/StudentGate.jsx";
import { StudentAuthProvider } from "./hooks/useStudentAuth.jsx";
import { storage } from "./lib/storage.js";
import HomePage from "./pages/HomePage.jsx";
import CoursePage from "./pages/CoursePage.jsx";
import MeetingPage from "./pages/MeetingPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import "./design/tokens.css";
import "./design/bundle.css";
import "./design/app.css";

// Sisa penyimpanan dari versi sebelum ada akun mahasiswa.
storage.dropLegacy();

const mahasiswa = (halaman) => <StudentGate>{halaman}</StudentGate>;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <StudentAuthProvider>
        <Routes>
          <Route path="/" element={mahasiswa(<HomePage />)} />
          <Route path="/mk/:slug" element={mahasiswa(<CoursePage />)} />
          <Route path="/mk/:slug/p/:meetingId" element={mahasiswa(<MeetingPage />)} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StudentAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
