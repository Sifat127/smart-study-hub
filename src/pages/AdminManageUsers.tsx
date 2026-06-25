import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ArrowLeft, Shield, User, Loader2, Mail, Phone, Layers, GraduationCap, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface UserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  roll_number: string | null;
  phone_number: string | null;
  section: string | null;
  department: string | null;
  batch: string | null;
  role: string;
  created_at: string;
}

export default function AdminManageUsers() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [editingRoll, setEditingRoll] = useState(false);
  const [rollDraft, setRollDraft] = useState("");
  const [savingRoll, setSavingRoll] = useState(false);

  const openUser = (u: UserRow) => {
    setSelected(u);
    setEditingRoll(false);
    setRollDraft(u.roll_number ?? "");
  };

  const handleSaveRoll = async () => {
    if (!selected) return;
    const trimmed = rollDraft.trim();
    if (!/^[A-Za-z0-9-]{3,20}$/.test(trimmed)) {
      toast({ title: "Invalid roll number", description: "3-20 chars: letters, numbers or dashes.", variant: "destructive" });
      return;
    }
    setSavingRoll(true);
    const { error } = await supabase
      .from("profiles")
      .update({ roll_number: trimmed })
      .eq("user_id", selected.user_id);
    setSavingRoll(false);
    if (error) {
      toast({ title: "Couldn't update roll number", description: error.message, variant: "destructive" });
      return;
    }
    setUsers((prev) => prev.map((u) => (u.user_id === selected.user_id ? { ...u, roll_number: trimmed } : u)));
    setSelected({ ...selected, roll_number: trimmed });
    setEditingRoll(false);
    toast({ title: "Roll number updated" });
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) {
      toast({ title: "Couldn't load users", description: error.message, variant: "destructive" });
    } else if (data) {
      setUsers(data as UserRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === currentUser?.id) {
      toast({ title: "You can't change your own role", variant: "destructive" });
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
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u)));
    }
    setUpdatingId(null);
  };

  const q = search.trim().toLowerCase();
  const filtered = users.filter((u) =>
    !q ||
    [u.full_name, u.email, u.roll_number, u.phone_number, u.section, u.department, u.batch]
      .some((v) => v && v.toLowerCase().includes(q))
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
          <Input
            placeholder="Search by name, email, roll, section, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border card-shadow overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-display font-semibold">User</th>
                  <th className="text-left p-4 font-display font-semibold">Email</th>
                  <th className="text-left p-4 font-display font-semibold hidden md:table-cell">Roll</th>
                  <th className="text-left p-4 font-display font-semibold hidden lg:table-cell">Phone</th>
                  <th className="text-left p-4 font-display font-semibold hidden lg:table-cell">Section</th>
                  <th className="text-left p-4 font-display font-semibold hidden md:table-cell">Department</th>
                  <th className="text-left p-4 font-display font-semibold hidden md:table-cell">Batch</th>
                  <th className="text-left p-4 font-display font-semibold">Role</th>
                  <th className="text-right p-4 font-display font-semibold">Change</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isSelf = u.user_id === currentUser?.id;
                  return (
                    <tr
                      key={u.user_id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => openUser(u)}
                    >
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
                      <td className="p-4 text-muted-foreground truncate max-w-[220px]">{u.email || "—"}</td>
                      <td className="p-4 text-muted-foreground hidden md:table-cell">{u.roll_number || "—"}</td>
                      <td className="p-4 text-muted-foreground hidden lg:table-cell">{u.phone_number || "—"}</td>
                      <td className="p-4 text-muted-foreground hidden lg:table-cell">{u.section || "—"}</td>
                      <td className="p-4 text-muted-foreground hidden md:table-cell truncate max-w-[160px]">{u.department || "—"}</td>
                      <td className="p-4 text-muted-foreground hidden md:table-cell">{u.batch || "—"}</td>
                      <td className="p-4">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
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
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.full_name || "Unknown user"}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={selected.email} />
                <DetailRow icon={<GraduationCap className="h-4 w-4" />} label="Roll number" value={selected.roll_number} />
                <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={selected.phone_number} />
                <DetailRow icon={<Layers className="h-4 w-4" />} label="Section" value={selected.section} />
                <DetailRow icon={<BookOpen className="h-4 w-4" />} label="Department" value={selected.department} />
                <DetailRow icon={<GraduationCap className="h-4 w-4" />} label="Batch" value={selected.batch} />
                <DetailRow icon={<Shield className="h-4 w-4" />} label="Role" value={selected.role} />
                <DetailRow
                  icon={<User className="h-4 w-4" />}
                  label="Joined"
                  value={new Date(selected.created_at).toLocaleDateString()}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="font-medium break-words">{value || "—"}</div>
      </div>
    </div>
  );
}
