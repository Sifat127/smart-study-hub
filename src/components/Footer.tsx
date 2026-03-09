import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, Github, Linkedin, MessageCircle, Heart, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

const socialLinks = [
  { href: "https://github.com/Sifat127", icon: Github, label: "GitHub", hoverColor: "hover:bg-[hsl(0_0%_100%/0.15)]" },
  { href: "https://www.linkedin.com/in/a-s-sifat-ahmed-90a131315/", icon: Linkedin, label: "LinkedIn", hoverColor: "hover:bg-[hsl(210_80%_55%/0.25)]" },
  { href: "https://wa.me/8801922829105", icon: MessageCircle, label: "WhatsApp", hoverColor: "hover:bg-[hsl(142_70%_45%/0.25)]" },
];

const SocialIcon = ({ href, icon: Icon, label, hoverColor }: typeof socialLinks[0]) => (
  <motion.a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={label}
    whileHover={{ scale: 1.2, y: -3 }}
    whileTap={{ scale: 0.9 }}
    className={`p-2.5 rounded-full border border-primary-foreground/15 text-primary-foreground/60 hover:text-accent transition-all duration-300 ${hoverColor} backdrop-blur-sm`}
  >
    <Icon className="h-4 w-4" />
  </motion.a>
);

export default function Footer() {
  return (
    <footer className="bg-gradient-hero text-primary-foreground py-10 md:py-14 mt-auto relative overflow-hidden">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-[hsl(var(--accent)/0.03)] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-[hsl(var(--primary)/0.04)] rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
          {/* Brand */}
          <div className="space-y-4 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="DIU StudyBank" className="h-12 w-12 rounded-xl object-contain ring-2 ring-primary-foreground/10" />
              <span className="font-display font-bold text-xl text-primary-foreground">
                DIU StudyBank
              </span>
            </div>
            <p className="text-sm text-primary-foreground/50 leading-relaxed max-w-xs">
              Organized academic PDF library for smart learning. Access your course materials anytime, anywhere.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-primary-foreground text-sm uppercase tracking-wider">Quick Links</h4>
            <div className="space-y-2.5">
              {[
                { label: "Home", to: "/" },
                { label: "Departments", to: "/departments" },
                { label: "About", to: "/about" },
                { label: "Contact", to: "/contact" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="group flex items-center gap-1.5 text-sm text-primary-foreground/50 hover:text-accent transition-colors duration-200">
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Departments */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-primary-foreground text-sm uppercase tracking-wider">Departments</h4>
            <div className="space-y-2.5">
              {["CSE", "EEE", "BBA", "CIVIL"].map((d) => (
                <Link key={d} to={`/departments/${d.toLowerCase()}`} className="group flex items-center gap-1.5 text-sm text-primary-foreground/50 hover:text-accent transition-colors duration-200">
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {d}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-primary-foreground text-sm uppercase tracking-wider">Contact</h4>
            <div className="space-y-3 text-sm text-primary-foreground/50">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-accent/10">
                  <Mail className="h-3.5 w-3.5 text-accent" />
                </div>
                support@diuslider.com
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-accent/10">
                  <Phone className="h-3.5 w-3.5 text-accent" />
                </div>
                +880 1234-567890
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-accent/10">
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                </div>
                Dhaka, Bangladesh
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative mt-8 md:mt-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-primary-foreground/8" />
          </div>
          <div className="relative flex justify-center">
            <div className="bg-[hsl(220_35%_12%)] px-4">
              <Heart className="h-3.5 w-3.5 text-accent/40" />
            </div>
          </div>
        </div>

        {/* Developer Credit & Copyright */}
        <div className="pt-6 md:pt-8 text-center space-y-4">
          {/* Developer section */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex flex-col items-center gap-2 px-6 py-3 rounded-2xl border border-primary-foreground/8 bg-primary-foreground/[0.02]"
          >
            <span className="text-primary-foreground/40 uppercase tracking-[0.2em] text-[10px] font-medium">Designed & Built by</span>
            <span className="font-display font-bold text-accent text-base drop-shadow-[0_0_12px_hsl(var(--accent)/0.5)]">
              A.S. Sifat Ahmed
            </span>
            <div className="flex items-center gap-2">
              {socialLinks.map((link) => (
                <SocialIcon key={link.label} {...link} />
              ))}
            </div>
            <span className="text-primary-foreground/40 text-xs">CSE, Daffodil International University</span>
          </motion.div>

          <div className="text-xs text-primary-foreground/30">
            © {new Date().getFullYear()} DIU StudyBank. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
