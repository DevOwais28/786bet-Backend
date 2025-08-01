// login.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TwoFactorModal } from '@/components/TwoFactorModal';
import { VerificationCodeInput } from '@/components/VerificationCodeInput';
import { Eye, EyeOff } from 'lucide-react';
import emailJSService from '@/services/emailjs.service';
import { useToast } from '@/hooks/use-toast';
import {apiService} from '@/services/api.service';

const Login = () => {
  const [location, setLocation] = useLocation();
  const { login, isLoading, user } = useAuth();
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForResend, setEmailForResend] = useState('');
  const [verificationType, setVerificationType] = useState(''); // 'admin', 'email', or 'signup'
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationUserId, setVerificationUserId] = useState('');
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  // Only redirect after successful manual login, not on page refresh
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);
  
  React.useEffect(() => {
    const token = sessionStorage.getItem('authToken');
    // Only redirect if user manually logged in during this session
    if (user && !isLoading && token && hasAttemptedLogin) {
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
      sessionStorage.removeItem('redirectAfterLogin');
      setLocation(redirectPath);
    }
  }, [user, isLoading, hasAttemptedLogin, setLocation]);
  
  // Handle URL parameters for automatic OTP modal display
  React.useEffect(() => {
    const urlParams = new URLSearchParams(location.split('?')[1] || '');
    const email = urlParams.get('email');
    const userId = urlParams.get('userId');
    const showOTP = urlParams.get('showOTP');
    
    if (email && userId && showOTP === 'true') {
      setVerificationEmail(email);
      setVerificationUserId(userId);
      setVerificationType('signup');
      setShowVerificationModal(true);
      setShowResendVerification(true);
      setResendEmail(email);
    }
  }, [location]);

  const loginSchema = Yup.object().shape({
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
  });

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      // Check if this is an admin email (from environment variables)
      const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase());
      const isAdminEmail = adminEmails.includes(values.email.toLowerCase());

      const response = await login({ email: values.email, password: values.password });
      console.log('[Login] Response:', response);
      console.log('[Login] sessionStorage.authToken:', sessionStorage.getItem('authToken'));
      console.log('[Login] localStorage.refreshToken:', localStorage.getItem('refreshToken'));

      
      if (response.success) {
        setHasAttemptedLogin(true); // ✅ Move this up FIRST
        // Extract token from cookies
        const cookies = document.cookie.split(';');
        const accessTokenCookie = cookies.find(cookie => 
          cookie.trim().startsWith('accessToken=')
        );
        const refreshTokenCookie = cookies.find(cookie => 
          cookie.trim().startsWith('refreshToken=')
        );
        
        const token = accessTokenCookie ? accessTokenCookie.split('=')[1] : null;
        const refreshToken = refreshTokenCookie ? refreshTokenCookie.split('=')[1] : null;
        
        if (token) {
          sessionStorage.setItem('authToken', token);
        }
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        
        // Redirect to stored path or dashboard
        setTimeout(() => {
          const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
          sessionStorage.removeItem('redirectAfterLogin');
          setLocation(redirectPath);
        }, 100);

        if (response.requiresOTP) {
          // Admin login requires OTP
          setVerificationEmail(values.email);
          setVerificationType('admin_login');
          setShowVerificationModal(true);
          toast({
            title: "Admin OTP Sent",
            description: "Please check your email for the OTP code",
            className: "bg-blue-500/90 border-blue-400/50 text-white backdrop-blur-sm",
          });
        } else {
          // Regular user login successful
          toast({
            title: "Login Successful",
            description: "Welcome back!",
            className: "bg-emerald-500/90 border-emerald-400/50 text-white backdrop-blur-sm",
          });
          const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
    sessionStorage.removeItem('redirectAfterLogin');
    setLocation(redirectPath); // ✅ Single, correct redirect
        }
        }
      } else {
        // Handle specific error cases
        if (response.requiresVerification) {
          console.log('User not verified - triggering verification modal:', values.email);
          setVerificationEmail(values.email);
          setVerificationUserId(response.userId);
          setVerificationType('email');
          setShowVerificationModal(true);
          setShowResendVerification(true);
          setResendEmail(values.email);
        } else if (response.error?.toLowerCase().includes('user not found') ||
                   response.error?.toLowerCase().includes('register')) {
          setErrors({ email: 'Account not found. Please register yourself first.' });
        } else {
          setErrors({ email: response.message || response.error || 'Login failed' });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      const msg = error.response?.data?.error || error.message;
      if (msg?.toLowerCase().includes('user not found') || msg?.toLowerCase().includes('register')) {
        setErrors({ email: 'Account not found. Please register yourself first.' });
      } else {
        setErrors({ email: msg || 'Login failed' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const PasswordField = ({ errors, touched }) => {
    return (
      <div>
        <div className="relative">
          <Field
            as={Input}
            type={showPassword ? "text" : "password"}
            name="password"
            id="password"
            placeholder="Enter your password"
            className={`bg-gray-700 border-gray-600 text-white placeholder-gray-400 pr-10 ${
              errors.password && touched.password ? 'border-red-500' : ''
            }`}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
        <ErrorMessage name="password" component="div" className="text-red-400 text-sm mt-1" />
      </div>
    );
  };

  // Countdown timer effect
  React.useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerifyCode = async (code) => {
    try {
      setIsLoading(true);
      setVerificationError('');
      
      const response = await apiService.api.post('/auth/verify-otp', {
        email: verificationEmail,
        code: code,
        type: verificationType
      });

      if (response.data.success) {
        toast({
          title: "Verification Successful",
          description: verificationType === 'admin' ? "Admin access granted" : "Email verified successfully",
          variant: "success",
          className: "bg-emerald-500/90 border-emerald-400/50 text-white backdrop-blur-sm",
        });
        
        setHasAttemptedLogin(true);
        setShowVerificationModal(false);
        setLocation('/dashboard');
      } else {
        setVerificationError(response.data.message || 'Verification failed');
      }
    } catch (error) {
      setVerificationError(error.response?.data?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (email) => {
    if (!email || countdown > 0) return;
    
    setIsResending(true);
    try {
      // Use backend endpoint to generate OTP and get userId
      const response = await apiService.api.post('/auth/send-verification', { email });
      
      if (response.data && response.data.success) {
        // Check if we have the expected data structure
        const responseData = response.data.data || response.data;
        const otp = responseData.otp || responseData.token;
        const userId = responseData.userId || responseData.userId;
        
        if (!otp) {
          throw new Error('OTP not found in response');
        }
        
        // Send email using frontend EmailJS with backend-generated OTP
        await emailJSService.sendVerificationEmail(email, 'User', otp, userId || '');
        
        // Store verification data in localStorage
        localStorage.setItem('verificationData', JSON.stringify({ 
          email, 
          otp, 
          userId: userId || '', 
          type: 'email-verification' 
        }));
        
        toast({ 
          title: 'Success', 
          description: 'Verification email sent successfully!', 
          variant: 'success', 
          className: "bg-emerald-500/90 border-emerald-400/50 text-white backdrop-blur-sm",
        });
        
        setLocation('/verify-email');
        setCountdown(60);
        setShowEmailModal(false);
        setEmailForResend('');
      } else {
        toast({ 
          title: 'Error', 
          description: response.data.message || 'Failed to send verification email', 
          variant: 'destructive', 
          className: "bg-red-500/90 border-red-400/50 text-white backdrop-blur-sm",
        });
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to send verification email', 
        variant: 'destructive', 
        className: "bg-red-500/90 border-red-400/50 text-white backdrop-blur-sm",
      });
      console.error('Email sending error:', error);
    } finally {
      setIsResending(false);
    }
  };

  const handleForgotPassword = async (email) => {
    if (!email) return;
    
    try {
      // Generate OTP for password reset
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Send password reset email using frontend emailjs
      await emailJSService.sendPasswordResetEmail(email, otp);
      
      // Store email and OTP in localStorage for password reset
      localStorage.setItem('passwordResetData', JSON.stringify({
        email: email,
        otp: otp,
        type: 'password-reset',
        timestamp: Date.now()
      }));
      
      // Show success message
      toast({
        title: 'Password Reset Email Sent',
        description: 'Please check your email for the password reset OTP',
        variant: 'success',
        className: 'bg-emerald-500/90 border-emerald-400/50 text-white backdrop-blur-sm',
      });
      
      // Redirect to password reset page
      setLocation(`/reset-password?email=${encodeURIComponent(email)}`);
      
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send password reset email',
        variant: 'destructive',
        className: 'bg-red-500/90 border-red-400/50 text-white backdrop-blur-sm',
      });
    }
  };

  const checkEmailExists = async (email) => {
    try {
      const response = await apiService.api.post('/auth/check-email', { email });
      return response.data.exists;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  // Navigate to forgot password page
  const handleForgotPasswordClick = () => {
    setLocation('/forgot-password');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="mt-2 text-gray-300">
            Sign in to access your account
          </p>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched }) => (
              <Form className="space-y-6">
                <div>
                  <Label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </Label>
                  <Field
                    as={Input}
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="your@email.com"
                  />
                  <ErrorMessage name="email" component="div" className="text-red-400 text-sm mt-1" />
                </div>

                <div>
                  <Label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </Label>
                  <div className="relative">
                    <Field
                      as={Input}
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <ErrorMessage name="password" component="div" className="text-red-400 text-sm mt-1" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                      Remember me
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleForgotPasswordClick}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-gray-400">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
                      Sign up here
                    </Link>
                  </p>
                </div>
              </Form>
            )}
          </Formik>
        </div>  
        {showResendVerification && (
          <div className="mt-4 p-4 bg-yellow-600/20 border border-yellow-600 rounded-lg">
            <p className="text-sm text-yellow-400 mb-2">
              Didn't receive the verification email?
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleResendVerification}
              disabled={isResending || countdown > 0}
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                <div className="text-center mt-6 space-y-4">
                  <p className="text-gray-400">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-emerald-500 hover:text-emerald-400 font-medium">
                      Register here
                    </Link>
                  </p>
                  <p className="text-sm text-gray-400">
                    Didn't receive verification email?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailModal(true);
                      }}
                      className="text-yellow-500 hover:text-yellow-400 underline cursor-pointer"
                    >
                      Resend verification email
                    </button>
                  </p>
                </div>
              )}
            </Button>
          </div>
        )}
        
        <div className="text-sm text-gray-400">
          <span>Didn't receive verification email?{' '}</span>
          <button
            type="button"
            onClick={() => {
              setShowEmailModal(true);
            }}
            className="text-yellow-500 hover:text-yellow-400 underline cursor-pointer"
          >
            Resend verification email
          </button>
        </div>
      </div>
      <VerificationCodeInput
        isOpen={showVerificationModal}
        onClose={() => {
          setShowVerificationModal(false);
          setVerificationError('');
        }}
        onVerify={handleVerifyCode}
        title={verificationType === 'admin' ? 'Admin Login' : 'Email Verification'}
        email={verificationEmail}
        isLoading={isLoading}
        error={verificationError}
        onResendCode={async () => {
          try {
            if (verificationType === 'admin') {
              await emailJSService.sendAdminLoginOTP(verificationEmail);
            } else {
              await emailJSService.sendVerificationEmail(verificationEmail);
            }
            toast({
              title: 'Code Resent',
              description: 'A new verification code has been sent to your email',
              variant: "success",
              className: "bg-emerald-500/90 border-emerald-400/50 text-white backdrop-blur-sm",
            });
          } catch (error) {
            toast({
              title: "Error",
              description: error.response?.data?.message || "Login failed",
              variant: "destructive",
              className: "bg-red-500/90 border-red-400/50 text-white backdrop-blur-sm",
            });
          }
        }}
        isResending={isResending}
        countdown={countdown}
      />

      {/* Email Modal for Resend Verification */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm mx-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Resend Verification Email</h3>
            <p className="text-gray-300 mb-4">Enter your email address to receive a new verification email.</p>
            
            <Input
              type="email"
              placeholder="Enter your email"
              value={emailForResend}
              onChange={(e) => setEmailForResend(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 mb-4"
            />
            
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (emailForResend) {
                    handleResendVerification(emailForResend);
                  }
                }}
                disabled={!emailForResend || isResending || countdown > 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              >
                {isResending ? 'Sending...' : countdown > 0 ? `Wait ${countdown}s` : 'Send Email'}
              </Button>
              
              <Button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailForResend('');
                }}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
