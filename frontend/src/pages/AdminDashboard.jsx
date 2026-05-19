import { Users, BookOpen, CalendarDays, Wallet, TrendingUp, AlertTriangle, Shield } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Users', value: '256', icon: Users, color: 'bg-blue-50 text-blue-600', change: '+12 this week' },
    { label: 'Active Tutors', value: '48', icon: BookOpen, color: 'bg-green-50 text-green-600', change: '+3 this week' },
    { label: 'Sessions This Month', value: '185', icon: CalendarDays, color: 'bg-purple-50 text-purple-600', change: '+23% vs last month' },
    { label: 'Credits Circulating', value: '12,450', icon: Wallet, color: 'bg-yellow-50 text-yellow-600', change: '+1,200 this week' },
    { label: 'Revenue (Fees)', value: '1,850', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600', change: 'Platform fees collected' },
    { label: 'Pending Disputes', value: '2', icon: AlertTriangle, color: 'bg-red-50 text-red-600', change: 'Action required' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Platform overview and management</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card group hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Management Sections */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Registrations</h2>
          <div className="space-y-3">
            {[
              { name: 'Priya Sharma', email: 'priya@vardhaman.org', role: 'tutor', date: 'Today' },
              { name: 'Rahul Kumar', email: 'rahul@vardhaman.org', role: 'student', date: 'Yesterday' },
              { name: 'Sneha Patel', email: 'sneha@vardhaman.org', role: 'both', date: '2 days ago' },
            ].map((user, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="text-right">
                  <span className="badge-blue text-xs capitalize">{user.role}</span>
                  <p className="text-xs text-gray-400 mt-1">{user.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions</h2>
          <div className="space-y-3">
            {[
              { subject: 'Data Structures', student: 'Aditya', tutor: 'Arjun', status: 'completed', credits: 30 },
              { subject: 'Machine Learning', student: 'Meera', tutor: 'Karthik', status: 'active', credits: 60 },
              { subject: 'DBMS', student: 'Farhan', tutor: 'Priya', status: 'confirmed', credits: 25 },
            ].map((session, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{session.subject}</p>
                  <p className="text-xs text-gray-500">{session.student} → {session.tutor}</p>
                </div>
                <div className="text-right">
                  <span className={`badge text-xs ${
                    session.status === 'completed' ? 'badge-green' :
                    session.status === 'active' ? 'badge-blue' : 'badge-yellow'
                  }`}>
                    {session.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{session.credits} credits</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
