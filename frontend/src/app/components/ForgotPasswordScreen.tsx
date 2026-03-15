import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useState } from "react";
import { SciFiBackground } from "@/app/components/SciFiBackground";

interface ForgotPasswordScreenProps {
  onNavigateToLogin: () => void;
}

export function ForgotPasswordScreen({ onNavigateToLogin }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4">
        <SciFiBackground />
        <div className="w-full max-w-md bg-[#0f1525]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-8 relative z-10">
          {/* Success State */}
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Check Your Email</h2>
              <p className="text-gray-400 text-sm">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
            </div>

            <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sm text-sky-300">
              <p>Didn't receive the email? Check your spam folder or try again.</p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={onNavigateToLogin}
                className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white h-11"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
              
              <Button 
                onClick={() => setIsSubmitted(false)}
                variant="outline"
                className="w-full border border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 h-11"
              >
                Send Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4">
      <SciFiBackground />
      <div className="w-full max-w-md bg-[#0f1525]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-8 relative z-10">
        {/* Back to Login Button */}
        <button 
          onClick={onNavigateToLogin}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>

        {/* Form Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
          <p className="text-gray-400 text-sm">
            Enter your email address and we'll send you instructions to reset your password
          </p>
        </div>

        {/* Email Field */}
        <div className="space-y-2 mb-6">
          <Label htmlFor="email" className="text-gray-300 font-medium">Email Address</Label>
          <Input 
            id="email" 
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 bg-white/5 border-white/20 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={!email}
          className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white h-11 text-base font-semibold mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail className="mr-2 h-4 w-4" />
          Send Reset Link
        </Button>

        {/* Info Box */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400">
          <p>Remember your password?{" "}
            <button 
              onClick={onNavigateToLogin}
              className="text-sky-400 hover:text-sky-300 font-semibold"
            >
              Sign in instead
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
