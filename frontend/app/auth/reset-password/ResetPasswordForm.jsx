"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // ← Correct import for App Router
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ResetPasswordForm() {
  const router = useRouter(); // ← Now properly imported and used

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  // Strong password validation
  const validatePassword = (password) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return "Password must contain at least one special character (!@#$%^&* etc.)";
    }
    return "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    // Check empty fields
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in both password fields");
      return;
    }

    // Validate strength
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      toast.error(passwordError);
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      toast.error("Passwords do not match");
      return;
    }

    // Simulate successful password reset
    toast.success("Password reset successfully!");

    // Redirect after user sees the success message
    setTimeout(() => {
      router.push("/auth/login");
    }, 1500); // Gives time to read the toast
  };

  return (
    <div>
      <form
        className="max-w-md mx-auto w-full p-4 md:p-6"
        onSubmit={handleSubmit}
      >
        <div className="mb-8">
          <h1 className="text-gray-800 text-xl lg:text-3xl font-semibold">
            Reset Password
          </h1>
        </div>

        <div className="space-y-6">
          {/* New Password Field */}
          <div>
            <label className="text-slate-900 text-sm lg:text-base font-medium mb-2 block">
              New Password
            </label>
            <div className="relative flex items-center">
              <input
                name="new-password"
                type={showNewPassword ? "text" : "password"}
                required
                className="w-full text-sm lg:text-base text-slate-900 bg-slate-100 focus:bg-transparent pl-4 pr-10 py-3 rounded-md border border-slate-100 focus:border-blue-600 outline-none transition-all"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 text-[#bbb]"
              >
                {showNewPassword ? (
                  <EyeSlashIcon className="w-[18px] h-[18px]" />
                ) : (
                  <EyeIcon className="w-[18px] h-[18px]" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="text-slate-900 text-sm lg:text-base font-medium mb-2 block">
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <input
                name="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                className="w-full text-sm lg:text-base text-slate-900 bg-slate-100 focus:bg-transparent pl-4 pr-10 py-3 rounded-md border border-slate-100 focus:border-blue-600 outline-none transition-all"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 text-[#bbb]"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="w-[18px] h-[18px]" />
                ) : (
                  <EyeIcon className="w-[18px] h-[18px]" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-12">
          <button
            type="submit"
            className="w-full shadow-xl py-2.5 px-4 text-sm lg:text-base tracking-wide font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors"
          >
            Reset Password
          </button>
        </div>
      </form>

      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
}
