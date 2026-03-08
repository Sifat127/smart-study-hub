import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, Github, Linkedin, MessageCircle } from "lucide-react";
import logo from "@/assets/logo.png";

export default function Footer() {
  return (
    <footer className="bg-gradient-hero text-primary-foreground py-8 md:py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="DIU StudyBank" className="h-11 w-11 rounded-lg object-contain" />
              <span className="font-display font-bold text-lg text-primary-foreground">
                DIU StudyBank
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

        <div className="border-t border-primary-foreground/10 mt-6 md:mt-8 pt-4 md:pt-6 text-center space-y-3">
          <div className="text-xs md:text-sm text-primary-foreground/40">
            © {new Date().getFullYear()} DIU StudyBank. All rights reserved. An academic resource platform.
          </div>
          <div className="text-xs text-primary-foreground/60 space-y-1">
            <span className="text-primary-foreground/50 uppercase tracking-widest text-[10px]">Web Design & Architecture by</span>
            <br />
            <span className="font-bold text-accent text-sm drop-shadow-[0_0_8px_hsl(var(--accent)/0.6)]">A.S. Sifat Ahmed</span>
            <br />
            <span className="text-primary-foreground/60">Student of CSE, Daffodil International University</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
