"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  EnvelopeIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false); // Track success state

  const router = useRouter();

  // Countdown before redirect (optional UX polish)
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push("/auth/login");
      }, 4000); // Redirect after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [success, router]);

  const validateEmail = (email) => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email.trim());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      toast.error("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      toast.error("Invalid email format");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);

      toast.success("Password reset link sent successfully!", {
        icon: <CheckCircleIcon className="h-6 w-6 text-green-600" />,
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="grid lg:grid-cols-2 items-stretch">
          {/* Left Side - Form */}
          <div className="p-8 lg:p-12 flex items-center">
            <form
              className="max-w-md mx-auto w-full space-y-8"
              onSubmit={handleSubmit}
              noValidate
            >
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {success ? "Check Your Email" : "Forgot Password?"}
                </h1>
                <p className="mt-4 text-gray-600 text-sm lg:text-base leading-relaxed">
                  {success
                    ? `We've sent a password reset link to ${email}. Please check your inbox (and spam folder).`
                    : "No worries! Enter your registered email below and we'll send you a link to reset your password."}
                </p>
              </div>

              {!success && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        disabled={isLoading}
                        placeholder="e.g. member@pcea.or.ke"
                        className={`w-full pl-11 pr-4 py-3.5 rounded-lg border transition-all outline-none text-sm lg:text-base ${
                          error
                            ? "border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                            : "border-gray-300 focus:border-[#0D47A1] focus:ring-4 focus:ring-[#0D47A1]/20"
                        } ${
                          isLoading
                            ? "bg-gray-50 cursor-not-allowed"
                            : "bg-white"
                        }`}
                      />
                      <EnvelopeIcon className="absolute left-4 top-4 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>

                    {error && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <ExclamationCircleIcon className="h-4 w-4" />
                        {error}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Success State UI */}
              {success && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircleIcon className="h-10 w-10 text-green-600" />
                  </div>
                  <p className="text-sm lg:text-base text-gray-600">
                    You will be redirected to the login page shortly...
                  </p>
                  <button
                    onClick={() => router.push("/auth/login")}
                    className="mt-6 text-[#0D47A1] font-medium hover:underline text-sm lg:text-base"
                  >
                    Go to Login Now →
                  </button>
                </div>
              )}

              {/* Submit Button - Only show when not success */}
              {!success && (
                <div className="space-y-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3.5 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-3 text-sm lg:text-base ${
                      isLoading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-[#0D47A1] hover:bg-[#0D47A1]/90 shadow-lg hover:shadow-xl"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Sending Link...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>

                  <p className="text-center text-sm lg:text-base text-gray-600">
                    Remember your password?{" "}
                    <Link
                      href="/auth/login"
                      className="font-medium text-[#0D47A1] hover:underline"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>
              )}

              {/* Dev Helper */}
              {!success && (
                <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <p className="font-bold">Dev Tip:</p>
                  <p>
                    Use: <strong>admin@pcea.or.ke</strong> or{" "}
                    <strong>member@pcea.or.ke</strong>
                  </p>
                </div>
              )}
            </form>
          </div>

          {/* Right Side - Image */}
          <div className="hidden lg:block relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0D47A1]/70 to-blue-600/50 z-10" />
            <Image
              src="/forgot-password.jpg"
              alt="Secure password recovery"
              width={800}
              height={1000}
              className="w-full h-full object-cover"
              priority
            />
            <div className="absolute bottom-10 left-10 z-20 text-white">
              <h3 className="text-2xl font-bold">Secure & Simple Recovery</h3>
              <p className="text-sm opacity-90 mt-2">
                Get back to your account in seconds
              </p>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={4000} theme="light" />
    </div>
  );
}
