import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Shield, CheckCircle } from 'lucide-react';

const otpSchema = Yup.object().shape({
  otp: Yup.string()
    .length(6, 'OTP must be 6 digits')
    .matches(/^[0-9]+$/, 'OTP must be numeric')
    .required('OTP is required'),
});

const AdminOTP = () => {
  const [, setLocation] = useLocation();
  const [adminData, setAdminData] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load admin login data from localStorage
    const storedData = localStorage.getItem('adminLoginData');
    if (storedData) {
      setAdminData(JSON.parse(storedData));
    } else {
      setLocation('/login');
    }
  }, [setLocation]);

  const handleOTPVerification = async (values, { setSubmitting }) => {
    try {
      setIsLoading(true);
      setError('');

      if (!adminData) {
        setError('Session expired. Please login again.');
        return;
      }

      // Check if OTP is correct
      if (values.otp === adminData.otp) {
        // Check if OTP is not expired (5 minutes)
        const loginTime = new Date(adminData.timestamp);
        const currentTime = new Date();
        const timeDiff = (currentTime - loginTime) / 1000 / 60; // minutes

        if (timeDiff > 5) {
          setError('OTP has expired. Please login again.');
          localStorage.removeItem('adminLoginData');
          setTimeout(() => setLocation('/login'), 2000);
          return;
        }

        // Grant admin access
        localStorage.setItem('adminSession', JSON.stringify({
          email: adminData.email,
          loginTime: new Date().toISOString(),
          isAdmin: true,
          verified: true
        }));

        // Clean up admin login data
        localStorage.removeItem('adminLoginData');

        // Redirect to admin dashboard
        setLocation('/admin/dashboard');
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError('Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
      setIsLoading(false);
    }
  };

  const handleResendOTP = () => {
    // Redirect back to login to regenerate OTP
    localStorage.removeItem('adminLoginData');
    setLocation('/login');
  };

  if (!adminData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Admin Verification
          </h2>
          <p className="mt-2 text-gray-300">
            Enter the OTP sent to your admin email
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          <p className="text-sm text-gray-300 mt-2">
            Email: <span className="font-medium">{adminData.email}</span>
          </p>
        </div>

        <div className="mb-6">
          <Link href="/login" className="text-yellow-500 hover:text-emerald-500 transition-colors duration-300 font-medium">
            <ArrowLeft className="w-5 h-5 inline mr-2" />
            Back to Login
          </Link>
        </div>

        <Formik
          initialValues={{ otp: '' }}
          validationSchema={otpSchema}
          onSubmit={handleOTPVerification}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form className="space-y-6">
              <div>
                <Label htmlFor="otp" className="text-white mb-2 block">
                  Verification Code
                </Label>
                <Field
                  as={Input}
                  type="text"
                  name="otp"
                  id="otp"
                  placeholder="123456"
                  maxLength="6"
                  className={`bg-gray-700 border-gray-600 text-white placeholder-gray-400 text-center text-2xl tracking-widest ${
                    errors.otp && touched.otp ? 'border-red-500' : ''
                  }`}
                />
                <ErrorMessage name="otp" component="div" className="text-red-400 text-sm mt-1" />
              </div>

              {error && (
                <div className="text-red-400 text-sm text-center">{error}</div>
              )}

              <div className="text-sm text-gray-400 text-center">
                <p>Didn't receive the code?</p>
                <button
                  type="button"
                  className="text-emerald-500 hover:text-emerald-400 underline"
                  onClick={handleResendOTP}
                >
                  Resend OTP
                </button>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting || isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify & Login
                  </>
                )}
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default AdminOTP;
