import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { 
  Shield, 
  Search, 
  User, 
  Crown, 
  ArrowUpCircle, 
  ArrowDownCircle,
  AlertTriangle 
} from "lucide-react";
import { useState, useEffect } from "react";
import { getAllUsers, updateUserRole, type UserProfile } from "@/app/services/authService";

export function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ email: string; newRole: string; username: string } | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load users. You may not have root admin access.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (email: string, newRole: string) => {
    setActionMessage("");
    try {
      await updateUserRole(email, newRole);
      setActionMessage(`Successfully updated role for ${email} to ${newRole}`);
      setConfirmAction(null);
      fetchUsers();
    } catch (err: any) {
      setActionMessage(err.response?.data?.error || "Failed to update role");
    }
  };

  const filteredUsers = searchQuery
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "root-admin":
        return <Badge className="bg-red-100 text-red-800 border border-red-300"><Crown className="w-3 h-3 mr-1" />Root Admin</Badge>;
      case "admin":
        return <Badge className="bg-purple-100 text-purple-800 border border-purple-300"><Shield className="w-3 h-3 mr-1" />Admin</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 border border-blue-300"><User className="w-3 h-3 mr-1" />User</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <Badge className="bg-red-100 text-red-800 border border-red-300">
            <Crown className="w-3 h-3 mr-1" />
            Root Admin Only
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="border-4 border-gray-300 rounded-lg p-5 bg-white">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="user-search" className="text-gray-700 mb-2 block">Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="user-search"
                placeholder="Search by username or email..."
                className="pl-10 border-2 border-gray-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {actionMessage && (
        <div className={`p-4 rounded-lg border-2 ${actionMessage.includes('Successfully') ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
          {actionMessage}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-yellow-800 mb-1">Confirm Role Change</p>
              <p className="text-sm text-yellow-700">
                Change <span className="font-semibold">{confirmAction.username}</span> ({confirmAction.email}) to <span className="font-semibold">{confirmAction.newRole}</span>?
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  onClick={() => handleRoleChange(confirmAction.email, confirmAction.newRole)}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-2 border-gray-300"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading users...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="border-4 border-gray-300 rounded-lg p-5 bg-white hover:border-gray-400 transition-colors"
            >
              <div className="flex items-center gap-4 flex-wrap">
                {/* Avatar */}
                <div className="w-12 h-12 border-2 border-gray-400 rounded-full flex items-center justify-center bg-gray-100 flex-shrink-0">
                  <User className="w-6 h-6 text-gray-400" />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{user.username}</p>
                    {getRoleBadge(user.access_role)}
                  </div>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-gray-400">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                </div>

                {/* Role Actions - don't show for root-admin users */}
                {user.access_role !== "root-admin" && (
                  <div className="flex gap-2 flex-shrink-0">
                    {user.access_role === "user" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 border-purple-300 text-purple-700 hover:bg-purple-50"
                        onClick={() => setConfirmAction({ email: user.email, newRole: "admin", username: user.username })}
                      >
                        <ArrowUpCircle className="mr-1 h-4 w-4" />
                        Promote to Admin
                      </Button>
                    )}
                    {user.access_role === "admin" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                          onClick={() => setConfirmAction({ email: user.email, newRole: "user", username: user.username })}
                        >
                          <ArrowDownCircle className="mr-1 h-4 w-4" />
                          Demote to User
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {user.access_role === "root-admin" && (
                  <Badge variant="outline" className="border-red-300 text-red-600 text-xs">
                    Cannot modify
                  </Badge>
                )}
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-500">No users found</div>
          )}
        </div>
      )}
    </div>
  );
}
