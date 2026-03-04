import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { 
  User, 
  Users, 
  BookOpen, 
  Code2, 
  Menu,
  Home,
  ArrowRight,
  X
} from "lucide-react";
import { LoginScreen } from "@/app/components/LoginScreen";
import { SignupScreen } from "@/app/components/SignupScreen";
import { ForgotPasswordScreen } from "@/app/components/ForgotPasswordScreen";
import { UserProfileScreen } from "@/app/components/UserProfileScreen";
import { MatchingDashboard } from "@/app/components/MatchingDashboard";
import { QuestionLibrary } from "@/app/components/QuestionLibrary";
import { AddQuestionScreen } from "@/app/components/AddQuestionScreen";
import { CollaborationWorkspace } from "@/app/components/CollaborationWorkspace";
import { SoloWorkspace } from "@/app/components/SoloWorkspace";

type Screen = "login" | "signup" | "forgotPassword" | "profile" | "matching" | "questions" | "addQuestion" | "collaboration" | "solo";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentScreen("matching");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentScreen("login");
  };

  // Show login or signup screen if not logged in
  if (!isLoggedIn) {
    if (currentScreen === "signup") {
      return <SignupScreen onNavigateToLogin={() => setCurrentScreen("login")} />;
    }
    if (currentScreen === "forgotPassword") {
      return <ForgotPasswordScreen onNavigateToLogin={() => setCurrentScreen("login")} />;
    }
    return <LoginScreen onNavigateToSignup={() => setCurrentScreen("signup")} onNavigateToForgotPassword={() => setCurrentScreen("forgotPassword")} onNavigateToDashboard={handleLogin} />;
  }

  const navigationItems = [
    { id: "matching" as Screen, label: "Match Dashboard", icon: Users },
    { id: "questions" as Screen, label: "Question Library", icon: BookOpen },
    { id: "collaboration" as Screen, label: "Collaboration", icon: Code2 },
    { id: "profile" as Screen, label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="border-b-4 border-gray-300 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-3 border-gray-400 rounded-lg flex items-center justify-center bg-blue-600 text-white font-bold text-lg">
                &lt;/&gt;
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">PeerPrep</h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={currentScreen === item.id ? "default" : "ghost"}
                    onClick={() => setCurrentScreen(item.id)}
                    className={
                      currentScreen === item.id 
                        ? "bg-blue-600 text-white" 
                        : "text-gray-700 hover:bg-gray-100"
                    }
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="ml-2 border-2 border-gray-300"
              >
                Logout
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t-2 border-gray-200">
              <div className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant={currentScreen === item.id ? "default" : "ghost"}
                      onClick={() => {
                        setCurrentScreen(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full justify-start ${
                        currentScreen === item.id 
                          ? "bg-blue-600 text-white" 
                          : "text-gray-700"
                      }`}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentScreen === "profile" && <UserProfileScreen />}
        {currentScreen === "matching" && <MatchingDashboard onNavigateToCollaboration={() => setCurrentScreen("collaboration")} />}
        {currentScreen === "questions" && <QuestionLibrary onStartSession={() => setCurrentScreen("solo")} onNavigateToAddQuestion={() => setCurrentScreen("addQuestion")} />}
        {currentScreen === "addQuestion" && <AddQuestionScreen onBack={() => setCurrentScreen("questions")} />}
        {currentScreen === "collaboration" && <CollaborationWorkspace onLeaveSession={() => setCurrentScreen("matching")} />}
        {currentScreen === "solo" && <SoloWorkspace onBackToLibrary={() => setCurrentScreen("questions")} />}
      </main>
    </div>
  );
}