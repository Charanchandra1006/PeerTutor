import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { getInitials } from '../lib/utils';
import {
  Video, MessageSquare, FileText, ArrowLeft, Send, Paperclip,
  Phone, PhoneOff, Mic, MicOff, Camera, CameraOff, Users,
  CheckCircle, FolderOpen, Plus, ExternalLink, Save, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SessionRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activePanel, setActivePanel] = useState('chat');
  const [chatInput, setChatInput] = useState('');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'System', message: 'Session started. Good luck!', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ]);
  const [resourceForm, setResourceForm] = useState({ name: '', url: '', type: 'link' });

  // Fetch session details
  const { data: session } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (session?.notes) {
      setNotes(session.notes);
    }
  }, [session]);

  // Save notes
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.post(`/bookings/${id}/notes`, { content: notes });
      toast.success('Notes saved!');
    } catch {
      toast.error('Failed to save notes');
    }
    setSavingNotes(false);
  };

  // Complete session
  const completeSession = useMutation({
    mutationFn: () => api.post(`/bookings/${id}/complete`),
    onSuccess: () => {
      toast.success('Session completed!');
      navigate('/bookings');
    },
    onError: () => toast.error('Failed to complete session'),
  });

  // Add resource
  const addResource = useMutation({
    mutationFn: (data) => api.post(`/bookings/${id}/resources`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      setResourceForm({ name: '', url: '', type: 'link' });
      toast.success('Resource added!');
    },
    onError: () => toast.error('Failed to add resource'),
  });

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages([...messages, { sender: 'You', message: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setChatInput('');
  };

  const handleAddResource = (e) => {
    e.preventDefault();
    if (!resourceForm.name.trim() || !resourceForm.url.trim()) return;
    addResource.mutate(resourceForm);
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left: Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
          <button
            onClick={() => navigate('/bookings')}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Leave
          </button>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-gray-300">
              {session?.subject_id?.name || 'Session'} — #{id?.slice(-6)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <Users className="h-4 w-4" /> {session?.group_students?.length ? session.group_students.length + 1 : 2}
            </span>
          </div>
        </div>

        {/* Video Frame */}
        <div className="flex-1 flex items-center justify-center bg-gray-900 relative">
          <div className="text-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gray-700 text-gray-300 mx-auto mb-6">
              <Video className="h-16 w-16" />
            </div>
            <p className="text-gray-400 text-lg">Jitsi Meet Video Session</p>
            <p className="text-gray-500 text-sm mt-2">
              Video frame loads from <code className="text-brand-400">meet.jit.si</code>
            </p>
            <a
              href={session?.video_link || `https://meet.jit.si/ptm-session-${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-6 rounded-lg bg-brand-600 px-6 py-3 text-white font-medium hover:bg-brand-700 transition-colors"
            >
              <Video className="h-5 w-5" />
              Open Video Call
            </a>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 py-4 bg-gray-800 border-t border-gray-700">
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors">
            <Mic className="h-5 w-5" />
          </button>
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors">
            <Camera className="h-5 w-5" />
          </button>
          <button className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors">
            <PhoneOff className="h-6 w-6" />
          </button>
          <button
            onClick={() => completeSession.mutate()}
            disabled={completeSession.isPending}
            className="flex items-center gap-2 rounded-full bg-green-600 px-6 py-3 text-white text-sm font-medium hover:bg-green-700 transition-colors"
          >
            {completeSession.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Complete Session
          </button>
        </div>
      </div>

      {/* Right: Side Panel */}
      <div className="w-80 flex flex-col bg-gray-800 border-l border-gray-700">
        {/* Panel Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'notes', label: 'Notes', icon: FileText },
            { id: 'resources', label: 'Files', icon: FolderOpen },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activePanel === tab.id ? 'text-brand-400 border-b-2 border-brand-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 inline mr-1" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activePanel === 'chat' && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                      msg.sender === 'You'
                        ? 'bg-brand-600 text-white'
                        : msg.sender === 'System'
                        ? 'bg-gray-600 text-gray-300 italic'
                        : 'bg-gray-700 text-gray-200'
                    }`}>
                      {msg.sender !== 'You' && msg.sender !== 'System' && (
                        <p className="text-xs font-medium text-brand-300 mb-0.5">{msg.sender}</p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1 text-right">{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 rounded-lg bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 border-0 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={sendMessage}
                    className="text-brand-400 hover:text-brand-300 p-1"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          )}

          {activePanel === 'notes' && (
            <div className="flex-1 flex flex-col p-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Take session notes here..."
                className="flex-1 rounded-lg bg-gray-700 p-4 text-sm text-gray-200 placeholder-gray-500 border-0 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white font-medium hover:bg-brand-700 transition-colors"
              >
                {savingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Notes
              </button>
            </div>
          )}

          {activePanel === 'resources' && (
            <div className="flex-1 flex flex-col p-4">
              {/* Existing Resources */}
              <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                {(session?.resources || []).length === 0 ? (
                  <div className="text-center text-gray-500 text-sm py-8">
                    <FolderOpen className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    No resources shared yet
                  </div>
                ) : (
                  session.resources.map((r, i) => (
                    <a
                      key={i}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors group"
                    >
                      <FileText className="h-4 w-4 text-brand-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">{r.name}</p>
                        <p className="text-[10px] text-gray-500 capitalize">{r.type}</p>
                      </div>
                      <ExternalLink className="h-3 w-3 text-gray-500 group-hover:text-gray-300 flex-shrink-0" />
                    </a>
                  ))
                )}
              </div>

              {/* Add Resource Form */}
              <form onSubmit={handleAddResource} className="space-y-2 pt-3 border-t border-gray-700">
                <input
                  type="text"
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                  placeholder="Resource name..."
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 border-0 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <input
                  type="url"
                  value={resourceForm.url}
                  onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 border-0 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <select
                  value={resourceForm.type}
                  onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}
                  className="w-full rounded-lg bg-gray-700 px-3 py-2 text-sm text-white border-0 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="link">Link</option>
                  <option value="pdf">PDF</option>
                  <option value="document">Document</option>
                  <option value="image">Image</option>
                </select>
                <button
                  type="submit"
                  disabled={addResource.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white font-medium hover:bg-brand-700 transition-colors"
                >
                  {addResource.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Resource
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

