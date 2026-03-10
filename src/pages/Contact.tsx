import { useState } from "react";
import { Mail, MapPin, Phone, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const problemTypes = [
  "Wrong PDF on specific chapter",
  "Missing course material",
  "Broken download link",
  "Incorrect course information",
  "Website bug or error",
  "Feature request",
  "Other",
];

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [problemType, setProblemType] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !problemType || !message.trim()) {
      toast({ title: "সব ফিল্ড পূরণ করুন", variant: "destructive" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "সঠিক ইমেইল দিন", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      // Save to database
      const { error: dbError } = await supabase
        .from("contact_submissions")
        .insert({ name: name.trim(), email: email.trim(), problem_type: problemType, message: message.trim() });

      if (dbError) throw dbError;

      // Send email notification
      const { error: emailError } = await supabase.functions.invoke("send-contact-email", {
        body: { name: name.trim(), email: email.trim(), problemType, message: message.trim() },
      });

      if (emailError) {
        console.warn("Email notification failed, but submission was saved:", emailError);
      }

      toast({ title: "মেসেজ পাঠানো হয়েছে! ✅", description: "আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।" });
      setName("");
      setEmail("");
      setProblemType("");
      setMessage("");
    } catch (error: any) {
      console.error("Contact form error:", error);
      toast({ title: "মেসেজ পাঠাতে সমস্যা হয়েছে", description: "আবার চেষ্টা করুন।", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Contact Us"
        subtitle="Have questions or feedback? We'd love to hear from you."
        badge="Get in Touch"
        badgeIcon={<Mail className="h-4 w-4" />}
      />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  className="rounded-xl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="problemType">Problem Type</Label>
                <Select value={problemType} onValueChange={setProblemType}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select a problem type" />
                  </SelectTrigger>
                  <SelectContent>
                    {problemTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message (Details)</Label>
                <Textarea
                  id="message"
                  placeholder="Describe your issue in detail..."
                  rows={5}
                  className="rounded-xl"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-xl"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>

            {/* Info */}
            <div className="space-y-4">
              {[
                { icon: Mail, label: "Email", value: "jahinahmed5959@gmail.com" },
                { icon: Phone, label: "Phone", value: "01922829105" },
                { icon: MapPin, label: "Address", value: "Daffodil International University, Dhaka" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="glass rounded-2xl p-5 flex items-center gap-4 hover:border-accent/30 transition-all duration-300"
                >
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
