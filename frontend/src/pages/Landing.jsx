import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Code2, 
  ShieldCheck, 
  Zap, 
  MoveRight, 
  Globe, 
  LayoutDashboard, 
  Cpu,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function Landing() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const features = [
    {
      title: "RAG-First Architecture",
      desc: "Retrieve context from your documentation before generating answers using Claude Sonnet.",
      icon: <Cpu className="w-6 h-6 text-blue-600" />
    },
    {
      title: "Production Widget",
      desc: "Lightweight JS bundle that matches your brand and works across all platforms.",
      icon: <Bot className="w-6 h-6 text-indigo-600" />
    },
    {
      title: "Data Sovereignty",
      desc: "All training data and chat logs are stored in your private Supabase instance.",
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-100">
      {/* Modern Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">SupportMate</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
              Log in
            </Link>
            <Link to="/signup" className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-6">
              <Zap className="w-3 h-3 fill-current" />
              <span>Production-Ready MVP v1.0</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-8">
              AI Support that <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">actually knows</span> your product.
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto">
              Automate customer queries with a specialized LLM trained on your docs. Built with React, Node.js, and Supabase for ultimate reliability.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg group">
                Build your chatbot
                <MoveRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/app/dashboard" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm">
                View Demo Dashboard
              </Link>
            </div>
          </motion.div>

          {/* Dashboard Preview / Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative mx-auto max-w-5xl"
          >
            <div className="rounded-2xl border bg-white shadow-2xl overflow-hidden p-2">
              <div className="rounded-xl border bg-slate-50 aspect-[16/9] overflow-hidden flex flex-col">
                <div className="h-10 border-b bg-white flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="w-48 h-5 bg-white border rounded flex items-center px-2">
                      <div className="w-32 h-2 bg-slate-100 rounded" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 p-6 flex gap-6">
                  <div className="w-48 space-y-3 hidden md:block">
                    <div className="h-8 bg-blue-100 rounded-lg w-full" />
                    <div className="h-8 bg-slate-100 rounded-lg w-3/4" />
                    <div className="h-8 bg-slate-100 rounded-lg w-5/6" />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="h-6 w-32 bg-slate-200 rounded" />
                      <div className="h-10 w-24 bg-blue-600 rounded-lg shadow-sm" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-24 bg-white border rounded-xl shadow-sm" />
                      <div className="h-24 bg-white border rounded-xl shadow-sm" />
                      <div className="h-24 bg-white border rounded-xl shadow-sm" />
                    </div>
                    <div className="flex-1 h-32 bg-white border rounded-xl shadow-sm" />
                  </div>
                </div>
              </div>
            </div>
            {/* Visual Blobs */}
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-700" />
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Engineered for Scale</h2>
            <p className="text-slate-600 max-w-xl mx-auto">Skip the generic wrappers. Use a toolkit designed for technical workflows.</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-8"
          >
            {features.map((f, i) => (
              <motion.div 
                key={i}
                variants={itemVariants}
                className="group p-8 rounded-2xl border bg-slate-50 hover:bg-white hover:shadow-xl transition-all duration-300"
              >
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 border group-hover:border-blue-200 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Comparison Section (Professional style) */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-3xl bg-slate-900 overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-blue-600 opacity-[0.05] pointer-events-none" />
            <div className="p-8 md:p-14">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">Built for Developers</h2>
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <CheckCircle2 className="w-6 h-6 text-blue-400 shrink-0" />
                    <div>
                      <h4 className="text-white font-semibold">Self-Hosted Potential</h4>
                      <p className="text-slate-400 text-sm mt-1">Full access to your training pipelines and vector storage via Supabase.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="w-6 h-6 text-blue-400 shrink-0" />
                    <div>
                      <h4 className="text-white font-semibold">Custom UI Components</h4>
                      <p className="text-slate-400 text-sm mt-1">Don't settle for fixed layouts. Use our React components to build your own inbox.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle2 className="w-6 h-6 text-blue-400 shrink-0" />
                    <div>
                      <h4 className="text-white font-semibold">Agent Escalation</h4>
                      <p className="text-slate-400 text-sm mt-1">Built-in support for handovers when AI confidence triggers fall below threshold.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-2xl p-6 font-mono text-sm border border-slate-700 shadow-inner">
                  <div className="flex gap-1.5 mb-4">
                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                    <div className="w-2 h-2 rounded-full bg-green-500/50" />
                  </div>
                  <pre className="text-blue-300">
                    <code>{`// Initialize Chatbot SDK
const bot = new SupportMate({
  apiKey: "env.BOT_KEY",
  model: "claude-3-sonnet"
});

// Train with one click
await bot.trainFromUrl("https://docs...");`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap List */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Upcoming Features</h2>
            <div className="space-y-4">
              {[
                "Enterprise SAML/SSO Integration",
                "Slack & Discord Channel Connectors",
                "Advanced Sentiment Analytics Dashboard",
                "Multilingual Auto-detection"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl border bg-slate-50 text-slate-700 font-medium transition-transform hover:scale-[1.01] hover:bg-slate-100">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-lg text-slate-900">SupportMate AI</span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} SupportMate. Built for reliability.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-blue-600 transition">Twitter</a>
            <a href="#" className="text-slate-400 hover:text-blue-600 transition">GitHub</a>
            <a href="#" className="text-slate-400 hover:text-blue-600 transition">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

