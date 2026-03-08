import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowLeft, Shield, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface UserRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: string;
}

export default function AdminManageUsers() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url, created_at");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    if (profiles) {
      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);
      setUsers(
        profiles.map((p) => ({
          ...p,
          role: (roleMap.get(p.user_id) as string) || "user",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === currentUser?.id) {
      toast({ title: "নিজের role পরিবর্তন করা যাবে না", variant: "destructive" });
      return;
    }

    setUpdatingId(userId);
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as "admin" | "user" })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Role update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Role updated to ${newRole}` });
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
      );
    }
    setUpdatingId(null);
  };

  const filtered = users.filter((u) =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">Manage Users</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Input placeholder="Search users by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-display font-semibold">User</th>
                  <th className="text-left p-4 font-display font-semibold hidden sm:table-cell">Joined</th>
                  <th className="text-left p-4 font-display font-semibold">Role</th>
                  <th className="text-right p-4 font-display font-semibold">Change Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isSelf = u.user_id === currentUser?.id;
                  return (
                    <tr key={u.user_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            {u.role === "admin" ? (
                              <Shield className="h-4 w-4 text-primary" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <span className="font-medium">{u.full_name || "Unknown"}</span>
                            {isSelf && <span className="text-xs text-muted-foreground ml-2">(You)</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        {updatingId === u.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary inline-block" />
                        ) : (
                          <Select
                            value={u.role}
                            onValueChange={(val) => handleRoleChange(u.user_id, val)}
                            disabled={isSelf}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs inline-flex">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
