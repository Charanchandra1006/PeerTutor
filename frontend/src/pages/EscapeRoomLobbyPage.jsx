import { useEscapeRooms, useMyAttempts } from '../hooks/useEscapeRoom';
import { useStartEscapeRoom } from '../hooks/useEscapeRoom';
import { useNavigate } from 'react-router-dom';
import { ServerCrash, Cpu, Skull, Loader2, Play, Clock, Award } from 'lucide-react';

export default function EscapeRoomLobbyPage() {
  const { data: rooms, isLoading: roomsLoading } = useEscapeRooms();
  const { data: attempts } = useMyAttempts();
  const startMutation = useStartEscapeRoom();
  const navigate = useNavigate();

  const handleStart = async (roomId) => {
    try {
      const attempt = await startMutation.mutateAsync(roomId);
      navigate(`/escape-room/${attempt._id}/play`);
    } catch (err) {
      console.error('Failed to start escape room', err);
    }
  };

  const getThemeIcon = (theme) => {
    switch (theme) {
      case 'server_room': return <ServerCrash className="h-10 w-10 text-brand-400" />;
      case 'ai_lab': return <Cpu className="h-10 w-10 text-accent-400" />;
      default: return <Skull className="h-10 w-10 text-red-400" />;
    }
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'beginner': return 'badge-green';
      case 'advanced': return 'badge-yellow';
      case 'nightmare': return 'badge-red';
      default: return 'badge-blue';
    }
  };

  if (roomsLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center bg-gray-900 rounded-2xl p-10 text-white shadow-xl">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-400">
            Digital Escape Rooms
          </span>
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Test your coding, debugging, and logic skills under pressure. Fix broken systems, bypass firewalls, and escape before the lockdown triggers.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms?.map((room) => (
          <div key={room._id} className="card bg-gray-800 border-gray-700 hover:border-brand-500 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gray-900 rounded-xl">
                {getThemeIcon(room.theme)}
              </div>
              <span className={`badge ${getDifficultyColor(room.difficulty)}`}>
                {room.difficulty.toUpperCase()}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">{room.title}</h3>
            <p className="text-gray-400 text-sm mb-6 flex-1">{room.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-300 mb-6">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-gray-500" />
                {room.time_limit_seconds / 60} mins
              </div>
              <div className="flex items-center gap-1">
                <Award className="h-4 w-4 text-yellow-500" />
                {room.xp_reward} XP
              </div>
            </div>

            <button
              onClick={() => handleStart(room._id)}
              disabled={startMutation.isPending}
              className="w-full btn-primary bg-brand-600 hover:bg-brand-500 gap-2 font-bold"
            >
              {startMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              ENTER ROOM
            </button>
          </div>
        ))}
      </div>

      {/* How to Play Section */}
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-xl mt-12">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Cpu className="h-6 w-6 text-brand-400" />
          Mission Briefing: How to Play
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-300">
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h3 className="text-brand-400 font-bold text-lg mb-2 flex items-center gap-2">
              <span className="bg-brand-900/50 text-brand-300 px-2 py-0.5 rounded text-xs">1</span>
              Code Repair
            </h3>
            <p className="mb-3">The system's source code is corrupted. You will see a block of broken code and a list of required tokens.</p>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>Read the error description.</li>
              <li>Type the missing syntax into the editor.</li>
              <li>Click <strong>Run Code</strong> to compile.</li>
            </ul>
          </div>

          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h3 className="text-accent-400 font-bold text-lg mb-2 flex items-center gap-2">
              <span className="bg-accent-900/50 text-accent-300 px-2 py-0.5 rounded text-xs">2</span>
              Terminal Hacking
            </h3>
            <p className="mb-3">You need to navigate a virtual server environment to find hidden keys.</p>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>Use <code className="text-brand-400">ls</code> to list files.</li>
              <li>Use <code className="text-brand-400">cd [dir]</code> to open folders.</li>
              <li>Use <code className="text-brand-400">cat [file]</code> to read logs.</li>
              <li>Enter the hidden keyword you find.</li>
            </ul>
          </div>

          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h3 className="text-green-400 font-bold text-lg mb-2 flex items-center gap-2">
              <span className="bg-green-900/50 text-green-300 px-2 py-0.5 rounded text-xs">3</span>
              Logic Flow
            </h3>
            <p className="mb-3">The boot sequence or execution flow is scrambled. Re-wire the system logic.</p>
            <ul className="list-disc list-inside text-gray-400 space-y-1">
              <li>Read the blocks of logic.</li>
              <li>Use the UP/DOWN arrows to rearrange them.</li>
              <li>Build the correct step-by-step sequence.</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 bg-red-900/20 border border-red-900/50 rounded-lg p-4 flex items-start gap-4">
          <Skull className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-400 font-bold mb-1">Warning: The AI is Watching</h4>
            <p className="text-gray-400">If you get stuck, you can request an AI Hint from the side panel. However, every mistake you make and every hint you use will <strong>permanently reduce your final score</strong>. Think carefully before you compile!</p>
          </div>
        </div>
      </div>

      {attempts && attempts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Mission History</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">Room</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Score</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attempts.map(attempt => (
                  <tr key={attempt._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {attempt.room_id?.title || 'Unknown Room'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${attempt.status === 'completed' ? 'badge-green' : attempt.status === 'abandoned' ? 'badge-red' : 'badge-yellow'}`}>
                        {attempt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{attempt.total_score}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(attempt.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
