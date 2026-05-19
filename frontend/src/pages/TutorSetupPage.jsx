import { useState } from 'react';
import { GraduationCap, BookOpen, DollarSign, Clock, Plus, Save, Loader2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TutorSetupPage() {
  const [form, setForm] = useState({
    bio: '',
    rate_per_hour: 20,
    subjects: [],
    availability: [{ day: 1, start_time: '09:00', end_time: '12:00' }],
    languages: ['English'],
  });
  const [loading, setLoading] = useState(false);

  const addSlot = () => {
    setForm({
      ...form,
      availability: [...form.availability, { day: 1, start_time: '14:00', end_time: '17:00' }],
    });
  };

  const updateSlot = (index, field, value) => {
    const slots = [...form.availability];
    slots[index][field] = field === 'day' ? parseInt(value) : value;
    setForm({ ...form, availability: slots });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/tutors/profile', form);
      toast.success('Tutor profile created!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create profile');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Become a Tutor</h1>
          <p className="text-gray-500">Share your knowledge and earn credits</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bio */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-brand-500" /> About You
          </h2>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="input !h-24 resize-none"
            placeholder="Tell students about your expertise, teaching style, and experience (min 10 chars)..."
            minLength={10}
            maxLength={500}
            required
          />
          <p className="text-xs text-gray-400 mt-1">{form.bio.length}/500 characters</p>
        </div>

        {/* Rate */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" /> Pricing
          </h2>
          <div className="flex items-center gap-4">
            <input
              type="number"
              className="input !w-32"
              value={form.rate_per_hour}
              onChange={(e) => setForm({ ...form, rate_per_hour: parseInt(e.target.value) })}
              min={1}
              max={500}
              required
            />
            <span className="text-sm text-gray-500">credits per hour</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Platform takes a {10}% fee. You'll earn {Math.round(form.rate_per_hour * 0.9)} credits per hour.
          </p>
        </div>

        {/* Availability */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" /> Availability
            </h2>
            <button type="button" onClick={addSlot} className="btn-secondary !py-1.5 !px-3 text-xs gap-1">
              <Plus className="h-3 w-3" /> Add Slot
            </button>
          </div>

          <div className="space-y-3">
            {form.availability.map((slot, i) => (
              <div key={i} className="flex items-center gap-3 flex-wrap">
                <select
                  className="input !w-auto"
                  value={slot.day}
                  onChange={(e) => updateSlot(i, 'day', e.target.value)}
                >
                  {days.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                </select>
                <input
                  type="time"
                  className="input !w-auto"
                  value={slot.start_time}
                  onChange={(e) => updateSlot(i, 'start_time', e.target.value)}
                />
                <span className="text-gray-400">to</span>
                <input
                  type="time"
                  className="input !w-auto"
                  value={slot.end_time}
                  onChange={(e) => updateSlot(i, 'end_time', e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full !py-3 gap-2" disabled={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> Create Tutor Profile</>}
        </button>
      </form>
    </div>
  );
}
