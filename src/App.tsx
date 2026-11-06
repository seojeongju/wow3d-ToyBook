import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import ProfileSelect from './pages/ProfileSelect';
import Bookshelf from './pages/Bookshelf';
import BookViewer from './pages/BookViewer';
import ParentGate from './pages/ParentGate';
import ParentDashboard from './pages/ParentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { useSeo } from './seo';

export default function App() {
  // 경로마다 제목·설명·대표 주소 적용, 공개 페이지(PAGE_META)가 아니면 검색 제외 (src/seo.ts)
  useSeo(useLocation().pathname);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profiles" element={<ProfileSelect />} />
      <Route path="/shelf/:childId" element={<Bookshelf />} />
      <Route path="/book/:bookId" element={<BookViewer />} />
      <Route path="/parent" element={<ParentGate />} />
      <Route path="/dashboard" element={<ParentDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
