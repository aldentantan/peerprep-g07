import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useState } from "react";

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          {/* Success State */}
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
              <p className="text-gray-600 text-sm">
                We've sent password reset instructions to <strong>{email}</strong>
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <p>Didn't receive the email? Check your spam folder or try again.</p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={onNavigateToLogin}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
              
              <Button 
                onClick={() => setIsSubmitted(false)}
                variant="outline"
                className="w-full border-2 border-gray-300 h-11"
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Back to Login Button */}
        <button 
          onClick={onNavigateToLogin}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>

        {/* Form Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-gray-600 text-sm">
            Enter your email address and we'll send you instructions to reset your password
          </p>
        </div>

        {/* Email Field */}
        <div className="space-y-2 mb-6">
          <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
          <Input 
            id="email" 
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 border-gray-300"
          />
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={!email}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 text-base font-semibold mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail className="mr-2 h-4 w-4" />
          Send Reset Link
        </Button>

        {/* Info Box */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
          <p>Remember your password?{" "}
            <button 
              onClick={onNavigateToLogin}
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Sign in instead
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
