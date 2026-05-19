import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInitials } from '../lib/utils';
import {
  Video, MessageSquare, FileText, ArrowLeft, Send, Paperclip,
  Phone, PhoneOff, Mic, MicOff, Camera, CameraOff, Users,
  CheckCircle,
} from 'lucide-react';

export default function SessionRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState('chat');
  const [chatInput, setChatInput] = useState('');
  const [notes, setNotes] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'Arjun Reddy', message: 'Hey! Ready to start?', time: '3:00 PM' },
    { sender: 'You', message: 'Yes, let\'s go! I need help with binary trees.', time: '3:01 PM' },
  ]);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    setMessages([...messages, { sender: 'You', message: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setChatInput('');
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
            <span className="text-sm text-gray-300">Data Structures — Session #{id}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <Users className="h-4 w-4" /> 2
            </span>
          </div>
        </div>

        {/* Video Frame — Jitsi Embed Placeholder */}
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
              href={`https://meet.jit.si/ptm-session-${id}`}
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
            onClick={() => navigate('/bookings')}
            className="flex items-center gap-2 rounded-full bg-green-600 px-6 py-3 text-white text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="h-4 w-4" /> Complete Session
          </button>
        </div>
      </div>

      {/* Right: Side Panel */}
      <div className="w-80 flex flex-col bg-gray-800 border-l border-gray-700">
        {/* Panel Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActivePanel('chat')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activePanel === 'chat' ? 'text-brand-400 border-b-2 border-brand-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <MessageSquare className="h-4 w-4 inline mr-1" /> Chat
          </button>
          <button
            onClick={() => setActivePanel('notes')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activePanel === 'notes' ? 'text-brand-400 border-b-2 border-brand-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-1" /> Notes
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activePanel === 'chat' ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'You' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                      msg.sender === 'You'
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-700 text-gray-200'
                    }`}>
                      {msg.sender !== 'You' && (
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
                  <button className="text-gray-500 hover:text-gray-300 p-1">
                    <Paperclip className="h-5 w-5" />
                  </button>
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
          ) : (
            /* Notes */
            <div className="flex-1 p-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Take session notes here..."
                className="w-full h-full rounded-lg bg-gray-700 p-4 text-sm text-gray-200 placeholder-gray-500 border-0 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
