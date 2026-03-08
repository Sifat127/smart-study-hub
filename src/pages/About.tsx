import { motion } from "framer-motion";
import { BookOpen, Users, Shield, Download, Target, Lightbulb } from "lucide-react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";

const stats = [
  { icon: BookOpen, label: "Departments", value: "3+" },
  { icon: Users, label: "Active Students", value: "500+" },
  { icon: Shield, label: "Secure Platform", value: "100%" },
  { icon: Download, label: "PDFs Available", value: "200+" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4 } }),
};

export default function About() {
  return (
    <Layout>
      <PageHeader
        title="About DIU StudyBank"
        subtitle="A modern academic resource platform designed for Daffodil International University students. Making course materials easily accessible, organized, and downloadable."
        badge="Our Story"
        badgeIcon={<BookOpen className="h-4 w-4" />}
      />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="glass rounded-2xl p-6 text-center hover:border-accent/30 transition-all duration-300"
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="font-display text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass rounded-2xl p-8 hover:border-accent/30 transition-all duration-300"
            >
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-accent" />
              </div>
              <h2 className="font-display text-xl font-bold mb-3">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                To provide a centralized, well-organized digital library where students can find and download their course PDFs without hassle. We believe that easy access to study materials leads to better academic performance.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-8 hover:border-accent/30 transition-all duration-300"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold mb-3">How It Works</h2>
              <p className="text-muted-foreground leading-relaxed">
                Browse by department, select your semester, pick a course, and access chapter-wise PDF materials. It's that simple. Admins manage all the content to ensure materials are always up-to-date and accurate.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
