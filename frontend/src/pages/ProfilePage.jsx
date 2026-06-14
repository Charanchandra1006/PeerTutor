import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSavedTutors } from '../hooks/useResources';
import { getInitials, cn } from '../lib/utils';
import { User, Mail, GraduationCap, BookOpen, Award, Edit, Save, Loader2, Bell, Heart } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    year: user?.year || '',
    branch: user?.branch || '',
    learning_style: user?.learning_style || '',
  });
  const [loading, setLoading] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(
    user?.notification_preferences || {
      email_booking: true,
      email_reminder: true,
      in_app: true,
      push: true,
    }
  );
  const [savingPrefs, setSavingPrefs] = useState(false);
  const { data: savedTutors = [] } = useSavedTutors();

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await api.patch('/users/me', form);
      updateUser(res.data);
      toast.success('Profile updated!');
      setEditing(false);
    } catch (err) {
      toast.error('Failed to update profile');
    }
    setLoading(false);
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      const res = await api.patch('/users/me', { notification_preferences: notifPrefs });
      updateUser(res.data);
      toast.success('Notification preferences saved!');
    } catch {
      toast.error('Failed to save preferences');
    }
    setSavingPrefs(false);
  };

  const togglePref = (key) => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Profile Card */}
      <div className="card !p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-accent-400 text-white font-bold text-3xl shadow-lg">
            {getInitials(user?.name)}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-gray-500">{user?.email}</p>
            <span className="badge-blue mt-2 capitalize">{user?.role}</span>
          </div>
          <div className="sm:ml-auto">
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              className={editing ? 'btn-primary gap-2' : 'btn-secondary gap-2'}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                <><Save className="h-4 w-4" /> Save</>
              ) : (
                <><Edit className="h-4 w-4" /> Edit</>
              )}
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            {editing ? (
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            ) : (
              <p className="flex items-center gap-2 text-gray-900">
                <User className="h-4 w-4 text-gray-400" /> {user?.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <p className="flex items-center gap-2 text-gray-900">
              <Mail className="h-4 w-4 text-gray-400" /> {user?.email}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
            {editing ? (
              <select className="input" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}>
                <option value="">Select year</option>
                {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            ) : (
              <p className="flex items-center gap-2 text-gray-900">
                <GraduationCap className="h-4 w-4 text-gray-400" /> Year {user?.year || 'Not set'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch</label>
            {editing ? (
              <input
                className="input"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                placeholder="e.g., CSE, ECE, MECH"
              />
            ) : (
              <p className="flex items-center gap-2 text-gray-900">
                <BookOpen className="h-4 w-4 text-gray-400" /> {user?.branch || 'Not set'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Learning Style</label>
            {editing ? (
              <select className="input" value={form.learning_style} onChange={(e) => setForm({ ...form, learning_style: e.target.value })}>
                <option value="">Select style</option>
                <option value="visual">Visual</option>
                <option value="auditory">Auditory</option>
                <option value="reading">Reading/Writing</option>
                <option value="kinesthetic">Kinesthetic</option>
              </select>
            ) : (
              <p className="flex items-center gap-2 text-gray-900 capitalize">
                <Award className="h-4 w-4 text-gray-400" /> {user?.learning_style || 'Not set'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">XP Points</label>
            <p className="flex items-center gap-2 text-gray-900">
              <Award className="h-4 w-4 text-yellow-500" /> {user?.xp_points || 0} XP
            </p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Badges Earned</h3>
        {(user?.badges && user.badges.length > 0) ? (
          <div className="flex flex-wrap gap-3">
            {user.badges.map((badge, i) => (
              <div key={i} className="flex items-center gap-2 rounded-full bg-yellow-50 px-4 py-2 text-sm">
                <Award className="h-4 w-4 text-yellow-500" />
                <span className="capitalize text-yellow-800">{badge.type?.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No badges yet. Complete sessions to earn badges!</p>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="h-4 w-4 text-brand-500" />
            Notification Preferences
          </h3>
          <button
            onClick={handleSavePrefs}
            disabled={savingPrefs}
            className="btn-secondary text-sm flex items-center gap-1"
          >
            {savingPrefs ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </button>
        </div>
        <div className="space-y-3">
          {[
            { key: 'email_booking', label: 'Email — Booking confirmations', desc: 'Get notified when a session is booked or cancelled' },
            { key: 'email_reminder', label: 'Email — Session reminders', desc: 'Receive reminders before upcoming sessions' },
            { key: 'in_app', label: 'In-app notifications', desc: 'Show notification badge and dropdown' },
            { key: 'push', label: 'Push notifications', desc: 'Browser push notifications (when available)' },
          ].map((pref) => (
            <div key={pref.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{pref.label}</p>
                <p className="text-xs text-gray-500">{pref.desc}</p>
              </div>
              <button
                onClick={() => togglePref(pref.key)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  notifPrefs[pref.key] ? 'bg-brand-600' : 'bg-gray-200'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow',
                    notifPrefs[pref.key] ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Tutors */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-500" />
          Saved Tutors
        </h3>
        {savedTutors.length === 0 ? (
          <p className="text-sm text-gray-400">No saved tutors yet. Browse the discovery page to save your favorites!</p>
        ) : (
          <div className="space-y-2">
            {savedTutors.map((tutor) => (
              <Link
                key={tutor._id}
                to={`/tutors/${tutor._id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-white text-xs font-bold">
                  {getInitials(tutor.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{tutor.name}</p>
                  <p className="text-xs text-gray-500">{tutor.email}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
