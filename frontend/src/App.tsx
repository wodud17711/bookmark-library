import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LibraryPage from './pages/LibraryPage'
import LoginPage from './pages/LoginPage'
import PublicLibraryPage from './pages/PublicLibraryPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsPage from './pages/TermsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/u/:username" element={<PublicLibraryPage />} />
        <Route path="/u/:username/:slug" element={<PublicLibraryPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
