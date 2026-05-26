import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEscapeRoomStore } from '../stores/escapeRoomStore';
import { useEscapeRoom, useSubmitPuzzle, useEscapeRoomHint } from '../hooks/useEscapeRoom';
import { Loader2, AlertTriangle, ShieldAlert, Zap, HelpCircle } from 'lucide-react';

// Placeholder puzzle components — we'll create these next
import CodeRepairPuzzle from '../components/features/escape-room/puzzles/CodeRepairPuzzle';
import TerminalPuzzle from '../components/features/escape-room/puzzles/TerminalPuzzle';
import LogicFlowPuzzle from '../components/features/escape-room/puzzles/LogicFlowPuzzle';
import EscapeRoomResults from '../components/features/escape-room/EscapeRoomResults';

export default function EscapeRoomGamePage() {
  const { id: attemptId } = useParams();
  const navigate = useNavigate();
  const store = useEscapeRoomStore();
  const submitMutation = useSubmitPuzzle();
  const hintMutation = useEscapeRoomHint();
  
  // We need to fetch the attempt details to know what room we are in
  // For V1, we'll just fetch the attempt using a standard api call in useEffect
  const [attempt, setAttempt] = useState(null);
  const [room, setRoom] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGame = async () => {
      try {
        const resAttempt = await fetch(`http://localhost:3000/api/v1/escape-room/attempts/${attemptId}`, {
          headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('ptm-auth'))?.state?.accessToken}` }
        }).then(r => r.json());
        
        const resRoom = await fetch(`http://localhost:3000/api/v1/escape-room/rooms/${resAttempt.data.attempt.room_id}`, {
          headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('ptm-auth'))?.state?.accessToken}` }
        }).then(r => r.json());
        
        setAttempt(resAttempt.data.attempt);
        setRoom(resRoom.data.room);
        
        if (store.status === 'idle') {
          store.setGameData(attemptId, resRoom.data.room);
          // Fast forward to correct puzzle index
          useEscapeRoomStore.setState({ currentPuzzleIndex: resAttempt.data.attempt.current_puzzle_index });
        }
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading game", err);
      }
    };
    loadGame();
  }, [attemptId]);

  // Timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      store.tickTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePuzzleSubmit = async (answerPayload) => {
    try {
      const currentPuzzle = room.puzzles[store.currentPuzzleIndex];
      const res = await submitMutation.mutateAsync({
        attemptId,
        puzzleId: currentPuzzle.puzzle_id,
        answer: answerPayload
      });
      
      if (res.correct) {
        if (res.status === 'completed') {
          store.completeRoom(res.score); // Not accurate total, but good enough for UI transition
          setAttempt(prev => ({...prev, total_score: 500, status: 'completed'})); // Dummy update to trigger result screen
        } else {
          store.nextPuzzle(res.score);
        }
      } else {
        alert("Incorrect solution! System integrity dropping.");
      }
    } catch (err) {
      alert("Error submitting solution.");
    }
  };

  const handleRequestHint = async () => {
    try {
      const currentPuzzle = room.puzzles[store.currentPuzzleIndex];
      const hint = await hintMutation.mutateAsync({ attemptId, puzzleId: currentPuzzle.puzzle_id });
      alert(`AI ASSIST: ${hint}`);
      store.useHint(currentPuzzle.puzzle_id);
    } catch (err) {
      alert("No more hints available or error connecting to AI.");
    }
  };

  // Temporary stub for V1 to render the shell
  if (isLoading || !room) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-500 mx-auto mb-4" />
          <p className="text-brand-400 font-mono">INITIALIZING NEURAL LINK...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200 font-mono overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800 shadow-xl z-10">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-red-500 animate-pulse" />
          <h1 className="text-xl font-bold text-red-500 uppercase tracking-widest">SYSTEM COMPROMISED</h1>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-black text-red-500 tracking-tighter">
            {Math.floor(store.timeLeft / 60)}:{(store.timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">Time Until Lockdown</div>
        </div>

        <button 
          onClick={() => navigate('/escape-room')}
          className="text-gray-500 hover:text-white transition-colors uppercase text-sm font-bold"
        >
          Abort Mission
        </button>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-4xl w-full h-full bg-gray-900 rounded-xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col">
            {store.status === 'completed' || attempt?.status === 'completed' ? (
              <EscapeRoomResults attempt={attempt} />
            ) : (
              <div className="flex-1 p-6 overflow-y-auto">
                {room.puzzles[store.currentPuzzleIndex]?.type === 'code_repair' && (
                  <CodeRepairPuzzle 
                    puzzle={room.puzzles[store.currentPuzzleIndex]} 
                    onSubmit={handlePuzzleSubmit} 
                    isSubmitting={submitMutation.isPending} 
                  />
                )}
                {room.puzzles[store.currentPuzzleIndex]?.type === 'terminal' && (
                  <TerminalPuzzle 
                    puzzle={room.puzzles[store.currentPuzzleIndex]} 
                    onSubmit={handlePuzzleSubmit} 
                    isSubmitting={submitMutation.isPending} 
                  />
                )}
                {room.puzzles[store.currentPuzzleIndex]?.type === 'logic_flow' && (
                  <LogicFlowPuzzle 
                    puzzle={room.puzzles[store.currentPuzzleIndex]} 
                    onSubmit={handlePuzzleSubmit} 
                    isSubmitting={submitMutation.isPending} 
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Side Panel (Hints & Status) */}
        <aside className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl z-10">
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">System AI Assist</h3>
            <button 
              onClick={handleRequestHint}
              disabled={hintMutation.isPending}
              className="w-full py-3 bg-brand-900/30 text-brand-400 hover:bg-brand-900/50 border border-brand-800/50 rounded-lg flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50"
            >
              <HelpCircle className="h-4 w-4" />
              {hintMutation.isPending ? 'Requesting...' : 'Request Hint (-15 Pts)'}
            </button>
          </div>
          <div className="flex-1 p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Diagnostics</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">CPU Load</span>
                  <span className="text-red-400">98%</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 w-[98%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Firewall Integrity</span>
                  <span className="text-yellow-400">12%</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 w-[12%]" />
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
