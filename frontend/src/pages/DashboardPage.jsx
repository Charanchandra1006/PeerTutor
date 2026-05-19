import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';
import {
  CalendarDays, Wallet, Star, TrendingUp, BookOpen, Clock,
  Search, ArrowRight, GraduationCap, Users,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const stats = [
    { label: 'Upcoming Sessions', value: '3', icon: CalendarDays, color: 'bg-blue-50 text-blue-600', link: '/bookings' },
    { label: 'Credits Balance', value: '150', icon: Wallet, color: 'bg-green-50 text-green-600', link: '/wallet' },
    { label: 'XP Points', value: user?.xp_points || 0, icon: Star, color: 'bg-yellow-50 text-yellow-600', link: '/profile' },
    { label: 'Completed Sessions', value: '12', icon: TrendingUp, color: 'bg-purple-50 text-purple-600', link: '/bookings?status=completed' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your learning journey.</p>
        </div>
        <Link to="/discover" className="btn-primary gap-2 hidden sm:inline-flex">
          <Search className="h-4 w-4" />
          Find a Tutor
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.link} className="stat-card group hover:shadow-lg">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color} transition-transform group-hover:scale-110`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h2>
            <Link to="/bookings" className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { subject: 'Data Structures', tutor: 'Arjun Reddy', time: 'Today, 3:00 PM', status: 'confirmed' },
              { subject: 'Machine Learning', tutor: 'Karthik Nair', time: 'Tomorrow, 10:00 AM', status: 'pending' },
              { subject: 'DBMS', tutor: 'Priya Sharma', time: 'Fri, 2:00 PM', status: 'confirmed' },
            ].map((session, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{session.subject}</p>
                  <p className="text-xs text-gray-500">with {session.tutor}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {session.time}
                  </p>
                  <span className={`badge mt-1 ${session.status === 'confirmed' ? 'badge-green' : 'badge-yellow'}`}>
                    {session.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <div className="card bg-gradient-to-br from-brand-600 to-brand-700 !text-white !border-0">
            <GraduationCap className="h-8 w-8 mb-3 opacity-80" />
            <h3 className="text-lg font-semibold mb-1">Find Your Perfect Tutor</h3>
            <p className="text-brand-100 text-sm mb-4">
              Our AI matches you with tutors based on your learning style and subject needs.
            </p>
            <Link to="/discover" className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30 transition-colors">
              Explore Tutors <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {user?.role === 'student' && (
            <div className="card bg-gradient-to-br from-accent-500 to-accent-600 !text-white !border-0">
              <Users className="h-8 w-8 mb-3 opacity-80" />
              <h3 className="text-lg font-semibold mb-1">Share Your Knowledge</h3>
              <p className="text-accent-100 text-sm mb-4">
                Become a tutor and earn credits while helping your peers succeed.
              </p>
              <Link to="/become-tutor" className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30 transition-colors">
                Become a Tutor <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {['tutor', 'both'].includes(user?.role) && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Tutor Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-xl font-bold text-green-700">24</p>
                  <p className="text-xs text-green-600">Sessions</p>
                </div>
                <div className="rounded-lg bg-yellow-50 p-3 text-center">
                  <p className="text-xl font-bold text-yellow-700">4.8</p>
                  <p className="text-xs text-yellow-600">Rating</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
