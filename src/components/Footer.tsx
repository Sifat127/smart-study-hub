import { Link } from "react-router-dom";
import { BookOpen, Mail, MapPin, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gradient-hero text-primary-foreground py-8 md:py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg text-primary-foreground">
                DIU Slider
              </span>
            </div>
            <p className="text-sm text-primary-foreground/60">
              Organized academic PDF library for smart learning. Access your course materials anytime, anywhere.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-primary-foreground">Quick Links</h4>
            <div className="space-y-2">
              {[
                { label: "Home", to: "/" },
                { label: "Departments", to: "/departments" },
                { label: "About", to: "/about" },
                { label: "Contact", to: "/contact" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="block text-sm text-primary-foreground/60 hover:text-accent transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Departments */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-primary-foreground">Departments</h4>
            <div className="space-y-2">
              {["CSE", "EEE", "BBA"].map((d) => (
                <Link key={d} to={`/departments/${d.toLowerCase()}`} className="block text-sm text-primary-foreground/60 hover:text-accent transition-colors">
                  {d}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-primary-foreground">Contact</h4>
            <div className="space-y-3 text-sm text-primary-foreground/60">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent" />
                support@diuslider.com
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent" />
                +880 1234-567890
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                Dhaka, Bangladesh
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-8 pt-6 text-center text-sm text-primary-foreground/40">
          © {new Date().getFullYear()} DIU Slider. All rights reserved. An academic resource platform.
        </div>
      </div>
    </footer>
  );
}
