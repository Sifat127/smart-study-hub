import { Link } from "react-router-dom";
import { ArrowLeft, Globe, Bell, Palette, Lock } from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { toast } = useToast();
  const [siteName, setSiteName] = useState("EduVault");
  const [maintenance, setMaintenance] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const handleSave = () => {
    toast({ title: "Settings saved successfully!" });
  };

  const settingSections = [
    {
      icon: Globe,
      title: "General",
      content: (
        <div className="space-y-4">
          <div>
            <Label htmlFor="siteName">Site Name</Label>
            <Input id="siteName" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </div>
        </div>
      ),
    },
    {
      icon: Bell,
      title: "Notifications",
      content: (
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Email Notifications</p>
            <p className="text-sm text-muted-foreground">Send email alerts for new signups</p>
          </div>
          <Switch checked={notifications} onCheckedChange={setNotifications} />
        </div>
      ),
    },
    {
      icon: Lock,
      title: "Maintenance",
      content: (
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Maintenance Mode</p>
            <p className="text-sm text-muted-foreground">Temporarily disable public access</p>
          </div>
          <Switch checked={maintenance} onCheckedChange={setMaintenance} />
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">Settings</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {settingSections.map((s) => (
          <div key={s.title} className="bg-card rounded-xl border border-border p-6 card-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display font-semibold text-lg">{s.title}</h2>
            </div>
            {s.content}
          </div>
        ))}

        <Button onClick={handleSave} className="w-full">Save Settings</Button>
      </div>
    </div>
  );
}
