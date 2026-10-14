import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "../store/useAuthStore.js";
import AuthImagePattern from "../components/AuthImagePattern.jsx";
import { Mail, KeyRound, Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword, resetPassword, isSendingOtp, isResettingPassword } = useAuthStore();

  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter OTP and new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState(null);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      return toast.error("Please enter your email address");
    }

    const res = await forgotPassword(email.trim());
    if (res.success) {
      if (res.devOtp) {
        setSimulatedOtp(res.devOtp);
      }
      setStep(2);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!otp.trim()) {
      return toast.error("Please enter the 6-digit verification code");
    }
    if (otp.trim().length !== 6) {
      return toast.error("Verification code must be 6 digits");
    }
    if (!newPassword) {
      return toast.error("Please enter a new password");
    }
    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters long");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

    const res = await resetPassword({
      email: email.trim(),
      otp: otp.trim(),
      newPassword,
    });

    if (res.success) {
      setTimeout(() => {
        navigate("/login");
      }, 1200);
    }
  };

  return (
    <div className="h-screen grid lg:grid-cols-2">
      {/* Left Side - Form */}
      <AuthImagePattern
        title={step === 1 ? "Forgot your password?" : "Verify & Reset"}
        subtitle={
          step === 1
            ? "Don't worry! Enter your registered email address and we'll send you a verification code."
            : "Enter the verification code sent to your email and set your new password."
        }
      />

      {/* Right Side - Interactive Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                {step === 1 ? (
                  <KeyRound className="w-6 h-6 text-primary" />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-primary" />
                )}
              </div>
              <h1 className="text-2xl font-bold mt-2">
                {step === 1 ? "Reset Password" : "Enter Verification Code"}
              </h1>
              <p className="text-base-content/60 text-sm">
                {step === 1
                  ? "Verify your email to create a new password"
                  : `Verification code sent to ${email}`}
              </p>
            </div>
          </div>

          {/* Dev Simulation Banner */}
          {step === 2 && simulatedOtp && (
            <div className="alert alert-info py-3 px-4 rounded-xl text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>
                  <strong>Dev Mode Code:</strong> <span className="font-mono text-sm tracking-wider font-bold">{simulatedOtp}</span>
                </span>
              </div>
              <button
                type="button"
                className="btn btn-xs btn-ghost underline"
                onClick={() => setOtp(simulatedOtp)}
              >
                Auto-fill
              </button>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: Enter Email */
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Registered Email</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Mail className="h-5 w-5 text-base-content/40" />
                  </div>
                  <input
                    type="email"
                    className="input input-bordered w-full pl-10"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={isSendingOtp}
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-base-content/60 hover:text-primary transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          ) : (
            /* STEP 2: Enter OTP & New Password */
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* OTP Field */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">6-Digit Verification Code</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <KeyRound className="h-5 w-5 text-base-content/40" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    className="input input-bordered w-full pl-10 font-mono tracking-widest text-center text-lg font-semibold"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">New Password</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-base-content/40" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input input-bordered w-full pl-10 pr-10"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-base-content/40" />
                    ) : (
                      <Eye className="h-5 w-5 text-base-content/40" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Confirm New Password</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-base-content/40" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="input input-bordered w-full pl-10 pr-10"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-base-content/40" />
                    ) : (
                      <Eye className="h-5 w-5 text-base-content/40" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full mt-2"
                disabled={isResettingPassword}
              >
                {isResettingPassword ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  className="link link-hover text-base-content/60"
                  onClick={() => {
                    setStep(1);
                    setOtp("");
                    setSimulatedOtp(null);
                  }}
                >
                  ← Change email
                </button>

                <button
                  type="button"
                  className="link link-primary"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                >
                  Resend Code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

