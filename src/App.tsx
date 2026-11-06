import { Navigate, Route, Routes } from 'react-router-dom';
import ProfileSelect from './pages/ProfileSelect';
import Bookshelf from './pages/Bookshelf';
import BookViewer from './pages/BookViewer';
import ParentGate from './pages/ParentGate';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProfileSelect />} />
      <Route path="/shelf/:childId" element={<Bookshelf />} />
      <Route path="/book/:bookId" element={<BookViewer />} />
      <Route path="/parent" element={<ParentGate />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
