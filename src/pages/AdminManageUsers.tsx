import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ArrowLeft,
  Shield,
  User,
  Loader2,
  Save,
  Users as UsersIcon,
  Undo2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { departments } from "@/data/mockData";

interface UserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  roll_number: string | null;
  phone_number: string | null;
  section: string | null;
  department: string | null;
  batch: string | null;
  bio?: string | null;
  role: string;
  created_at: string;
}

const UNASSIGNED = "Unassigned";

interface AuditEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  changed_by: string | null;
}

export default function AdminManageUsers() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserRow | null>(null);
  
  const [form, setForm] = useState({
    full_name: "",
    roll_number: "",
    phone_number: "",
    section: "",
    department: "",
    batch: "",
    bio: "",
  });
  const [saving, setSaving] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditorNames, setAuditorNames] = useState<Record<string, string>>({});
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<AuditEntry[] | null>(null);
  const [restoring, setRestoring] = useState(false);

  const RESTORABLE_FIELDS = new Set([
    "full_name", "roll_number", "phone_number", "section", "department", "batch", "bio",
  ]);

  // Group audit entries by changed_at + changed_by — entries written by the same
  // admin save share an exact timestamp, so we treat them as a single snapshot.
  const auditGroups = useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    for (const e of auditLog) {
      const key = `${e.changed_at}__${e.changed_by ?? ""}`;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.values());
  }, [auditLog]);

  const handleRestore = async (group: AuditEntry[]) => {
    if (!selected) return;
    const restorable = group.filter((e) => RESTORABLE_FIELDS.has(e.field_name));
    if (restorable.length === 0) {
      toast({ title: "Nothing to restore", variant: "destructive" });
      setPendingRestore(null);
      return;
    }
    // Validate restored values against the same rules as manual edits.
    const update: Record<string, string | null> = {};
    for (const e of restorable) {
      const v = e.old_value;
      if (e.field_name === "full_name" && (!v || !v.trim())) {
        toast({ title: "Cannot restore empty name", variant: "destructive" });
        return;
      }
      if (e.field_name === "roll_number" && v && !/^[A-Za-z0-9-]{3,20}$/.test(v)) {
        toast({ title: "Restored roll number is invalid", variant: "destructive" });
        return;
      }
      if (e.field_name === "phone_number" && v && !/^[+\d\s-]{0,20}$/.test(v)) {
        toast({ title: "Restored phone number is invalid", variant: "destructive" });
        return;
      }
      update[e.field_name] = v && v.length > 0 ? v : null;
    }
    setRestoring(true);
    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("user_id", selected.user_id);
    setRestoring(false);
    if (error) {
      toast({ title: "Rollback failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Profile restored",
      description: `Reverted ${restorable.length} field${restorable.length === 1 ? "" : "s"} — a new audit entry was recorded.`,
    });
    // Refresh local table row, form, and audit log.
    setUsers((prev) =>
      prev.map((u) =>
        u.user_id === selected.user_id ? { ...u, ...update } : u,
      ),
    );
    setForm((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(update).map(([k, v]) => [k, v ?? ""])) }));
    setPendingRestore(null);
    loadAuditLog(selected.user_id);
  };


  const loadAuditLog = async (userId: string) => {
    setLoadingAudit(true);
    const { data, error } = await supabase
      .from("profile_audit_log")
      .select("id, field_name, old_value, new_value, changed_at, changed_by")
      .eq("target_user_id", userId)
      .order("changed_at", { ascending: false })
      .limit(50);
    if (error) {
      setAuditLog([]);
    } else {
      const entries = (data ?? []) as AuditEntry[];
      setAuditLog(entries);
      const actorIds = Array.from(new Set(entries.map((e) => e.changed_by).filter(Boolean))) as string[];
      const missing = actorIds.filter((id) => !auditorNames[id]);
      if (missing.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", missing);
        if (profs) {
          setAuditorNames((prev) => {
            const next = { ...prev };
            for (const p of profs) next[p.user_id] = p.full_name ?? "Admin";
            return next;
          });
        }
      }
    }
    setLoadingAudit(false);
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

  const openUser = async (u: UserRow) => {
    // Pull full row (including bio) for editing.
    const { data } = await supabase
      .from("profiles")
      .select("full_name, roll_number, phone_number, section, department, batch, bio")
      .eq("user_id", u.user_id)
      .maybeSingle();
    const merged: UserRow = { ...u, bio: data?.bio ?? null };
    setSelected(merged);
    setForm({
      full_name: data?.full_name ?? u.full_name ?? "",
      roll_number: data?.roll_number ?? u.roll_number ?? "",
      phone_number: data?.phone_number ?? u.phone_number ?? "",
      section: data?.section ?? u.section ?? "",
      department: data?.department ?? u.department ?? "",
      batch: data?.batch ?? u.batch ?? "",
      bio: data?.bio ?? "",
    });
    loadAuditLog(u.user_id);
  };

  const handleSave = async () => {
    if (!selected) return;
    const name = form.full_name.trim();
    const roll = form.roll_number.trim();
    if (!name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!/^[A-Za-z0-9-]{3,20}$/.test(roll)) {
      toast({ title: "Invalid roll number", description: "3-20 chars: letters, numbers or dashes.", variant: "destructive" });
      return;
    }
    if (form.phone_number && !/^[+\d\s-]{0,20}$/.test(form.phone_number.trim())) {
      toast({ title: "Invalid phone number", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name,
        roll_number: roll,
        phone_number: form.phone_number.trim() || null,
        section: form.section.trim() || null,
        department: form.department.trim() || null,
        batch: form.batch.trim() || null,
        bio: form.bio.trim() || null,
      })
      .eq("user_id", selected.user_id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save changes", description: error.message, variant: "destructive" });
      return;
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.user_id === selected.user_id
          ? {
              ...u,
              full_name: name,
              roll_number: roll,
              phone_number: form.phone_number.trim() || null,
              section: form.section.trim() || null,
              department: form.department.trim() || null,
              batch: form.batch.trim() || null,
            }
          : u,
      ),
    );
    toast({ title: "User updated" });
    setSelected(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === currentUser?.id) {
      toast({ title: "You can't change your own role", variant: "destructive" });
      return;
    }
    setUpdatingId(userId);
    // user_roles row may not exist yet — upsert by (user_id, role) uniqueness.
    const { data: existing } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    const { error } = existing
      ? await supabase
          .from("user_roles")
          .update({ role: newRole as "admin" | "user" })
          .eq("user_id", userId)
      : await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole as "admin" | "user" });

    if (error) {
      toast({ title: "Role update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Role updated to ${newRole}` });
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u)));
    }
    setUpdatingId(null);
  };

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      users.filter((u) => {
        const matchesQuery =
          !q ||
          [u.full_name, u.email, u.roll_number, u.phone_number, u.section, u.department, u.batch]
            .some((v) => v && v.toLowerCase().includes(q));
        const dept = (u.department || UNASSIGNED).trim() || UNASSIGNED;
        const matchesDept = departmentFilter === "all" || dept === departmentFilter;
        return matchesQuery && matchesDept;
      }),
    [users, q, departmentFilter],
  );

  // Group by department for display.
  const grouped = useMemo(() => {
    const map = new Map<string, UserRow[]>();
    for (const u of filtered) {
      const key = (u.department || UNASSIGNED).trim() || UNASSIGNED;
      const list = map.get(key) ?? [];
      list.push(u);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === UNASSIGNED) return 1;
      if (b === UNASSIGNED) return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

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
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search by name, email, roll, section, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="sm:w-64">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
              ))}
              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
            No users found
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([dept, rows]) => (
              <section key={dept}>
                <div className="flex items-center gap-2 mb-3">
                  <UsersIcon className="h-4 w-4 text-primary" />
                  <h2 className="font-display font-semibold text-lg">{dept}</h2>
                  <Badge variant="secondary" className="ml-1">{rows.length}</Badge>
                </div>
                <div className="bg-card rounded-xl border border-border card-shadow overflow-x-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-4 font-display font-semibold">User</th>
                        <th className="text-left p-4 font-display font-semibold">Email</th>
                        <th className="text-left p-4 font-display font-semibold hidden md:table-cell">Roll</th>
                        <th className="text-left p-4 font-display font-semibold hidden lg:table-cell">Phone</th>
                        <th className="text-left p-4 font-display font-semibold hidden lg:table-cell">Section</th>
                        <th className="text-left p-4 font-display font-semibold hidden md:table-cell">Batch</th>
                        <th className="text-left p-4 font-display font-semibold">Role</th>
                        <th className="text-right p-4 font-display font-semibold">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((u) => {
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
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Edit user</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                  <div className="font-medium break-words mt-1">{selected.email || "—"}</div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m_full_name">Full name</Label>
                  <Input id="m_full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={80} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="m_roll">Roll number</Label>
                    <Input id="m_roll" value={form.roll_number} onChange={(e) => setForm({ ...form, roll_number: e.target.value })} maxLength={20} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m_phone">Phone</Label>
                    <Input id="m_phone" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} maxLength={20} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m_section">Section</Label>
                    <Input id="m_section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. 69_E" maxLength={20} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m_batch">Batch</Label>
                    <Input id="m_batch" value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} placeholder="e.g. 60th" maxLength={20} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m_department">Department</Label>
                  <Select value={form.department || undefined} onValueChange={(v) => setForm({ ...form, department: v })}>
                    <SelectTrigger id="m_department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="m_bio">Bio</Label>
                  <Textarea id="m_bio" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={500} />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-muted-foreground border-t border-border/50">
                  <div><span className="block uppercase tracking-wider">Role</span><span className="text-foreground font-medium">{selected.role}</span></div>
                  <div><span className="block uppercase tracking-wider">Joined</span><span className="text-foreground font-medium">{new Date(selected.created_at).toLocaleDateString()}</span></div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setSelected(null)} disabled={saving}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary text-primary-foreground">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save changes
                  </Button>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-display font-semibold text-sm">Admin edit history</h3>
                    {loadingAudit && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  {!loadingAudit && auditLog.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No admin edits recorded yet.</p>
                  ) : (
                    <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {auditGroups.map((group) => {
                        const head = group[0];
                        const restorable = group.filter((e) => RESTORABLE_FIELDS.has(e.field_name));
                        return (
                          <li key={head.id} className="text-xs rounded-md bg-muted/40 border border-border/50 p-2.5">
                            <div className="flex justify-between gap-2 mb-2">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                by {head.changed_by ? (auditorNames[head.changed_by] ?? "Admin") : "Admin"}
                              </span>
                              <span className="text-muted-foreground whitespace-nowrap">
                                {new Date(head.changed_at).toLocaleString()}
                              </span>
                            </div>
                            <ul className="space-y-1.5">
                              {group.map((entry) => (
                                <li key={entry.id}>
                                  <div className="font-medium text-foreground">{entry.field_name.replace(/_/g, " ")}</div>
                                  <div className="text-muted-foreground break-words">
                                    <span className="line-through opacity-70">{entry.old_value || "—"}</span>
                                    <span className="mx-1.5">→</span>
                                    <span className="text-foreground">{entry.new_value || "—"}</span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                            {restorable.length > 0 && (
                              <div className="flex justify-end mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => setPendingRestore(restorable)}
                                  disabled={restoring}
                                >
                                  <Undo2 className="h-3 w-3 mr-1" />
                                  Restore these values
                                </Button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!pendingRestore} onOpenChange={(open) => !open && !restoring && setPendingRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore previous values?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revert the following field{(pendingRestore?.length ?? 0) === 1 ? "" : "s"} on this user's profile
              and record a new audit entry showing the rollback. The original history is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRestore && (
            <ul className="text-xs space-y-1.5 rounded-md bg-muted/40 border border-border/50 p-2.5 max-h-48 overflow-y-auto">
              {pendingRestore.map((e) => (
                <li key={e.id} className="break-words">
                  <span className="font-medium text-foreground">{e.field_name.replace(/_/g, " ")}: </span>
                  <span className="line-through opacity-70">{e.new_value || "—"}</span>
                  <span className="mx-1.5">→</span>
                  <span className="text-foreground">{e.old_value || "—"}</span>
                </li>
              ))}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={restoring}
              onClick={(e) => {
                e.preventDefault();
                if (pendingRestore) handleRestore(pendingRestore);
              }}
            >
              {restoring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Undo2 className="h-4 w-4 mr-2" />}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
    </div>
  );
}
