import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Users, Code2, Sparkles } from "lucide-react";
import { useState } from "react";
import { login } from "@/app/services/authService";
import { SciFiBackground } from "@/app/components/SciFiBackground";

interface LoginScreenProps {
  onNavigateToSignup: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToForgotPassword: () => void;
}

export function LoginScreen({
  onNavigateToSignup,
  onNavigateToDashboard,
  onNavigateToForgotPassword,
}: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setError("");
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setIsLoading(true);
    try {
      await login({ email, password });
      onNavigateToDashboard();
    } catch (err: { response?: { data?: { error?: string }; status?: number } }) {
      const msg = err.response?.data?.error;
      if (err.response?.status === 401) {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(msg || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="relative min-h-screen flex overflow-hidden">
      <SciFiBackground />

      {/* Left Side - Marketing Content */}
      <div className="flex-1 flex flex-col justify-center pl-12 lg:pl-36 pr-4 lg:pr-8 py-12 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 border-2 border-sky-400/50 rounded-lg flex items-center justify-center bg-sky-500/20 text-sky-300 font-bold text-lg shadow-[0_0_15px_rgba(56,189,248,0.3)]">
            &lt;/&gt;
          </div>
          <span className="text-xl font-bold text-white">
            PeerPrep
          </span>
        </div>

        {/* Hero Text */}
        <div className="max-w-xl mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">
            Practice Coding
          </h1>
          <h1 className="text-5xl font-bold text-sky-400 mb-6">
            With Peers
          </h1>
          <p className="text-lg text-gray-300">
            Get matched with fellow developers, solve coding
            problems together, and ace your technical
            interviews.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-6 max-w-xl">

          {/* Real-Time Matching */}
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-sky-500/20 border border-sky-500/30 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(56,189,248,0.15)]">
              <Users className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">
                Real-Time Matching
              </h3>
              <p className="text-gray-400 text-sm">
                Get paired with peers based on{" "}
                <span className="text-sky-400">
                  difficulty level
                </span>{" "}
                and{" "}
                <span className="text-sky-400">shared topic</span>{" "}
                you want to practice
              </p>
            </div>
          </div>

          {/* Collaborative Coding */}
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-violet-500/20 border border-violet-500/30 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.15)]">
              <Code2 className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">
                Collaborative Coding
              </h3>
              <p className="text-gray-400 text-sm">
                Work together in a <span className="text-sky-400"> shared </span> coding environment to solve problems in real-time
              </p>
            </div>
          </div>

          {/* Curated Questions */}
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
              <Sparkles className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">
                Curated Questions
              </h3>
              <p className="text-gray-400 text-sm">
                Access easy, medium, and hard problems across{" "}
                <span className="text-sky-400">
                  multiple topics
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 relative z-10">
        <div className="w-full max-w-md bg-[#0f1525]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(56,189,248,0.06)] p-8">
          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-400 text-sm">
              Enter your credentials to access your account
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSignIn(); }}>
          {/* Email Field */}
          <div className="space-y-2 mb-4">
            <Label
              htmlFor="email"
              className="text-gray-300 font-medium"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="h-11 bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-sky-400/60"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2 mb-4">
            <Label
              htmlFor="password"
              className="text-gray-300 font-medium"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="h-11 bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-sky-400/60"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <label
                htmlFor="remember"
                className="text-sm text-gray-400 cursor-pointer"
              >
                Remember me
              </label>
            </div>
            <button
              type="button"
              onClick={onNavigateToForgotPassword}
              className="text-sm text-sky-400 hover:text-sky-300 font-medium"
            >
              Forgot password?
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Sign In Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white h-11 text-base font-semibold mb-6 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <button
              onClick={onNavigateToSignup}
              className="text-sky-400 hover:text-sky-300 font-semibold"
            >
              Create one
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}