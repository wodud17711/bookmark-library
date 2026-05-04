import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LibraryPage from './pages/LibraryPage'
import LoginPage from './pages/LoginPage'
import PublicLibraryPage from './pages/PublicLibraryPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/u/:username" element={<PublicLibraryPage />} />
        <Route path="/u/:username/:slug" element={<PublicLibraryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
