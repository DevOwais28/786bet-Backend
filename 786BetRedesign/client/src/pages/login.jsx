import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, Mail, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { VerificationCodeInput } from '@/components/VerificationCodeInput';
import emailJSService from '@/services/emailjs.service';
const Login = () => {
  const [_, setLocation] = useLocation();
  const { login, isLoading, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationType, setVerificationType] = useState('');
  const [verificationError, setVerificationError] = useState('');

  // Handle navigation after successful login
  useEffect(() => {
    if (user && !isLoading) {
      // Navigate to dashboard after successful login with a small delay
      setTimeout(() => {
        setLocation('/dashboard');
      }, 100);
    }
  }, [user, isLoading, setLocation]);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [emailForResend, setEmailForResend] = useState('');
  const { toast } = useToast();

  // Countdown effect for resend verification
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/dashboard';
      sessionStorage.removeItem('redirectAfterLogin');
      setLocation(redirectPath);
    }
  }, [user, isLoading, setLocation]);

  const handleResendVerification = async (email = '') => {
    try {
      setIsResending(true);
      const emailToUse = email || verificationEmail;
      
      if (!emailToUse) {
        setShowEmailModal(true);
        return;
      }
      
      // Set verification email and type
      setVerificationEmail(emailToUse);
      setVerificationType('email');
      
      // Use emailJS service to send verification email
      await emailJSService.sendVerificationEmail(emailToUse);
      
      setCountdown(60); // 60 seconds cooldown
      setShowVerificationModal(true);
      setShowEmailModal(false);
      
      toast({
        title: 'Verification email sent',
        description: 'Please check your email for the verification code.',
      });
    } catch (error) {
      toast({
        title: 'Failed to resend verification',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const loginSchema = Yup.object().shape({
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .required('Password is required'),
  });

  const handleVerifyCode = async (code) => {
    try {
      setVerificationError('');
      
      // For email verification
      if (verificationType === 'email') {
        // Check if code matches stored OTP
        const pendingData = JSON.parse(localStorage.getItem('pendingVerification') || '{}');
        if (pendingData.email === verificationEmail && pendingData.otp === code) {
          setShowVerificationModal(false);
          toast({
            title: 'Email verified',
            description: 'Your email has been verified successfully!',
          });
          
          // Clear pending verification
          localStorage.removeItem('pendingVerification');
          
          // Complete registration if this was for registration
          if (pendingData.registrationData) {
            // Redirect to register page with verified data
            setLocation('/register?verified=true');
          } else {
            // For login verification, redirect to login
            window.location.reload();
          }
        } else {
          setVerificationError('Invalid verification code');
        }
      } else if (verificationType === 'admin') {
        // Admin OTP verification
        const adminData = JSON.parse(localStorage.getItem('adminOTP') || '{}');
        if (adminData.email === verificationEmail && adminData.otp === code) {
          setShowVerificationModal(false);
          localStorage.removeItem('adminOTP');
          
          // Proceed with admin login
          toast({
            title: 'Admin verified',
            description: 'Admin access granted!',
          });
          
          // Redirect to admin dashboard
          setLocation('/admin');
        } else {
          setVerificationError('Invalid admin verification code');
        }
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationError('Invalid verification code');
    }
  };

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      setSubmitting(true);
      setShowResendVerification(false); // Reset verification UI state
      
      // Check if this is an admin login attempt
      const isAdminEmail = values.email.includes('@admin') || values.email.endsWith('.admin');
      
      if (isAdminEmail) {
        // Admin login requires OTP verification
        setVerificationEmail(values.email);
        setVerificationType('admin');
        
        try {
          await emailJSService.sendAdminLoginOTP(values.email);
          setShowVerificationModal(true);
          
          // Store admin OTP data temporarily
          const adminOTP = {
            email: values.email,
            password: values.password, // Store password temporarily for verification
            otp: Math.floor(100000 + Math.random() * 900000).toString(),
            timestamp: Date.now()
          };
          localStorage.setItem('adminOTP', JSON.stringify(adminOTP));
          
          toast({
            title: 'Admin verification required',
            description: 'Please check your email for the admin OTP code.',
          });
        } catch (emailError) {
          toast({
            title: 'Admin verification failed',
            description: 'Could not send admin OTP. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setSubmitting(false);
        }
        return;
      }
      
      // Regular user login
      const response = await login(values.email, values.password);
      
      if (response.success) {
        // Show success message
        toast({
          title: 'Login successful',
          description: 'Redirecting to dashboard...',
        });
        
        // Send welcome email
        try {
          await emailJSService.sendWelcomeEmail(values.email, response.user?.name || 'User');
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
        }
        
      } else {
        // Handle specific error cases
        if (response.error?.includes('not verified')) {
          setShowResendVerification(true);
          setErrors({ 
            email: 'Please verify your email address',
            password: 'Check your email for the verification link' 
          });
        } else if (response.error?.includes('pending')) {
          setErrors({ 
            submit: 'Your account is pending approval. Please wait for admin verification.' 
          });
        } else {
          setErrors({ 
            email: 'Invalid email or password', 
            password: 'Please check your credentials and try again' 
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred during login';
      setErrors({ submit: errorMessage });
      toast({
        title: 'Login error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Image */}
      <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-800">
        <div className="h-full flex items-center justify-center p-12">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Welcome Back!</h1>
            <p className="text-xl opacity-90">Sign in to access your account and start playing.</p>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 flex-col">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link href="/">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">786</span>
              </div>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sign in to your account</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline">
                Sign up
              </Link>
            </p>
          </div>

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, isSubmitting, ...formik }) => (
              <Form className="space-y-6">
                {errors.submit && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                    <div className="flex">
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                          {errors.submit}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                  </Label>
                  <div className="mt-1">
                    <Field
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white text-gray-900"
                    />
                    <ErrorMessage name="email" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="block text-sm font-medium">
                      Password
                    </Label>
                    <div className="text-sm">
                      <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="relative">
                      <Field
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:text-white text-gray-900 pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 h-full"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <Eye className="h-5 w-5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    <ErrorMessage name="password" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    {isSubmitting || isLoading ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                        Signing in...
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </div>  
        {showResendVerification && (
          <div className="mt-4 p-4 bg-yellow-600/20 border border-yellow-600 rounded-lg">
            <p className="text-sm text-yellow-400 mb-2">
              Please verify your email address to continue. Check your inbox for the verification link.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleResendVerification(formik?.values?.email)}
              disabled={isResending || countdown > 0}
              className="w-full bg-yellow-600/10 hover:bg-yellow-600/20 border-yellow-600 text-yellow-400 hover:text-yellow-300"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                <span className="flex items-center justify-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Resend verification email
                </span>
              )}
            </Button>
          </div>
        )}
        
        {/* Verification Code Modal */}
        <VerificationCodeInput
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onVerify={handleVerifyCode}
          email={verificationEmail}
          isLoading={isLoading}
          error={verificationError}
          onResendCode={() => handleResendVerification(verificationEmail)}
          isResending={isResending}
          countdown={countdown}
        />
        
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