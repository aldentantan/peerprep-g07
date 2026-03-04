import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { User, Mail, Award, Code, Save, Shield, Lock, Crown, Trash2, AlertTriangle } from "lucide-react";
import { useState } from "react";

export function UserProfileScreen() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = () => {
    // Here you would typically call an API to delete the account
    alert("Account deletion requested. In a real app, this would delete your account.");
    setShowDeleteConfirm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
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
              <p className="text-sm text-gray-500 uppercase tracking-wide">Avatar Placeholder</p>
              <Button variant="outline" className="mt-2 border-2 border-gray-300">
                Upload Photo
              </Button>
            </div>
          </div>

          {/* Role Badge */}
          <div className="pt-4 border-t-2 border-gray-200">
            <div className="mt-2 space-y-2">
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
            </div>
          </div>

          {/* Admin Role Example */}
          <div className="pt-4 border-t-2 border-gray-200">
            <Label className="text-gray-700 text-sm flex items-center gap-2">
              <Crown className="h-3 w-3" />
              Admin (To Unlock)
            </Label>
            <div className="mt-2 space-y-2">
              <Badge className="bg-purple-100 text-purple-800 border border-purple-300">
                Admin
              </Badge>
              <div className="text-xs text-gray-600 mt-2">
                <p className="font-semibold mb-1">Additional Access:</p>
                <ul className="list-disc list-inside space-y-1 text-[11px]">
                  <li>Create/edit/delete questions</li>
                  <li>Manage user accounts</li>
                  <li>View system analytics</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Delete Account Button */}
          <div className="pt-4 border-t-2 border-gray-200">
            <Button
              variant="outline"
              className="mt-2 border-2 border-red-300 text-red-500"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>

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

        {/* Profile Details */}
        <div className="lg:col-span-2 border-4 border-gray-300 rounded-lg p-6 bg-white space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Profile Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700">Username</Label>
              <Input 
                id="username" 
                defaultValue="john_doe"
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
                  defaultValue="john@example.com"
                  className="pl-10 border-2 border-gray-300"
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

          {/* Topics of Interest */}
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

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" className="border-2 border-gray-300">
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}