import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import emailJSService from '@/services/emailjs.service';

export default function Register() {
  const [, setLocation] = useLocation();
  const { register, isLoading } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const registerSchema = Yup.object().shape({
    username: Yup.string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
      .required('Username is required'),
    email: Yup.string()
      .email('Invalid email address')
      .required('Email is required'),
    password: Yup.string()
      .min(6, 'Password must be at least 6 characters')
      .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
      .matches(/[0-9]/, 'Password must contain at least one number')
      .required('Password is required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Confirm password is required'),
    referralCode: Yup.string()
      .optional()
      .matches(/^[A-Z0-9]{6,10}$/, 'Referral code must be 6-10 uppercase letters and numbers'),
  });

  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    try {
      setSubmitting(true);
      
      // First, register the user with the backend
      const registrationData = {
        username: values.username.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        referralCode: values.referralCode?.trim().toUpperCase() || null
      };

      // Call backend registration endpoint
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
        credentials: 'include' // Include cookies
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle validation errors and duplicate emails
        if (result.errors) {
          Object.keys(result.errors).forEach(field => {
            setFieldError(field, result.errors[field]);
          });
        } else {
          setFieldError('submit', result.message || 'Registration failed');
        }
        return;
      }

      // Generate OTP for email verification
      const otp = result.data?.otp || Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store verification data
      localStorage.setItem('pendingVerification', JSON.stringify({
        email: values.email.trim().toLowerCase(),
        otp: otp,
        userId: result.data?.userId
      }));
      
      // Send verification email using frontend emailjs
      await emailJSService.sendVerificationEmail(
        values.email.trim().toLowerCase(),
        values.username.trim(),
        otp
      );

      toast({
        title: "Registration Successful",
        description: "Please check your email to verify your account",
      });

      // Redirect to OTP verification page
      setLocation(`/verify-email?email=${encodeURIComponent(values.email.trim().toLowerCase())}`);
      
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.message || 'Registration failed. Please try again.';
      setFieldError('submit', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Image */}
      <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-purple-600 to-pink-800">
        <div className="h-full flex items-center justify-center p-12">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Welcome to 786Bet!</h1>
            <p className="text-xl opacity-90">Create your account and start your gaming journey.</p>
          </div>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 flex-col">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link href="/">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">786</span>
              </div>
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
          <Formik
            initialValues={{
              username: '',
              email: '',
              password: '',
              confirmPassword: '',
              referralCode: '',
            }}
            validationSchema={registerSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, isSubmitting, touched }) => (
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
                  <Label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Username
                  </Label>
                  <div className="mt-1">
                    <Field
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-800 dark:text-white text-gray-900"
                      placeholder="Choose a username"
                    />
                    <ErrorMessage name="username" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                </div>

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
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-800 dark:text-white text-gray-900"
                      placeholder="Enter your email"
                    />
                    <ErrorMessage name="email" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </Label>
                  <div className="mt-1">
                    <div className="relative">
                      <Field
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-800 dark:text-white text-gray-900 pr-10"
                        placeholder="Create a password"
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
                  <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm Password
                  </Label>
                  <div className="mt-1">
                    <div className="relative">
                      <Field
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-800 dark:text-white text-gray-900 pr-10"
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 h-full"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" aria-hidden="true" />
                        ) : (
                          <Eye className="h-5 w-5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    <ErrorMessage name="confirmPassword" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Referral Code (Optional)
                  </Label>
                  <div className="mt-1">
                    <Field
                      id="referralCode"
                      name="referralCode"
                      type="text"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm dark:bg-gray-800 dark:text-white text-gray-900"
                      placeholder="Enter referral code"
                    />
                    <ErrorMessage name="referralCode" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400">
                      Sign in
                    </Link>
                  </p>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
}
