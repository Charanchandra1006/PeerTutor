import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { CalendarDays, Video, Clock, BookOpen, X, Loader2, CheckCircle } from 'lucide-react';

const statusColors = {
  pending: 'badge-yellow',
  confirmed: 'badge-blue',
  active: 'badge-green',
  completed: 'badge-green',
  cancelled: 'badge-red',
  disputed: 'badge-red',
};

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState('upcoming');

  // Placeholder bookings
  const bookings = [
    { _id: '1', subject: 'Data Structures', tutor: 'Arjun Reddy', date: '2024-03-15', time: '3:00 PM', duration: 60, status: 'confirmed', credits: 30 },
    { _id: '2', subject: 'Machine Learning', tutor: 'Karthik Nair', date: '2024-03-16', time: '10:00 AM', duration: 90, status: 'pending', credits: 60 },
    { _id: '3', subject: 'DBMS', tutor: 'Priya Sharma', date: '2024-03-12', time: '2:00 PM', duration: 60, status: 'completed', credits: 25 },
    { _id: '4', subject: 'Computer Networks', tutor: 'Sneha Patel', date: '2024-03-10', time: '11:00 AM', duration: 30, status: 'cancelled', credits: 10 },
  ];

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', count: 2 },
    { id: 'completed', label: 'Completed', count: 1 },
    { id: 'cancelled', label: 'Cancelled', count: 1 },
  ];

  const filtered = bookings.filter((b) => {
    if (activeTab === 'upcoming') return ['pending', 'confirmed', 'active'].includes(b.status);
    if (activeTab === 'completed') return b.status === 'completed';
    return b.status === 'cancelled';
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-gray-500 mt-1">Manage your tutoring sessions</p>
        </div>
        <Link to="/discover" className="btn-primary gap-2">
          <CalendarDays className="h-4 w-4" />
          Book New Session
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>No {activeTab} bookings</p>
          </div>
        ) : (
          filtered.map((b) => (
            <div key={b._id} className="card !p-5 flex flex-col sm:flex-row items-start gap-4 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 flex-shrink-0">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{b.subject}</h3>
                  <span className={statusColors[b.status]}>{b.status}</span>
                </div>
                <p className="text-sm text-gray-500">with {b.tutor}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {b.date}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {b.time}</span>
                  <span>{b.duration} min</span>
                  <span className="font-medium text-brand-600">{b.credits} credits</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 sm:flex-col self-start">
                {['confirmed', 'active'].includes(b.status) && (
                  <Link to={`/session/${b._id}`} className="btn-primary !py-1.5 !px-3 text-xs gap-1">
                    <Video className="h-3 w-3" /> Join
                  </Link>
                )}
                {['pending', 'confirmed'].includes(b.status) && (
                  <button className="btn-danger !py-1.5 !px-3 text-xs gap-1">
                    <X className="h-3 w-3" /> Cancel
                  </button>
                )}
                {b.status === 'completed' && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" /> Done
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
