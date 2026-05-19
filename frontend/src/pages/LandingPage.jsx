import { Link } from 'react-router-dom';
import { GraduationCap, Users, Wallet, Star, ArrowRight, Sparkles, BookOpen, Video } from 'lucide-react';

const features = [
  { icon: Users, title: 'Peer-to-Peer Learning', desc: 'Connect with top-rated student tutors who understand your curriculum.' },
  { icon: Sparkles, title: 'AI Recommendations', desc: 'Smart matching algorithm finds the perfect tutor for your learning style.' },
  { icon: Video, title: 'Seamless Video Sessions', desc: 'Built-in video calls with shared notes and resource sharing.' },
  { icon: Wallet, title: 'Credit System', desc: 'Fair credit-based payment with escrow protection for both parties.' },
  { icon: BookOpen, title: 'Resource Library', desc: 'Access study materials and past session notes from top tutors.' },
  { icon: Star, title: 'Gamification', desc: 'Earn XP, badges, and climb the leaderboard as you learn and teach.' },
];

const stats = [
  { value: '500+', label: 'Active Tutors' },
  { value: '2,000+', label: 'Sessions Completed' },
  { value: '4.8', label: 'Avg Rating' },
  { value: '50+', label: 'Subjects' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white font-bold text-lg shadow-lg">
              P
            </div>
            <span className="text-xl font-bold text-gray-900">PeerTutor</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="btn-secondary !py-2 !px-5 text-sm">
              Log In
            </Link>
            <Link to="/register" className="btn-primary !py-2 !px-5 text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 mb-6 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            AI-Powered Peer Tutoring
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6 animate-slide-up">
            Learn Better.{' '}
            <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
              Together.
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-gray-600 mb-10 animate-slide-up">
            Find expert peer tutors from your college, book sessions in seconds,
            and accelerate your learning with AI-matched recommendations.
          </p>
          <div className="flex items-center justify-center gap-4 animate-slide-up">
            <Link to="/register" className="btn-primary !py-3 !px-8 text-base gap-2 group">
              Start Learning
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/register" className="btn-secondary !py-3 !px-8 text-base">
              Become a Tutor
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to learn smarter
            </h2>
            <p className="text-gray-600 max-w-lg mx-auto">
              A complete platform built for real college learning.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card group hover:border-brand-200 hover:shadow-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 mb-4 group-hover:bg-brand-100 transition-colors">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="card !p-12 bg-gradient-to-br from-brand-600 to-accent-600 !border-0 !text-white">
            <GraduationCap className="h-12 w-12 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl font-bold mb-4">Ready to ace your next exam?</h2>
            <p className="text-brand-100 mb-8 max-w-lg mx-auto">
              Join hundreds of students already learning smarter with peer tutoring.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 text-base font-semibold text-brand-700 shadow-lg hover:shadow-xl transition-all"
            >
              Create Free Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-500">
          <span>© 2024 PeerTutor Marketplace. All rights reserved.</span>
          <span>Built with ❤️ by Vardhaman Students</span>
        </div>
      </footer>
    </div>
  );
}
