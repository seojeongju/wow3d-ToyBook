import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import ProfileSelect from './pages/ProfileSelect';
import Bookshelf from './pages/Bookshelf';
import BookViewer from './pages/BookViewer';
import ParentGate from './pages/ParentGate';
import ParentDashboard from './pages/ParentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { AboutPage, FaqPage, FigurePage, SafetyPage } from './pages/InfoPages';
import { LicensesPage, PrivacyPage, TermsPage } from './pages/LegalPages';
import { useSeo } from './seo';
import OfflineNotice from './components/OfflineNotice';

export default function App() {
  // 경로마다 제목·설명·대표 주소 적용, 공개 페이지(PAGE_META)가 아니면 검색 제외 (src/seo.ts)
  useSeo(useLocation().pathname);

  return (
    <>
      <OfflineNotice />
      <Routes>
        <Route path="/" element={<Home />} />
        {/* 공개 소개 페이지 (src/seo.ts PAGE_META 에 등록 → 미리 그리기·사이트맵) */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/figure" element={<FigurePage />} />
        <Route path="/safety" element={<SafetyPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/licenses" element={<LicensesPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profiles" element={<ProfileSelect />} />
        <Route path="/shelf/:childId" element={<Bookshelf />} />
        <Route path="/book/:bookId" element={<BookViewer />} />
        <Route path="/parent" element={<ParentGate />} />
        <Route path="/dashboard" element={<ParentDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
