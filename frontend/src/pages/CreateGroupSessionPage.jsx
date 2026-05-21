import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCreateGroupSession } from '../hooks/useGroupSessions';
import { useMyTutorProfile } from '../hooks/useTutors';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, Users, Calendar, Clock, BookOpen } from 'lucide-react';

export default function CreateGroupSessionPage() {
  const navigate = useNavigate();
  const { data: tutorRes } = useMyTutorProfile();
  const createMutation = useCreateGroupSession();

  const tutor = tutorRes?.data || tutorRes;
  const subjects = tutor?.subjects || [];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    scheduled_at: '',
    duration_minutes: 60,
    max_participants: 20,
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject_id) {
      toast.error('Please select a subject');
      return;
    }
    if (!formData.scheduled_at) {
      toast.error('Please select a date and time');
      return;
    }

    try {
      const scheduledDate = new Date(formData.scheduled_at).toISOString();
      const payload = {
        ...formData,
        scheduled_at: scheduledDate,
      };
      
      const res = await createMutation.mutateAsync(payload);
      const sessionId = res.data?._id || res._id;
      
      toast.success('Group session created successfully!');
      navigate(`/group-sessions/${sessionId}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create group session');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Group Session</h1>
        <p className="text-gray-500 mt-1">Host a crash course, revision class, or group study session</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-1">
            <label htmlFor="title" className="label">Session Title</label>
            <input
              type="text"
              id="title"
              name="title"
              required
              minLength={3}
              maxLength={200}
              placeholder="e.g., DBMS Crash Course - Last Minute Revision"
              className="input"
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="description" className="label">Description</label>
            <textarea
              id="description"
              name="description"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              placeholder="Describe what you will cover in this session..."
              className="input"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          {/* Subject & Max Participants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="subject_id" className="label flex items-center gap-1"><BookOpen className="h-4 w-4"/> Subject</label>
              <select
                id="subject_id"
                name="subject_id"
                required
                className="input"
                value={formData.subject_id}
                onChange={handleChange}
              >
                <option value="">Select a subject you teach...</option>
                {subjects.map(sub => (
                  <option key={sub._id} value={sub._id}>{sub.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="max_participants" className="label flex items-center gap-1"><Users className="h-4 w-4"/> Max Participants</label>
              <input
                type="number"
                id="max_participants"
                name="max_participants"
                required
                min={2}
                max={50}
                className="input"
                value={formData.max_participants}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500">Between 2 and 50 students</p>
            </div>
          </div>

          {/* Date/Time & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="scheduled_at" className="label flex items-center gap-1"><Calendar className="h-4 w-4"/> Date & Time</label>
              <input
                type="datetime-local"
                id="scheduled_at"
                name="scheduled_at"
                required
                min={new Date().toISOString().slice(0, 16)}
                className="input"
                value={formData.scheduled_at}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="duration_minutes" className="label flex items-center gap-1"><Clock className="h-4 w-4"/> Duration</label>
              <select
                id="duration_minutes"
                name="duration_minutes"
                required
                className="input"
                value={formData.duration_minutes}
                onChange={handleChange}
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour (60 mins)</option>
                <option value={90}>1.5 hours (90 mins)</option>
              </select>
            </div>
          </div>

          {/* Pricing Info */}
          <div className="bg-brand-50 rounded-lg p-4 text-brand-800 text-sm">
            <strong>Note on Pricing:</strong> Group session prices are automatically calculated based on your hourly rate and the system's group discount policy (currently 60% discount per student).
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="btn-primary w-full justify-center"
          >
            {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Group Session'}
          </button>
        </form>
      </div>
    </div>
  );
}
