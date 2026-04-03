import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useState } from "react";
import { signup } from "@/app/services/authService";
import { SciFiBackground } from "@/app/components/SciFiBackground";

interface SignupScreenProps {
  onNavigateToLogin: () => void;
}

export function SignupScreen({ onNavigateToLogin }: SignupScreenProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateAccount = async () => {
    setError("");
    if (!username || !email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsLoading(true);
    try {
      await signup({ email, username, password });
      onNavigateToLogin();
    } catch (err: { response?: { data?: { error?: string } } }) {
      setError(err.response?.data?.error || "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4">
      <SciFiBackground />
      <div className="w-full max-w-md relative z-10">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 border-2 border-sky-400/50 rounded-lg flex items-center justify-center bg-sky-500/20 text-sky-300 font-bold text-2xl shadow-[0_0_15px_rgba(56,189,248,0.3)]">
            &lt;/&gt;
          </div>
          <h1 className="text-3xl font-bold text-white">PeerPrep</h1>
          <p className="text-gray-400 mt-2">Collaborative Coding Platform</p>
        </div>

        {/* Signup Card */}
        <div className="border border-white/10 rounded-lg p-8 bg-[#0f1525]/80 backdrop-blur-xl space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white">Create Account</h2>
          </div>

          {/* Username Field */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-gray-300">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Username"
              className="border border-white/20 bg-white/5 text-white placeholder:text-gray-500 h-12"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              className="border border-white/20 bg-white/5 text-white placeholder:text-gray-500 h-12"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="border border-white/20 bg-white/5 text-white placeholder:text-gray-500 h-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-gray-300">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              className="border border-white/20 bg-white/5 text-white placeholder:text-gray-500 h-12"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Signup Button */}
          <Button
            onClick={handleCreateAccount}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white h-12 text-lg"
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>

          {/* Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#0f1525] text-gray-500">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <Button
            onClick={onNavigateToLogin}
            variant="outline"
            className="w-full border border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 h-12 text-lg"
          >
            Login
          </Button>
        </div>
      </div>
    </div>
  );
}