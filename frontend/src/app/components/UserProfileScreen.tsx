import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { User, Mail, Award, Code, Save, Shield, Lock, Crown, Trash2, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { getProfile, updateProfile, changePassword, deleteAccount } from "@/app/services/authService";

export function UserProfileScreen() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await getProfile();
        setUsername(profile.username);
        setEmail(profile.email);
        setRole(profile.access_role || "user");
      } catch (err: any) {
        setError("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
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
    deleteAccount();
    setShowDeleteConfirm(false);
    // refresh page to trigger logout and redirect to login screen
    window.location.reload();

  };

  const handleChangePassword = async () => {
    setIsSaving(true);
    setPasswordMessage("");
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordMessage("Please fill in all password fields");
      setIsSaving(false);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage("New passwords do not match");
      setIsSaving(false);
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage("Password changed successfully!");
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setPasswordMessage(err.response?.data?.error || "Failed to change password");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">User Profile</h1>
            <p className="text-purple-100 text-sm">Manage your account settings</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="border-4 border-gray-300 rounded-lg p-6 bg-white space-y-4">
          <div className="text-center space-y-4">
            {/* Avatar Placeholder */}
            <div className="w-32 h-32 mx-auto border-4 border-gray-400 rounded-full flex items-center justify-center bg-gray-100">
              <User className="w-16 h-16 text-gray-400" />
            </div>
            
            <div>
              <Button variant="outline" className="mt-2 border-2 border-gray-300">
                Upload Photo
              </Button>
            </div>
          </div>

          {/* Role Badge */}
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
                      <li>Promote/demote users</li>
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
                      <li>Create/edit/delete questions</li>
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

          {/* Delete Account Button - hidden for root-admin */}
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

              {/* Delete Confirmation */}
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

        {/* Profile Details */}
        <div className="lg:col-span-2 border-4 border-gray-300 rounded-lg p-6 bg-white space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Profile Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700">Username</Label>
              <Input 
                id="username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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

          </div>

          {/* Change Password Section */}
          <div className="pt-4 border-t-2 border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Change Password</h2>
              <Button
                variant="outline"
                className="border-2 border-gray-300"
                onClick={() => setIsChangingPassword(!isChangingPassword)}
              >
                {isChangingPassword ? "Cancel" : "Change Password"}
              </Button>
            </div>

            {isChangingPassword && (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-gray-700">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      id="current-password" 
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10 border-2 border-gray-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-gray-700">New Password</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      id="new-password" 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 border-2 border-gray-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password" className="text-gray-700">Confirm New Password</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      id="confirm-new-password" 
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="pl-10 border-2 border-gray-300"
                    />
                  </div>
                </div>

                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleChangePassword}
                  disabled={isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save New Password'}
                </Button>

                {passwordMessage && (
                  <p className={`text-sm ${passwordMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-gray-200">
            <div className="text-center p-3 border-2 border-gray-300 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">24</div>
              <div className="text-xs text-gray-600">Sessions</div>
            </div>
            <div className="text-center p-3 border-2 border-gray-300 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">18</div>
              <div className="text-xs text-gray-600">Problems Solved</div>
            </div>
            <div className="text-center p-3 border-2 border-gray-300 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">92%</div>
              <div className="text-xs text-gray-600">Match Success</div>
            </div>
          </div>

          {saveMessage && (
            <p className={`text-sm ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className="border-2 border-gray-300">
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}