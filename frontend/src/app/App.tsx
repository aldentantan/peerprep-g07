import { useState, useEffect, useRef } from "react";
import { Route, Routes } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import {
  User,
  Users,
  BookOpen,
  Menu,
  X,
  Shield
} from "lucide-react";
import { LoginScreen } from "@/app/components/LoginScreen";
import { SignupScreen } from "@/app/components/SignupScreen";
import { ForgotPasswordScreen } from "@/app/components/ForgotPasswordScreen";
import { UserProfileScreen } from "@/app/components/UserProfileScreen";
import { MatchingDashboard } from "@/app/components/MatchingDashboard";
import { QuestionLibrary } from "@/app/components/QuestionLibrary";
import { AddQuestionScreen } from "@/app/components/AddQuestionScreen";
import { EditQuestionScreen } from "@/app/components/EditQuestionScreen";
import { CollaborationWorkspace } from "@/app/components/collaboration_page/CollaborationWorkspace";
import { SoloWorkspace } from "@/app/components/SoloWorkspace";
import { AdminPanel } from "@/app/components/AdminPanel";
import { SciFiBackground } from "@/app/components/SciFiBackground";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { isAuthenticated, logout, getProfile } from "@/app/services/authService";
import { Question } from "./services/questionService";

type Screen = "login" | "signup" | "forgotPassword" | "profile" | "matching" | "questions" | "addQuestion" | "editQuestion" | "solo" | "admin";

function MainAppPage() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("user");
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const isMatchingRef = useRef(false);
  const [showNavConfirm, setShowNavConfirm] = useState(false);
  const pendingScreenRef = useRef<Screen | null>(null);

  // Check auth state on mount
  useEffect(() => {
    if (isAuthenticated()) {
      setIsLoggedIn(true);
      setCurrentScreen("matching");
      getProfile().then(profile => {
        setUserRole(profile.access_role || "user");
      }).catch(() => {});
    }
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentScreen("matching");
    getProfile().then(profile => {
      setUserRole(profile.access_role || "user");
    }).catch(() => {});
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setUserRole("user");
    setCurrentScreen("login");
  };

  const handleMatchingStateChange = (isSearching: boolean) => {
    isMatchingRef.current = isSearching;
  };

  const navigateTo = (screen: Screen) => {
    if (isMatchingRef.current && screen !== "matching") {
      pendingScreenRef.current = screen;
      setShowNavConfirm(true);
      return;
    }
    setCurrentScreen(screen);
  };

  const confirmNavigation = () => {
    isMatchingRef.current = false;
    if (pendingScreenRef.current) {
      setCurrentScreen(pendingScreenRef.current);
      pendingScreenRef.current = null;
    }
    setShowNavConfirm(false);
  };

  const cancelNavigation = () => {
    pendingScreenRef.current = null;
    setShowNavConfirm(false);
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
    ...(userRole === "admin" || userRole === "root-admin" ? [{ id: "questions" as Screen, label: "Question Library", icon: BookOpen }] : []),
    { id: "profile" as Screen, label: "Profile", icon: User },
    ...(userRole === "root-admin" ? [{ id: "admin" as Screen, label: "User Management", icon: Shield }] : []),
  ];

  return (
    <div className="relative min-h-screen">
      <SciFiBackground />
      {/* Top Navigation Bar */}
      <nav className="border-b border-white/10 bg-[#0f1525]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-sky-400/50 rounded-lg flex items-center justify-center bg-sky-500/20 text-sky-300 font-bold text-lg">
                &lt;/&gt;
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">PeerPrep</h1>
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
                    onClick={() => navigateTo(item.id)}
                    className={
                      currentScreen === item.id
                        ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                        : "text-gray-400 hover:bg-white/10 hover:text-white"
                    }
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}              <Button
                variant="outline"
                onClick={handleLogout}
                className="ml-2 border border-white/20 text-black hover:bg-white/10"
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
              <div className="md:hidden py-4 border-t border-white/10">
              <div className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant={currentScreen === item.id ? "default" : "ghost"}
                      onClick={() => {
                        navigateTo(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full justify-start ${
                        currentScreen === item.id
                          ? "bg-sky-500/20 text-sky-300"
                          : "text-gray-400 hover:text-white"
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {currentScreen === "profile" && <UserProfileScreen />}
        {currentScreen === "matching" && <MatchingDashboard onMatchingStateChange={handleMatchingStateChange} />}
        {currentScreen === "questions" && (userRole === "admin" || userRole === "root-admin") && <QuestionLibrary onStartSession={() => setCurrentScreen("solo")} onNavigateToAddQuestion={() => setCurrentScreen("addQuestion")} onNavigateToEditQuestion={(q) => { setEditingQuestion(q); setCurrentScreen("editQuestion"); }} />}
        {currentScreen === "addQuestion" && (userRole === "admin" || userRole === "root-admin") && <AddQuestionScreen onBack={() => setCurrentScreen("questions")} />}
        {currentScreen === "editQuestion" && (userRole === "admin" || userRole === "root-admin") && editingQuestion && <EditQuestionScreen question={editingQuestion} onBack={() => setCurrentScreen("questions")} />}
        {currentScreen === "solo" && <SoloWorkspace onBackToLibrary={() => setCurrentScreen("questions")} />}
        {currentScreen === "admin" && userRole === "root-admin" && <AdminPanel />}
      </main>

      {/* Navigation confirmation dialog when matching is active */}
      <AlertDialog open={showNavConfirm} onOpenChange={(open) => { if (!open) cancelNavigation(); }}>
        <AlertDialogContent className="bg-[#0f1525] border border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Leave Matching?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              You are currently searching for a match. Leaving this page will cancel your match request. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelNavigation} className="border-white/20 text-black hover:bg-white/10">
              Stay
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmNavigation} className="bg-red-600 hover:bg-red-700 text-white">
              Leave &amp; Cancel Match
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CollaborationPage() {

  return (
    <div className="relative min-h-screen">
      <SciFiBackground />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <CollaborationWorkspace />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainAppPage />} />
      <Route path="/collaboration" element={<CollaborationPage />} />
    </Routes>
  );
}