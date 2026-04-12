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
  ArrowDownCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { getAllUsers, updateUserRole, type UserProfile } from "@/app/services/authService";
import { extractApiErrorMessage } from "@/app/utils/apiError";
import { toast } from "sonner";

export function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{ email: string; newRole: string; username: string } | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getAllUsers(searchQuery, page, 10);
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, "Failed to load users. You may not have root admin access."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (email: string, newRole: string) => {
    try {
      await updateUserRole(email, newRole);
      toast.success(`Successfully updated role for ${email} to ${newRole}`);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, "Failed to update role"));
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page on new search
  }

  // AI generated (Edited by Xiang Yu)
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearchQuery, page]);

  const handleInitialAction = (email: string, newRole: string, username: string) => {
    setConfirmAction({ email, newRole, username });
  };

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
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-4 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">User Management</h1>
              <p className="text-purple-100 text-sm">Root Admin Control Panel</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 px-3 py-1.5 backdrop-blur-sm">
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
                onChange={handleQueryChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading users...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="border-4 border-gray-300 rounded-lg p-5 bg-white hover:border-gray-400 transition-colors"
            >
              <div className="flex items-center gap-4 flex-wrap">
                {/* Avatar */}
                <div className="w-12 h-12 border-2 border-gray-400 rounded-full flex items-center justify-center bg-gray-100 flex-shrink-0">
                  {user.profile_image_url ? (
                    <img
                      src={user.profile_image_url}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                  
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
                    {confirmAction?.email === user.email ? (
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-2 border-green-300 bg-green-100 text-green-700 hover:bg-green-300 sm:w-auto"
                          onClick={() => {
                            handleRoleChange(confirmAction.email, confirmAction.newRole);
                            setConfirmAction(null);
                          }}
                        >
                          {confirmAction.newRole === "admin" ? (
                            <>
                              <ArrowUpCircle className="mr-1 h-4 w-4" />
                              Confirm Promotion
                            </>
                          ) : (
                            <>
                              <ArrowDownCircle className="mr-1 h-4 w-4" />
                              Confirm Demotion
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-2 border-red-300 bg-red-100 text-red-700 hover:bg-red-300 sm:w-auto"
                          onClick={() => setConfirmAction(null)}
                        >
                          Cancel Action
                        </Button>
                      </div>
                    ) : (
                    user.access_role === "user" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 border-purple-300 text-purple-700 bg-purple-100 hover:bg-purple-300"
                        onClick={() => handleInitialAction(user.email, "admin", user.username)}
                      >
                        <ArrowUpCircle className="mr-1 h-4 w-4" />
                        Promote to Admin
                      </Button>
                    ): 

                    (user.access_role === "admin" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2 border-blue-300 text-blue-700 bg-blue-100 hover:bg-blue-300"
                          onClick={() => handleInitialAction(user.email, "user", user.username)}
                        >
                          <ArrowDownCircle className="mr-1 h-4 w-4" />
                          Demote to User
                        </Button>
                      </>
                    )))}
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
          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">No users found</div>
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            >
              Previous
            </Button>
            <span className="text-stone-50">
              Page <input 
                type="number"
                min="1"
                max={totalPages}
                value={page}
                onChange={(e) => setPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                className="w-16 border rounded text-center"
              /> of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
