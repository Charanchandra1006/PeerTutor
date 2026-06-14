import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { cn } from '../lib/utils';
import {
  Brain, BookOpen, Target, ChevronRight, Loader2,
  Calendar, CheckCircle2, Sparkles, ArrowRight,
} from 'lucide-react';

export default function LearningPathPage() {
  const [subject, setSubject] = useState('');
  const [goal, setGoal] = useState('');
  const [learningPath, setLearningPath] = useState(null);

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await api.get('/tutors/subjects');
      return res.data || [];
    },
  });

  const generatePath = useMutation({
    mutationFn: async () => {
      const res = await api.post('/ai/learning-path', {
        target_subject: subject,
        goal: goal || `Master ${subject}`,
        current_level: 'beginner',
        weeks: 4,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setLearningPath(data);
    },
  });

  const weekColors = [
    'from-blue-500 to-indigo-500',
    'from-emerald-500 to-teal-500',
    'from-purple-500 to-violet-500',
    'from-orange-500 to-amber-500',
    'from-pink-500 to-rose-500',
    'from-cyan-500 to-sky-500',
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white mb-4 shadow-lg">
          <Brain className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">AI Learning Path Advisor</h1>
        <p className="text-gray-500 mt-1">Get a personalized weekly study plan powered by AI</p>
      </div>

      {/* Input Form */}
      {!learningPath && (
        <div className="card max-w-xl mx-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input"
              >
                <option value="">Select a subject...</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s.name}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Learning Goal (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Prepare for midterm exam, Master data structures..."
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>

            <button
              onClick={() => generatePath.mutate()}
              disabled={!subject || generatePath.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {generatePath.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating your plan...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Learning Path
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Generated Path */}
      {learningPath && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-brand-500" />
              Your Learning Path
            </h2>
            <button
              onClick={() => setLearningPath(null)}
              className="btn-secondary text-sm"
            >
              Generate New Plan
            </button>
          </div>

          {/* Summary */}
          {learningPath.summary && (
            <div className="card bg-gradient-to-r from-brand-50 to-accent-50 !border-brand-200">
              <p className="text-sm text-gray-700">{learningPath.summary}</p>
            </div>
          )}

          {/* Weekly Plan */}
          <div className="space-y-4">
            {(learningPath.weeks || learningPath.plan || []).map((week, idx) => (
              <div key={idx} className="card !p-0 overflow-hidden hover:shadow-lg transition-shadow">
                <div className={cn('p-4 text-white bg-gradient-to-r', weekColors[idx % weekColors.length])}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {week.title || `Week ${idx + 1}`}
                    </h3>
                    {week.hours && (
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                        ~{week.hours} hours
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {(week.topics || week.tasks || []).map((topic, tIdx) => (
                    <div key={tIdx} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {typeof topic === 'string' ? topic : topic.title || topic.name}
                        </p>
                        {topic.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{topic.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {week.resources && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-1">Recommended Resources:</p>
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(week.resources) ? week.resources : [week.resources]).map((r, rIdx) => (
                          <span key={rIdx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            📚 {typeof r === 'string' ? r : r.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
