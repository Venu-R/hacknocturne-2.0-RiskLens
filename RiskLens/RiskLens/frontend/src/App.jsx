import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { LoginPage, SignupPage, OAuthCallback } from './pages';

// Placeholder for dashboard (you can create this later)
function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-4">Dashboard</h1>
        <p className="text-gray-400">Welcome to RiskLens Dashboard</p>
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="max-w-7xl mx-auto text-center py-20">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-6">
          RiskLens
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          AI-powered risk assessment platform for your projects
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/signup"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-8 py-3 rounded-lg font-medium transition-all"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="border border-gray-700 text-gray-300 hover:border-gray-500 px-8 py-3 rounded-lg font-medium transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-[#0a0a0a] text-white">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            
            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <Dashboard />
                  </>
                </ProtectedRoute>
              }
            />
            
            {/* Home route */}
            <Route
              path="/"
              element={
                <>
                  <Navbar />
                  <Home />
                </>
              }
            />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
