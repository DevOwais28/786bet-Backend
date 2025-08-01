import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import emailJSService from '@/services/emailjs.service';

const forgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
});

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSubmit = async (values, { setSubmitting, setErrors }) => {
    try {
      // First check if email exists
      const checkResponse = await api.post('/auth/check-email', { email: values.email });
      
      if (!checkResponse.data.exists) {
        setErrors({ email: 'No account found with this email address' });
        return;
      }

      // Get reset token from backend
      const response = await api.post('/auth/forgot-password', { 
        email: values.email 
      });
      
      if (response.data.success) {
        // Send password reset email via frontend emailjs
        await emailJSService.sendPasswordResetEmail(
          values.email, 
          response.data.data.resetToken
        );
        
        toast({
          title: "Email Sent",
          description: `Password reset instructions have been sent to ${values.email}`,
          className: "bg-blue-500/90 border-blue-400/50 text-white backdrop-blur-sm",
        });
        
        setIsSubmitted(true);
        setSubmittedEmail(values.email);
        
        // Redirect to login after 5 seconds
        setTimeout(() => {
          setLocation('/login');
        }, 5000);
      } else {
        throw new Error(response.data.message || 'Failed to process password reset');
      }
      
    } catch (error) {
      console.error('Forgot password error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Failed to process password reset",
        variant: "destructive",
        className: "bg-red-500/90 border-red-400/50 text-white backdrop-blur-sm",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Reset Password
          </h2>
          <p className="mt-2 text-gray-300">
            Enter your email to receive reset instructions
          </p>
          <Link href="/login" className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-500/20 p-4 rounded-full">
              <Mail className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          {isSubmitted ? (
            <div className="text-center">
              <div className="bg-emerald-600/20 border border-emerald-600 rounded-lg p-6 mb-4">
                <h3 className="text-xl font-bold text-emerald-400 mb-2">Check Your Email</h3>
                <p className="text-gray-300 mb-4">
                  We've sent password reset instructions to <span className="font-semibold text-white">{submittedEmail || 'your email'}</span>
                </p>
                <p className="text-sm text-gray-400">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button 
                    type="button" 
                    className="text-blue-400 hover:text-blue-300"
                    onClick={() => {
                      setIsSubmitted(false);
                    }}
                  >
                    try again
                  </button>
                </p>
              </div>
              <p className="text-sm text-gray-400">
                Redirecting to login in 5 seconds...
              </p>
            </div>
          ) : (
            <Formik
              initialValues={{ email: '' }}
              validationSchema={forgotPasswordSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, errors, touched }) => (
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
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="your@email.com"
                    />
                    <ErrorMessage name="email" component="div" className="text-red-400 text-sm mt-1" />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Instructions'
                    )}
                  </Button>
                </Form>
              )}
            </Formik>
          )}

          <p className="text-center mt-6 text-gray-400">
            Remember your password?{' '}
            <Link href="/login" className="text-emerald-500 hover:text-emerald-400">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
