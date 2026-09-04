import React, { useState } from 'react';
import { api } from '../hooks/api';
import { useAuthStore } from '../store/auth.store';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = isRegister
        ? await api.auth.register(email, password)
        : await api.auth.login(email, password);
      setAuth(res.token, res.user);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-groww-green to-groww-purple rounded-xl flex items-center justify-center shadow-lg shadow-groww-green/20">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <h1 className="text-2xl font-bold text-groww-text-primary">
              Smart <span className="bg-gradient-to-r from-groww-green to-groww-green-dark bg-clip-text text-transparent">Watchlist</span>
            </h1>
          </div>
          <p className="text-groww-text-secondary text-sm">
            Intelligent market monitoring that shows what actually matters
          </p>
        </div>

        <div className="card shadow-xl shadow-black/20">
          <h2 className="text-xl font-semibold mb-6 text-groww-text-primary">
            {isRegister ? 'Create Account' : 'Welcome Back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-groww-text-secondary mb-1.5">Email Address</label>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                className="input-field w-full bg-groww-bg/50"
                placeholder="trader@groww.in"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-groww-text-secondary mb-1.5">Password</label>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full bg-groww-bg/50"
                placeholder={isRegister ? "Create a strong password" : "Enter your password"}
                minLength={6}
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
              />
              {isRegister && (
                <p className="text-xs text-groww-text-muted mt-2 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${password.length >= 6 ? 'bg-groww-green' : 'bg-groww-border'}`}></span>
                  Must be at least 6 characters
                </p>
              )}
            </div>

            {error && (
              <div className="bg-tier-critical/10 border border-tier-critical/30 text-tier-critical text-sm px-3 py-2.5 rounded-lg animate-fade-in flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button id="auth-submit-btn" type="submit" className="btn-primary w-full py-2.5 shadow-lg shadow-groww-green/20" disabled={loading}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              id="toggle-auth-mode"
              onClick={toggleMode}
              type="button"
              className="text-groww-text-secondary text-sm hover:text-groww-green transition-colors"
            >
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
