import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { LoginPage, SignupPage, OAuthCallback } from './pages';
import Dashboard from './pages/Dashboard';

function Home() {
  return (
    <div style={{ minHeight:"100vh", background:"#03060F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'JetBrains Mono',monospace" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:52, fontWeight:800, fontFamily:"'Syne',sans-serif", color:"#D8E8FF", marginBottom:16 }}>
          Risk<span style={{ color:"#7EB4FF" }}>Lens</span>
        </div>
        <p style={{ fontSize:16, color:"#6080B0", marginBottom:40, maxWidth:500 }}>
          AI-powered workflow intelligence that detects silent risks before they become production incidents.
        </p>
        <div style={{ display:"flex", gap:16, justifyContent:"center" }}>
          <Link to="/signup" style={{ background:"linear-gradient(135deg,#3B6BF5,#1A3FC4)", color:"white", padding:"12px 32px", borderRadius:10, fontWeight:700, textDecoration:"none", fontSize:13 }}>
            Get Started
          </Link>
          <Link to="/login" style={{ border:"1px solid rgba(50,90,220,0.3)", color:"#7EB4FF", padding:"12px 32px", borderRadius:10, fontWeight:700, textDecoration:"none", fontSize:13 }}>
            Sign In
          </Link>
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Syne:wght@800&display=swap');`}</style>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/signup"         element={<SignupPage />} />
          <Route path="/auth/callback"  element={<OAuthCallback />} />

          {/* Dashboard — has its own nav, no Navbar wrapper */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
