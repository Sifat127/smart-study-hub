import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, Github, Linkedin, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

const socialLinks = [
  { href: "https://github.com/Sifat127", icon: Github, label: "GitHub" },
  { href: "https://www.linkedin.com/in/a-s-sifat-ahmed-90a131315/", icon: Linkedin, label: "LinkedIn" },
  { href: "https://wa.me/8801922829105", icon: MessageCircle, label: "WhatsApp" },
];

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="DIU StudyBank" className="h-10 w-10 rounded-lg object-contain" />
              <span className="font-display font-semibold text-lg text-foreground">
                DIU StudyBank
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Organized academic PDF library for smart learning. Access your course materials anytime, anywhere.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-medium text-xs text-muted-foreground uppercase tracking-widest mb-5">Quick Links</h4>
            <div className="space-y-3">
              {[
                { label: "Home", to: "/" },
                { label: "Departments", to: "/departments" },
                { label: "About", to: "/about" },
                { label: "Contact", to: "/contact" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="block text-sm text-foreground/70 hover:text-primary transition-colors duration-200">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Departments */}
          <div>
            <h4 className="font-display font-medium text-xs text-muted-foreground uppercase tracking-widest mb-5">Departments</h4>
            <div className="space-y-3">
              {["CSE", "EEE", "BBA", "CIVIL"].map((d) => (
                <Link key={d} to={`/departments/${d.toLowerCase()}`} className="block text-sm text-foreground/70 hover:text-primary transition-colors duration-200">
                  {d}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-medium text-xs text-muted-foreground uppercase tracking-widest mb-5">Contact</h4>
            <div className="space-y-3.5 text-sm text-foreground/70">
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-muted-foreground" />
                support@diuslider.com
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-muted-foreground" />
                +880 1234-567890
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Dhaka, Bangladesh
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-8 md:my-10" />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="text-xs">
            © {new Date().getFullYear()} DIU StudyBank. All rights reserved.
          </div>

          {/* Developer credit */}
          <div className="flex items-center gap-3">
            <span className="text-xs">
              Built by <span className="font-medium text-foreground/80">A.S. Sifat Ahmed</span>
            </span>
            <div className="flex items-center gap-1.5">
              {socialLinks.map((link) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-primary transition-colors duration-200"
                >
                  <link.icon className="h-3.5 w-3.5" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
