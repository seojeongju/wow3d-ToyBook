import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import ProfileSelect from './pages/ProfileSelect';
import Bookshelf from './pages/Bookshelf';
import BookViewer from './pages/BookViewer';
import ParentGate from './pages/ParentGate';
import ParentDashboard from './pages/ParentDashboard';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
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
