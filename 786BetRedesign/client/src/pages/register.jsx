import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, UserPlus, ArrowLeft, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import emailJSService from "@/services/emailjs.service";
import { useAuth } from "@/contexts/AuthContext";

export default function Register() {
  const [, setLocation] = useLocation();
  const { register, isLoading } = useAuth();
  const { toast } = useToast();

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
      console.log('Submitting registration form with values:', values);
      
      // Register user with backend - backend will generate OTP
      const response = await api.post('/auth/register', {
        username: values.username.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        referralCode: values.referralCode?.trim().toUpperCase() || null
      });

      console.log('Registration response:', response.data);

      if (response.data.success) {
        const { userId, email, otp } = response.data.data;
        
        // Send verification email using frontend emailjs with actual OTP from backend
        await emailJSService.sendVerificationEmail(
          email,
          values.username.trim(),
          otp,
          null
        );

        toast({
          title: "Registration Successful",
          description: "Please check your email to verify your account",
          className: "bg-emerald-500/90 border-emerald-400/50 text-white backdrop-blur-sm",
        });

        // Store verification data in localStorage for verify-email page
        localStorage.setItem('verificationData', JSON.stringify({
          email: email,
          otp: otp,
          userId: userId
        }));
        
        // Redirect to OTP verification page
        setLocation(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', {
        message: error.response?.data?.message,
        status: error.response?.status,
        data: error.response?.data,
        error: error.message
      });
      
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || 'Registration failed. Please try again.';
      
      // Handle specific error types
      if (errorData?.field === 'email' || errorMessage.includes('email')) {
        setFieldError('email', errorMessage);
      } else if (errorData?.field === 'username' || errorMessage.includes('username')) {
        setFieldError('username', errorMessage);
      } else if (errorData?.field === 'referralCode' || errorMessage.includes('referral')) {
        setFieldError('referralCode', errorMessage);
      } else {
        setFieldError('email', errorMessage);
      }
      
      toast({
        title: "Registration Error",
        description: errorMessage,
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
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Create Account
          </h2>
          <p className="mt-2 text-gray-300">
            Join 786Bet and start your gaming journey
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
          {({ errors, touched, isSubmitting }) => (
            <Form className="space-y-6">
              <div>
                <Label htmlFor="username" className="block text-sm font-medium text-gray-200 mb-2">
                  Username
                </Label>
                <Field
                  as={Input}
                  type="text"
                  name="username"
                  id="username"
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <ErrorMessage name="username" component="div" className="text-red-400 text-sm mt-1" />
              </div>

              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                  Email Address
                </Label>
                <Field
                  as={Input}
                  type="email"
                  name="email"
                  id="email"
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <ErrorMessage name="email" component="div" className="text-red-400 text-sm mt-1" />
              </div>
              <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                  Password
                </Label>
              <PasswordField errors={errors} touched={touched} />
              </div>
              <div>
              <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-2">
                  Confirm Password
                </Label>
              <ConfirmPasswordField errors={errors} touched={touched} />
              </div>  
              <div>
                <Label htmlFor="referralCode" className="block text-sm font-medium text-gray-200 mb-2">
                  Referral Code (Optional)
                </Label>
                <Field
                  as={Input}
                  type="text"
                  name="referralCode"
                  id="referralCode"
                  placeholder="Enter referral code"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <ErrorMessage name="referralCode" component="div" className="text-red-400 text-sm mt-1" />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                <p className="text-sm text-gray-300">
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300 transition-colors duration-200">
                    Sign in here
                  </Link>
                </p>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}

function PasswordField({ errors, touched }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div>
      <div className="relative">
        <Field
          as={Input}
          type={showPassword ? "text" : "password"}
          name="password"
          id="password"
          placeholder="Create a password"
          className={`w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 pr-10 ${
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
}

  function ConfirmPasswordField({ errors, touched }) {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div>
        <div className="relative">
          <Field
            as={Input}
            type={showPassword ? "text" : "password"}
            name="confirmPassword"
            id="confirmPassword"
            placeholder="Confirm your password"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
        <ErrorMessage name="confirmPassword" component="div" className="text-red-400 text-sm mt-1" />
      </div>
    );
  }