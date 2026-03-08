import { Mail, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";

export default function Contact() {
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
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Your message..." rows={5} className="rounded-xl" />
              </div>
              <Button type="submit" className="bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-xl">
                <Send className="h-4 w-4 mr-2" /> Send Message
              </Button>
            </form>

            {/* Info */}
            <div className="space-y-4">
              {[
                { icon: Mail, label: "Email", value: "support@diuslider.com" },
                { icon: Phone, label: "Phone", value: "01922829105" },
                { icon: MapPin, label: "Address", value: "Daffodil International University, Dhaka" },
              ].map((item) => (
                <div key={item.label} className="glass rounded-2xl p-5 flex items-center gap-4 hover:border-accent/30 transition-all duration-300">
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
