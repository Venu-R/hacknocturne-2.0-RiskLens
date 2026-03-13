import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, Github, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, getOAuthURL, error, setError } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const oauthError = searchParams.get('error');
  const oauthErrorMessage = {
    invalid_state: 'OAuth session expired. Please try again.',
    oauth_failed: 'OAuth login failed. Please try again.',
    auth_failed: 'Authentication failed. Please try again.',
    github_access_denied: 'GitHub login was cancelled or denied for this app.',
    jira_access_denied: 'Your Atlassian account is not allowed for this Jira app.',
    jira_site_access_required: 'Jira connect failed: this Atlassian account has no Jira site access. Join/create a Jira site, then try again.',
  }[oauthError];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const result = await login(email, password);
    
    if (result.success) {
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20 pointer-events-none" />
      
      <div className="w-full max-w-md relative">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              RiskLens
            </h1>
            <p className="text-gray-400 mt-2 text-sm">Risk Assessment Platform</p>
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-[#141414] border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold text-white mb-6">Welcome back</h2>

          {/* Error Alert */}
          {(error || oauthErrorMessage) && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error || oauthErrorMessage}
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <a
              href={getOAuthURL('github')}
              className="w-full flex items-center justify-center gap-3 bg-[#24292e] hover:bg-[#2f363d] text-white py-3 px-4 rounded-lg transition-all duration-200 border border-gray-700 hover:border-gray-600"
            >
              <Github size={20} />
              Continue with GitHub
            </a>
            
            <a
              href={getOAuthURL('jira')}
              className="w-full flex items-center justify-center gap-3 bg-[#0052cc] hover:bg-[#0747a6] text-white py-3 px-4 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3v18h24V3H0zm17.066 16l-4.578-4.578 1.414-1.414 3.164 3.164L21.95 7.5l1.414 1.414L17.066 19z"/>
              </svg>
              Continue with Jira
            </a>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#141414] text-gray-400">or continue with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg py-3 pl-10 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-[#1a1a1a] text-purple-500 focus:ring-purple-500" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-purple-400 hover:text-purple-300">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Sign up link */}
          <p className="mt-6 text-center text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-purple-400 hover:text-purple-300 font-medium">
              Sign up
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-gray-500 text-xs">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="hover:text-gray-400">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="hover:text-gray-400">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
