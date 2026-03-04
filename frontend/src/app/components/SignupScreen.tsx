import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

interface SignupScreenProps {
  onNavigateToLogin: () => void;
}

export function SignupScreen({ onNavigateToLogin }: SignupScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 border-3 border-gray-400 rounded-lg flex items-center justify-center bg-blue-600 text-white font-bold text-2xl">
            &lt;/&gt;
          </div>
          <h1 className="text-3xl font-bold text-gray-900">PeerPrep</h1>
          <p className="text-gray-600 mt-2">Collaborative Coding Platform</p>
        </div>

        {/* Signup Card */}
        <div className="border-4 border-gray-300 rounded-lg p-8 bg-white space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-800">Create Account</h2>
          </div>

          {/* Username Field */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-gray-700">Username</Label>
            <Input 
              id="username" 
              type="text"
              placeholder="Username"
              className="border-2 border-gray-300 h-12"
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700">Email</Label>
            <Input 
              id="email" 
              type="email"
              placeholder="email@example.com"
              className="border-2 border-gray-300 h-12"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700">Password</Label>
            <Input 
              id="password" 
              type="password"
              placeholder="••••••••"
              className="border-2 border-gray-300 h-12"
            />
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-gray-700">Confirm Password</Label>
            <Input 
              id="confirm-password" 
              type="password"
              placeholder="••••••••"
              className="border-2 border-gray-300 h-12"
            />
          </div>

          {/* Signup Button */}
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg"
          >
            Create Account
          </Button>

          {/* Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <Button 
            onClick={onNavigateToLogin}
            variant="outline" 
            className="w-full border-2 border-gray-300 h-12 text-lg"
          >
            Login
          </Button>
        </div>
      </div>
    </div>
  );
}