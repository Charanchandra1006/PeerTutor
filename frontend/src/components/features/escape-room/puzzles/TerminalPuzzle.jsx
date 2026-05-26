import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Send } from 'lucide-react';

export default function TerminalPuzzle({ puzzle, onSubmit, isSubmitting }) {
  const [history, setHistory] = useState([
    { type: 'system', text: 'P-OS Terminal v1.0.4 loaded.' },
    { type: 'system', text: 'Type commands to navigate the filesystem.' }
  ]);
  const [input, setInput] = useState('');
  const [currentPath, setCurrentPath] = useState(puzzle.initial_state.current_path || '/');
  const [commandSequence, setCommandSequence] = useState([]);
  const [answerKeyword, setAnswerKeyword] = useState('');
  const bottomRef = useRef(null);

  const fs = puzzle.initial_state.filesystem;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const getDir = (path) => {
    if (path === '/') return fs;
    const parts = path.split('/').filter(Boolean);
    let curr = fs;
    for (const p of parts) {
      if (curr[p] && typeof curr[p] === 'object') {
        curr = curr[p];
      } else {
        return null;
      }
    }
    return curr;
  };

  const handleCommand = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim();
    const newSeq = [...commandSequence, cmd];
    setCommandSequence(newSeq);
    
    setHistory(prev => [...prev, { type: 'input', text: `root@sys:${currentPath}$ ${cmd}` }]);
    
    const parts = cmd.split(' ');
    const base = parts[0];
    const arg = parts[1];

    if (base === 'ls') {
      const dir = getDir(currentPath);
      if (dir) {
        const items = Object.keys(dir).map(k => typeof dir[k] === 'object' ? `${k}/` : k).join('  ');
        setHistory(prev => [...prev, { type: 'output', text: items || '(empty)' }]);
      }
    } else if (base === 'cd') {
      if (!arg || arg === '/') {
        setCurrentPath('/');
      } else if (arg === '..') {
        if (currentPath !== '/') {
          const p = currentPath.split('/').filter(Boolean);
          p.pop();
          setCurrentPath('/' + p.join('/'));
        }
      } else {
        const targetPath = currentPath === '/' ? `/${arg}` : `${currentPath}/${arg}`;
        const dir = getDir(targetPath);
        if (dir && typeof dir === 'object') {
          setCurrentPath(targetPath);
        } else {
          setHistory(prev => [...prev, { type: 'error', text: `cd: ${arg}: No such directory` }]);
        }
      }
    } else if (base === 'cat') {
      if (!arg) {
        setHistory(prev => [...prev, { type: 'error', text: `cat: missing operand` }]);
      } else {
        const dir = getDir(currentPath);
        if (dir && dir[arg] && typeof dir[arg] === 'string') {
          setHistory(prev => [...prev, { type: 'output', text: dir[arg] }]);
        } else {
          setHistory(prev => [...prev, { type: 'error', text: `cat: ${arg}: No such file` }]);
        }
      }
    } else if (base === 'clear') {
      setHistory([]);
    } else {
      setHistory(prev => [...prev, { type: 'error', text: `${base}: command not found` }]);
    }

    setInput('');
  };

  const handleSubmit = () => {
    onSubmit({ command_sequence: commandSequence, keyword: answerKeyword });
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <TerminalIcon className="h-6 w-6 text-brand-400" />
          {puzzle.title}
        </h3>
        <p className="text-gray-400 mt-2">{puzzle.description}</p>
      </div>

      <div className="flex-1 bg-black rounded-xl border border-gray-700 overflow-hidden flex flex-col font-mono text-sm shadow-inner mb-4">
        <div className="flex-1 p-4 overflow-y-auto">
          {history.map((h, i) => (
            <div key={i} className={`mb-1 ${h.type === 'error' ? 'text-red-400' : h.type === 'system' ? 'text-gray-500' : h.type === 'input' ? 'text-brand-300' : 'text-gray-300'}`}>
              {h.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={handleCommand} className="flex items-center px-4 py-3 bg-gray-900 border-t border-gray-800">
          <span className="text-brand-400 mr-2">root@sys:{currentPath}$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent text-white focus:outline-none"
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
        </form>
      </div>

      <div className="flex items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Found Keyword / Answer</label>
          <input
            type="text"
            value={answerKeyword}
            onChange={(e) => setAnswerKeyword(e.target.value)}
            placeholder="Enter the hidden value you found..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (!answerKeyword && commandSequence.length === 0)}
          className="btn-primary gap-2 mt-5 bg-brand-600 hover:bg-brand-500 h-[42px]"
        >
          {isSubmitting ? 'Verifying...' : <><Send className="h-4 w-4" /> Submit</>}
        </button>
      </div>
    </div>
  );
}
