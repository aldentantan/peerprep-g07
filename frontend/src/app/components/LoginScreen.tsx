import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Users, Code2, Sparkles } from "lucide-react";

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
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      {/* Left Side - Marketing Content */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-12">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 border-3 border-gray-400 rounded-lg flex items-center justify-center bg-blue-600 text-white font-bold text-lg">
            &lt;/&gt;
          </div>
          <span className="text-xl font-bold text-gray-900">
            PeerPrep
          </span>
        </div>

        {/* Hero Text */}
        <div className="max-w-xl mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">
            Practice Coding
          </h1>
          <h1 className="text-5xl font-bold text-indigo-600 mb-6">
            With Peers
          </h1>
          <p className="text-lg text-gray-600">
            Get matched with fellow developers, solve coding
            problems together, and ace your technical
            interviews.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-6 max-w-xl">
          {/* Real-Time Matching */}
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Real-Time Matching
              </h3>
              <p className="text-gray-600 text-sm">
                Get paired with peers based on{" "}
                <span className="text-indigo-600">
                  difficulty level
                </span>{" "}
                and{" "}
                <span className="text-indigo-600">topics</span>{" "}
                you want to practice
              </p>
            </div>
          </div>

          {/* Collaborative Coding */}
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Code2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Collaborative Coding
              </h3>
              <p className="text-gray-600 text-sm">
                Work together in a shared{" "}
                <span className="text-indigo-600">
                  coding environment
                </span>{" "}
                to solve problems in real-time
              </p>
            </div>
          </div>

          {/* Curated Questions */}
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Curated Questions
              </h3>
              <p className="text-gray-600 text-sm">
                Access easy, medium, and hard problems across{" "}
                <span className="text-indigo-600">
                  multiple topics
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back
            </h2>
            <p className="text-gray-600 text-sm">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Email Field */}
          <div className="space-y-2 mb-4">
            <Label
              htmlFor="email"
              className="text-gray-700 font-medium"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="h-11 border-gray-300"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2 mb-4">
            <Label
              htmlFor="password"
              className="text-gray-700 font-medium"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="h-11 border-gray-300"
            />
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <label
                htmlFor="remember"
                className="text-sm text-gray-700 cursor-pointer"
              >
                Remember me
              </label>
            </div>
            <button
              onClick={onNavigateToForgotPassword}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In Button */}
          <Button
            onClick={onNavigateToDashboard}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11 text-base font-semibold mb-6"
          >
            Sign In
          </Button>

          {/* Sign Up Link */}
          <div className="text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <button
              onClick={onNavigateToSignup}
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Create one
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}