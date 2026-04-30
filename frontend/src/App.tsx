import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LibraryPage from './pages/LibraryPage'
import LoginPage from './pages/LoginPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
