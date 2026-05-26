import { useState } from 'react';
import { Code2, Play } from 'lucide-react';

export default function CodeRepairPuzzle({ puzzle, onSubmit, isSubmitting }) {
  const [code, setCode] = useState(puzzle.initial_state.code);

  const handleSubmit = () => {
    onSubmit({ code });
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Code2 className="h-6 w-6 text-brand-400" />
          {puzzle.title}
        </h3>
        <p className="text-gray-400 mt-2">{puzzle.description}</p>
        
        {puzzle.initial_state.missing_tokens && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-3">Required Tokens:</span>
            {puzzle.initial_state.missing_tokens.map((token, idx) => (
              <span key={idx} className="inline-block px-2 py-1 bg-gray-900 text-brand-400 border border-brand-900 rounded text-xs font-mono mr-2">
                {token}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 bg-[#1e1e1e] rounded-xl border border-gray-700 overflow-hidden flex flex-col shadow-inner">
        <div className="flex items-center px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
          </div>
          <span className="ml-4 text-xs font-mono text-gray-500">repair_module.{puzzle.initial_state.language || 'js'}</span>
        </div>
        
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 w-full p-4 bg-transparent text-gray-300 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          spellCheck="false"
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn-primary gap-2 bg-brand-600 hover:bg-brand-500"
        >
          {isSubmitting ? 'Compiling...' : <><Play className="h-4 w-4" /> Run Code</>}
        </button>
      </div>
    </div>
  );
}
