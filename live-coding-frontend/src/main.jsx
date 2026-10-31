import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import StudentGate from "./components/StudentGate.jsx";
import StudentShell from "./components/layout/StudentShell.jsx";
import { StudentAuthProvider } from "./hooks/useStudentAuth.jsx";
import { storage } from "./lib/storage.js";
import AccountPage from "./pages/AccountPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import CoursesPage from "./pages/CoursesPage.jsx";
import CoursePage from "./pages/CoursePage.jsx";
import MeetingPage, { MeetingPreviewPage } from "./pages/MeetingPage.jsx";
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
          {/* Halaman mahasiswa di dalam kerangka: sidebar tetap, jadi berpindah
              mata kuliah tidak perlu keluar dulu. */}
          <Route element={mahasiswa(<StudentShell />)}>
            <Route path="/" element={<HomePage />} />
            <Route path="/mk" element={<CoursesPage />} />
            <Route path="/mk/:slug" element={<CoursePage />} />
            <Route path="/mk/:slug/p/:meetingId" element={<MeetingPage />} />
            <Route path="/akun" element={<AccountPage />} />
          </Route>

          {/* Mode fokus: isinya sama, tapi tanpa kerangka. */}
          <Route path="/fokus/mk/:slug/p/:meetingId" element={mahasiswa(<MeetingPage focus />)} />
          <Route path="/pratinjau/mk/:slug/p/:meetingId" element={<MeetingPreviewPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StudentAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
