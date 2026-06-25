import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Camera, KeyRound, Save, User as UserIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { departments } from "@/data/mockData";
import Layout from "@/components/Layout";

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(80),
  roll_number: z
    .string()
    .trim()
    .min(3, "Roll number must be 3-20 characters")
    .max(20, "Roll number must be 3-20 characters")
    .regex(/^[A-Za-z0-9-]+$/, "Roll number may only contain letters, numbers or dashes"),
  phone_number: z
    .string()
    .trim()
    .max(20)
    .regex(/^[+\d\s-]*$/i, "Phone may only contain digits, spaces, + or -")
    .optional()
    .or(z.literal("")),
  section: z.string().trim().max(20).optional().or(z.literal("")),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  batch: z.string().trim().max(20).optional().or(z.literal("")),
  bio: z.string().trim().max(500, "Bio must be 500 characters or less").optional().or(z.literal("")),
});

export default function Profile() {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name: "",
    roll_number: "",
    phone_number: "",
    section: "",
    department: "",
    batch: "",
    bio: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?redirect=/profile");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      roll_number: profile.roll_number ?? "",
      phone_number: profile.phone_number ?? "",
      section: profile.section ?? "",
      department: profile.department ?? "",
      batch: profile.batch ?? "",
      bio: profile.bio ?? "",
    });
    setAvatarPath(profile.avatar_url ?? null);
  }, [profile]);

  useEffect(() => {
    if (!avatarPath) {
      setAvatarUrl(null);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from("avatars")
      .createSignedUrl(avatarPath, 60 * 60)
      .then(({ data }) => {
        if (!cancelled) setAvatarUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [avatarPath]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast({ title: "Please check the form", description: first.message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.full_name,
        phone_number: parsed.data.phone_number || null,
        section: parsed.data.section || null,
        department: parsed.data.department || null,
        batch: parsed.data.batch || null,
        bio: parsed.data.bio || null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save profile", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profile updated" });
  };

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Image files only", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be 2 MB or less", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) {
      setUploadingAvatar(false);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("user_id", user.id);
    setUploadingAvatar(false);
    if (updateError) {
      toast({ title: "Saved file, but couldn't update profile", description: updateError.message, variant: "destructive" });
      return;
    }
    setAvatarPath(path);
    toast({ title: "Profile picture updated" });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Couldn't change password", description: error.message, variant: "destructive" });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast({ title: "Password updated" });
  };

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to home</Link>
        </Button>

        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">My Profile</h1>
          <p className="text-muted-foreground text-sm">Manage your information and account settings.</p>
        </header>

        <div className="rounded-2xl border border-border bg-card/50 p-6 md:p-8 mb-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary/10 border border-border overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <button
                type="button"
                onClick={handleAvatarPick}
                disabled={uploadingAvatar}
                aria-label="Change profile picture"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md disabled:opacity-60"
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="min-w-0">
              <div className="font-display text-lg font-semibold truncate">{form.full_name || "Your name"}</div>
              <div className="text-sm text-muted-foreground truncate">{user.email}</div>
              {profile?.roll_number && (
                <div className="text-xs text-muted-foreground mt-0.5">Roll: {profile.roll_number}</div>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone_number">Phone number</Label>
                <Input id="phone_number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="+880 ..." maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="section">Section</Label>
                <Input id="section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. 69_E" maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batch">Batch</Label>
                <Input id="batch" value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} placeholder="e.g. 60th" maxLength={20} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="department">Department</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} maxLength={500} placeholder="A short note about yourself" />
                <div className="text-xs text-muted-foreground text-right">{form.bio.length}/500</div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="bg-gradient-primary text-primary-foreground btn-glow rounded-xl">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save changes
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-border bg-card/50 p-6 md:p-8">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Change password</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Use at least 8 characters.</p>
          <Separator className="mb-5" />
          <form onSubmit={handlePasswordChange} className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="new_password">New password</Label>
              <Input id="new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm_password">Confirm password</Label>
              <Input id="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} autoComplete="new-password" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" variant="outline" disabled={changingPassword || !newPassword} className="rounded-xl">
                {changingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update password
              </Button>
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
}
