// src/components/LoginForm.jsx
import React, { useState } from 'react';
import { Loader2, Mail, Lock, User, Shield, Eye, EyeOff, CheckCircle, XCircle, UserPlus, LogIn } from 'lucide-react';

const LoginForm = ({ onLogin, onRegister, loading, error }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin'  // Default to admin since we only have admin role now
  });

  const [validations, setValidations] = useState({
    nameValid: null,
    emailValid: null,
    passwordStrong: null,
    passwordMatch: null
  });


  const isEmailEligibleForAdmin = (email) => {
  if (!email || !email.includes('@')) return false;
  
  const allowedDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com'];
  const domain = email.split('@')[1];
  
  return allowedDomains.some(allowed => 
    domain === allowed || domain.endsWith(`.${allowed}`)
  );
};

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(formData.email, formData.password);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    
    // Validate all fields
    if (!registerData.name || registerData.name.length < 2) {
      alert('Please enter a valid name (at least 2 characters)');
      return;
    }
    
    if (!registerData.email || !registerData.email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    
    if (registerData.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    // Always register as admin
    onRegister(
      registerData.email,
      registerData.password,
      registerData.name,
      'admin'
    );
  };

  // Validation handlers
  const validateName = (name) => {
    const isValid = name.length >= 2;
    setValidations(prev => ({ ...prev, nameValid: isValid }));
  };

  const validateEmail = (email) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setValidations(prev => ({ ...prev, emailValid: isValid }));
  };

  const validatePassword = (password) => {
    const isStrong = password.length >= 6;
    setValidations(prev => ({ ...prev, passwordStrong: isStrong }));
    
    if (registerData.confirmPassword) {
      setValidations(prev => ({ 
        ...prev, 
        passwordMatch: password === registerData.confirmPassword 
      }));
    }
  };

  const validateConfirmPassword = (confirmPassword) => {
    const isMatch = confirmPassword === registerData.password;
    setValidations(prev => ({ ...prev, passwordMatch: isMatch }));
  };

  return (
    <div className="auth-shell">
      <div className="auth-grid">
        <section className="section-block section-block--hero auth-hero">
          <span className="section-kicker">Filipino Emigrants Portal</span>
          <h1 className="auth-hero__title">Access emigrant intelligence with clarity</h1>
          <p className="auth-hero__description">
            Sign in to upload datasets, explore interactive charts, and train forecasting models that illuminate Filipino emigration trends.
          </p>
          <div className="auth-hero__chips">
            <span className="auth-chip">
              <Shield size={16} /> Role-based protection
            </span>
            <span className="auth-chip">
              <CheckCircle size={16} /> Real-time analytics
            </span>
            <span className="auth-chip">
              <Lock size={16} /> Secure data handling
            </span>
          </div>
        </section>

        <section className="section-block auth-card">
          <div className="auth-card__header">
            <div className="auth-tabs">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`auth-tabs__button ${isLogin ? 'auth-tabs__button--active' : ''}`}
              >
                <LogIn size={18} />
                <span>Login</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`auth-tabs__button ${!isLogin ? 'auth-tabs__button--active' : ''}`}
              >
                <UserPlus size={18} />
                <span>Register</span>
              </button>
            </div>
            <p className="auth-card__subtitle">
              {isLogin
                ? 'Enter your administrator credentials to continue.'
                : 'Create an administrator account to seed the dashboard.'}
            </p>
          </div>

          <div className="auth-card__body">
            {error && (
              <div className="alert alert-error">
                <XCircle size={20} />
                <div>
                  <strong>Authentication error</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {isLogin ? (
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-field">
                  <label className="form-label" htmlFor="login-email">
                    <Mail size={16} />
                    <span>Email address</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="login-email"
                      type="email"
                      className="input-field"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your.email@example.com"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="login-password">
                    <Lock size={16} />
                    <span>Password</span>
                  </label>
                  <div className="input-wrapper input-wrapper--with-toggle">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter your password"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="input-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="button button--primary button--block auth-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Signing in…</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={18} />
                      <span>Sign in</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegisterSubmit}>
                <div className="form-field">
                  <label className="form-label" htmlFor="register-name">
                    <User size={16} />
                    <span>Full name</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="register-name"
                      type="text"
                      className="input-field"
                      value={registerData.name}
                      onChange={(e) => {
                        setRegisterData({ ...registerData, name: e.target.value });
                        validateName(e.target.value);
                      }}
                      placeholder="Juan Dela Cruz"
                      disabled={loading}
                      required
                    />
                    {validations.nameValid !== null && (
                      <span
                        className={`form-field__status ${validations.nameValid ? 'form-field__status--success' : 'form-field__status--error'}`}
                      >
                        {validations.nameValid ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="register-email">
                    <Mail size={16} />
                    <span>Email address</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="register-email"
                      type="email"
                      className="input-field"
                      value={registerData.email}
                      onChange={(e) => {
                        setRegisterData({ ...registerData, email: e.target.value });
                        validateEmail(e.target.value);
                      }}
                      placeholder="your.email@example.com"
                      disabled={loading}
                      required
                    />
                    {validations.emailValid !== null && (
                      <span
                        className={`form-field__status ${validations.emailValid ? 'form-field__status--success' : 'form-field__status--error'}`}
                      >
                        {validations.emailValid ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      </span>
                    )}
                  </div>
                </div>

                <div className="auth-info">
                  <div className="auth-info__icon">
                    <Shield size={18} />
                  </div>
                  <div>
                    <strong>Administrator access</strong>
                    <p>New accounts receive full permissions for uploads, records, forecasting, and exports.</p>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="register-password">
                    <Lock size={16} />
                    <span>Password</span>
                  </label>
                  <div className="input-wrapper input-wrapper--with-toggle">
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      value={registerData.password}
                      onChange={(e) => {
                        setRegisterData({ ...registerData, password: e.target.value });
                        validatePassword(e.target.value);
                      }}
                      placeholder="At least 6 characters"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      className="input-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {validations.passwordStrong !== null && !validations.passwordStrong && (
                    <p className="form-helper form-helper--error">Password must be at least 6 characters.</p>
                  )}
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="register-confirm">
                    <Lock size={16} />
                    <span>Confirm password</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="register-confirm"
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      value={registerData.confirmPassword}
                      onChange={(e) => {
                        setRegisterData({ ...registerData, confirmPassword: e.target.value });
                        validateConfirmPassword(e.target.value);
                      }}
                      placeholder="Re-enter your password"
                      disabled={loading}
                      required
                    />
                    {validations.passwordMatch !== null && (
                      <span
                        className={`form-field__status ${validations.passwordMatch ? 'form-field__status--success' : 'form-field__status--error'}`}
                      >
                        {validations.passwordMatch ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      </span>
                    )}
                  </div>
                  {validations.passwordMatch !== null && !validations.passwordMatch && (
                    <p className="form-helper form-helper--error">Passwords do not match.</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="button button--accent button--block auth-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Creating account…</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      <span>Create admin account</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginForm;