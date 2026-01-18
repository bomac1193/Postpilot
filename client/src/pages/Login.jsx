import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useAppStore } from '../stores/useAppStore';
import { Loader2, Mail, Lock, LogIn, UserPlus } from 'lucide-react';

// Google icon SVG component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAppStore((state) => state.setUser);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  // Handle OAuth callbacks
  useEffect(() => {
    const googleStatus = searchParams.get('google');
    const token = searchParams.get('token');
    const message = searchParams.get('message');

    if (googleStatus === 'success' && token) {
      // Store token and fetch user data
      localStorage.setItem('token', token);
      setSuccess('Google login successful! Redirecting...');

      // Fetch user profile and update store
      authApi.getMe()
        .then((userData) => {
          setUser(userData.user || userData);
          navigate('/grid');
        })
        .catch((err) => {
          console.error('Failed to fetch user data:', err);
          navigate('/grid'); // Navigate anyway, user can be fetched later
        });
    } else if (googleStatus === 'error') {
      if (message === 'credentials_missing') {
        setError('Google OAuth is not configured. Please set up Google credentials.');
      } else {
        setError('Google login failed. Please try again.');
      }
    }
  }, [searchParams, navigate, setUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await authApi.login(formData.email, formData.password);
      } else {
        await authApi.register(formData.email, formData.password, formData.name);
        // After registration, log in
        await authApi.login(formData.email, formData.password);
      }

      // Fetch user profile and update store
      try {
        const userData = await authApi.getMe();
        setUser(userData.user || userData);
      } catch (profileErr) {
        console.error('Failed to fetch user profile:', profileErr);
        // Set basic user info from form data
        setUser({ email: formData.email, name: formData.name || formData.email.split('@')[0] });
      }

      navigate('/grid');
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setError(null);
    // Redirect to backend Google OAuth endpoint
    window.location.href = '/api/auth/google';
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-bold text-dark-100 mb-2">
            PostPilot
          </h1>
          <p className="text-dark-400">AI-Powered Social Media Command Center</p>
        </div>

        {/* Card */}
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-8">
          <h2 className="text-xl font-semibold text-dark-100 mb-6">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-900/50 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-lg transition-colors mb-6"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-dark-800 text-dark-400">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Name</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="w-full pl-10 pr-4 py-2.5 input"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 input"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 justify-center"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-sm text-dark-400 hover:text-accent-purple transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Skip login for demo */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/grid')}
            className="text-sm text-dark-500 hover:text-dark-300 transition-colors"
          >
            Continue without login (demo mode)
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
