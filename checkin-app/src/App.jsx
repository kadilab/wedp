import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CheckIn from './pages/CheckIn'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/weddings/:id" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
      <Route path="*" element={isAuthenticated ? <Dashboard /> : <Login />} />
    </Routes>
  )
}

export default App
