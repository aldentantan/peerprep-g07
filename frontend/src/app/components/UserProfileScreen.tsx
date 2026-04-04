import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import {
  User,
  Mail,
  Code,
  Save,
  Shield,
  Crown,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { getProfile, updateProfile } from "@/app/services/authService";
import { getMyAttemptHistory, type AttemptHistoryEntry } from "@/app/services/attemptHistoryService";
import { AttemptHistoryPanel } from "@/app/components/AttemptHistoryPanel";

const formatTimestamp = (timestamp: string) => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
};

export function UserProfileScreen() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [attemptsLoading, setAttemptsLoading] = useState(true);
  const [attempts, setAttempts] = useState<AttemptHistoryEntry[]>([]);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const fetchProfileAndHistory = async () => {
      try {
        const [profile, attemptHistory] = await Promise.all([
          getProfile(),
          getMyAttemptHistory(),
        ]);
        setUsername(profile.username);
        setEmail(profile.email);
        setRole(profile.access_role || "user");
        setAttempts(attemptHistory.attempts);
      } catch {
        setError("Failed to load profile");
      } finally {
        setIsLoading(false);
        setAttemptsLoading(false);
      }
    };

    fetchProfileAndHistory();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      await updateProfile(username);
      setSaveMessage("Profile updated successfully!");
    } catch (err: any) {
      setSaveMessage(err.response?.data?.error || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    alert("Account deletion requested. In a real app, this would delete your account.");
    setShowDeleteConfirm(false);
  };

  const totalQuestionsAttempted = useMemo(() => {
    return new Set(attempts.map((attempt) => attempt.question.id)).size;
  }, [attempts]);

  const archivedAttempts = useMemo(() => {
    return attempts.filter((attempt) => attempt.question.archived).length;
  }, [attempts]);

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">User Profile</h1>
            <p className="text-purple-100 text-sm">Manage your account settings and attempt history</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="border-2 border-red-300 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="border-4 border-gray-300 rounded-lg p-6 bg-white space-y-4">
          <div className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto border-4 border-gray-400 rounded-full flex items-center justify-center bg-gray-100">
              <User className="w-16 h-16 text-gray-400" />
            </div>

            <div>
              <Button variant="outline" className="mt-2 border-2 border-gray-300">
                Upload Photo
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t-2 border-gray-200">
            <div className="mt-2 space-y-2">
              {role === "root-admin" && (
                <>
                  <Badge className="bg-red-100 text-red-800 border border-red-300">
                    <Crown className="w-3 h-3 mr-1" />
                    Root Admin
                  </Badge>
                  <div className="text-xs text-gray-600 mt-2">
                    <p className="font-semibold mb-1">Permissions:</p>
                    <ul className="list-disc list-inside space-y-1 text-[11px]">
                      <li>All admin permissions</li>
                      <li>Promote or demote users</li>
                      <li>Manage all accounts</li>
                    </ul>
                  </div>
                </>
              )}
              {role === "admin" && (
                <>
                  <Badge className="bg-purple-100 text-purple-800 border border-purple-300">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                  <div className="text-xs text-gray-600 mt-2">
                    <p className="font-semibold mb-1">Permissions:</p>
                    <ul className="list-disc list-inside space-y-1 text-[11px]">
                      <li>Create, edit, and delete questions</li>
                      <li>View questions</li>
                      <li>Join matching queue</li>
                      <li>Collaborate in sessions</li>
                    </ul>
                  </div>
                </>
              )}
              {role === "user" && (
                <>
                  <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
                    Standard User
                  </Badge>
                  <div className="text-xs text-gray-600 mt-2">
                    <p className="font-semibold mb-1">Permissions:</p>
                    <ul className="list-disc list-inside space-y-1 text-[11px]">
                      <li>View questions</li>
                      <li>Join matching queue</li>
                      <li>Collaborate in sessions</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>

          {role !== "root-admin" && (
            <div className="pt-4 border-t-2 border-gray-200">
              <Button
                variant="outline"
                className="mt-2 border-2 border-red-300 text-red-500"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>

              {showDeleteConfirm && (
                <div className="pt-4 border-t-2 border-gray-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete your account? This action is irreversible.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="border-2 border-gray-300"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleDeleteAccount}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 border-4 border-gray-300 rounded-lg p-6 bg-white space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Profile Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="border-2 border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="pl-10 border-2 border-gray-300 bg-gray-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language" className="text-gray-700">Preferred Language</Label>
              <select
                id="language"
                defaultValue="JavaScript"
                className="w-full h-10 px-3 border-2 border-gray-300 rounded-md bg-white"
              >
                <option>JavaScript</option>
                <option>Python</option>
                <option>Java</option>
                <option>C++</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 flex items-center gap-2">
              <Code className="h-4 w-4" />
              Topics of Interest
            </Label>
            <div className="border-2 border-gray-300 rounded-lg p-4 min-h-[100px]">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="border border-gray-300">Algorithms</Badge>
                <Badge variant="secondary" className="border border-gray-300">Data Structures</Badge>
                <Badge variant="secondary" className="border border-gray-300">Dynamic Programming</Badge>
                <Badge variant="secondary" className="border border-gray-300">System Design</Badge>
                <Button variant="outline" size="sm" className="border-2 border-dashed border-gray-400">
                  + Add Topic
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-gray-200">
            <div className="text-center p-3 border-2 border-gray-300 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{attempts.length}</div>
              <div className="text-xs text-gray-600">Attempts Logged</div>
            </div>
            <div className="text-center p-3 border-2 border-gray-300 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{totalQuestionsAttempted}</div>
              <div className="text-xs text-gray-600">Questions Attempted</div>
            </div>
            <div className="text-center p-3 border-2 border-gray-300 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{archivedAttempts}</div>
              <div className="text-xs text-gray-600">Archived Snapshots</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="text-sm text-gray-600">Latest Activity</div>
              <div className="text-sm font-semibold text-gray-900">
                {attempts[0] ? formatTimestamp(attempts[0].submittedAt) : "No attempts yet"}
              </div>
            </div>
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="text-sm text-gray-600">Code Snapshots Saved</div>
              <div className="text-2xl font-bold text-gray-900">{attempts.length}</div>
            </div>
          </div>

          {saveMessage && (
            <p className={`text-sm ${saveMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
              {saveMessage}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className="border-2 border-gray-300">
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      <AttemptHistoryPanel
        attempts={attempts}
        attemptsLoading={attemptsLoading}
        title="Attempt History"
        emptyMessage="No attempts recorded yet. Your saved collaboration submissions will appear here."
      />
    </div>
  );
}
