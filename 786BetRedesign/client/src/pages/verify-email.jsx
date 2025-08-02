import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle, XCircle, Loader2, Shield, Mail, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import emailJSService from "@/services/emailjs.service.js";

export default function VerifyEmail() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState("form"); // 'form', 'loading', 'success', 'error'
  const [message, setMessage] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("success"); // 'success' or 'error'

  useEffect(() => {
    // Check localStorage for verification data
    const verificationData = localStorage.getItem('pendingVerification');
    if (verificationData) {
      const { email } = JSON.parse(verificationData);
      setEmail(email);
      console.log('Loaded verification data:', { email });
    } else {
      // Fallback to URL parameters if localStorage doesn't have data
      const searchParams = new URLSearchParams(window.location.search);
      const emailParam = searchParams.get('email');
      
      if (emailParam) {
        setEmail(emailParam);
      } else {
        setStatus("error");
        setMessage("Missing email. Please request a new verification email.");
      }
    }
  }, [location]);

  
  const handleVerify = async (e) => {
  e.preventDefault();

  if (!otp || !email) {
    setMessage("Please enter the verification code.");
    return;
  }

  setStatus("loading");
  setMessage("");

  try {
    console.log('Verification request:', { email, otp: otp.trim() });

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        otp: otp.trim()
      }),
      credentials: 'include'
    });

    const data = await response.json();

    if (data.success) {
      setStatus("success");
      setMessage(data.message);

      // ✅ Remove old verification data (if any)
      localStorage.removeItem('verificationData');
      localStorage.removeItem('authToken');
      localStorage.removeItem('accessToken');

      // ✅ Redirect after 2 seconds
      setTimeout(() => {
        setLocation('/login');
      }, 2000);

      toast({
        title: "Email Verified",
        description: "Your email has been successfully verified",
        className: "bg-emerald-500/90 border-emerald-400/50 text-white backdrop-blur-sm",
      });
    } else {
      setStatus("error");
      setMessage(data.message || "Verification failed.");
      toast({
        title: "Error",
        description: data.message || "Verification failed",
        variant: "destructive",
        className: "bg-red-500/90 border-red-400/50 text-white backdrop-blur-sm",
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    setStatus("error");
    setMessage(error.response?.data?.message || "Verification failed. Please try again.");
    toast({
      title: "Error",
      description: error.response?.data?.message || "Verification failed",
      variant: "destructive",
      className: "bg-red-500/90 border-red-400/50 text-white backdrop-blur-sm",
    });
  }
};
    
const handleResendVerification = async () => {
  if (!email) {
    console.error('No email available to resend verification');
    toast({
      title: "Error",
      description: "No email address found. Please try registering again.",
      variant: "destructive",
    });
    return;
  }

  console.log('Attempting to resend verification to:', email);
  setResendLoading(true);

  try {
    // ✅ Ask backend to regenerate OTP for the given email
    const response = await api.post('/auth/send-verification', {
      email: email.trim()
    });

    console.log('Resend verification response:', response.data);

    if (response.data.success) {
      const newOtp = response.data?.data?.otp;

      if (!newOtp) {
        throw new Error("No OTP received from backend");
      }

      // ✅ Send the new OTP via EmailJS
      await emailJSService.sendVerificationEmail(email, 'User', newOtp);

      setModalMessage("New verification email sent successfully!");
      setModalType("success");
      setShowModal(true);
    } else {
      setModalMessage(response.data.message || "Failed to resend verification email.");
      setModalType("error");
      setShowModal(true);
    }
  } catch (error) {
    console.error('Error in handleResendVerification:', error);
    const errorMessage = error.response?.data?.message ||
      error.message ||
      "Failed to resend verification email. Please try again later.";

    setModalMessage(errorMessage);
    setModalType("error");
    setShowModal(true);

    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
      className: "bg-red-500/90 border-red-400/50 text-white backdrop-blur-sm",
    });
  } finally {
    setResendLoading(false);
  }
};


  const closeModal = () => {
    setShowModal(false);
    setModalMessage("");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-full max-w-md bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-700 shadow-2xl text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
          <p className="text-gray-300 mb-4">{message}</p>
          <p className="text-sm text-gray-400">Redirecting to login in 3 seconds...</p>
        </div>
      </div>
    );
  }

  if (status === "error" && message.includes("Missing email")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-full max-w-md bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 border border-gray-700 shadow-2xl text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
          <p className="text-gray-300 mb-4">{message}</p>
          <div className="space-y-2">
            <Link href="/login">
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg">
                Go to Login
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm mx-4 border border-gray-700">
            <div className="flex items-center mb-4">
              {modalType === "success" ? (
                <CheckCircle className="w-6 h-6 text-emerald-500 mr-2" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
              )}
              <h3 className={`text-lg font-semibold ${modalType === "success" ? "text-emerald-400" : "text-red-400"}`}>
                {modalType === "success" ? "Success" : "Error"}
              </h3>
            </div>
            
            <p className="text-gray-300 mb-4">{modalMessage}</p>
            
            <Button
              onClick={closeModal}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              Close
            </Button>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleVerify} className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Email Verification
            </h2>
            <p className="mt-2 text-gray-300">
              We've sent a verification code to your email address
            </p>
          </div>
          
          <p className="text-gray-300 mb-6">
            We've sent a verification code to {email}
          </p>
          
          {message && (
            <div className={`p-3 rounded-lg text-center ${
              status === "error" ? "bg-red-900/50 text-red-300" : "bg-emerald-900/50 text-emerald-300"
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="otp" className="text-gray-300">Verification Code</Label>
            <Input
              id="otp"
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              pattern="[0-9]*"
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={status === "loading" || !otp}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Email"
            )}
          </Button>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="text-amber-400 hover:text-amber-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading ? "Resending..." : "Resend verification email"}
            </button>
            
            <Link href="/login">
              <button type="button" className="text-amber-400 hover:text-amber-300 text-sm block w-full">
                Already have an account? Login
              </button>
            </Link>
          </div>
        </form>
        </div>
      {/* </div>/ */}
  
    </>
  );
}
