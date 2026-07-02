import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { ProtectedRoute, PublicRoute } from './components/RouteGuards.tsx';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';
import Dashboard from './pages/Dashboard.tsx';
import FormEditor from './pages/FormEditor.tsx';
import PublicForm from './pages/PublicForm.tsx';
import Analytics from './pages/Analytics.tsx';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication routes (Redirects logged-in users to /dashboard) */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Authenticated routes (Redirects unauthenticated users to /login) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/forms/new" element={<FormEditor />} />
            <Route path="/forms/:id/edit" element={<FormEditor />} />
            <Route path="/forms/:id/analytics" element={<Analytics />} />
          </Route>

          {/* Public Submission route (Accessible to anyone, no session check) */}
          <Route path="/f/:slug" element={<PublicForm />} />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
