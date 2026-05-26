import { useState } from 'react';
import { Network, ArrowUp, ArrowDown, Send } from 'lucide-react';

export default function LogicFlowPuzzle({ puzzle, onSubmit, isSubmitting }) {
  const [blocks, setBlocks] = useState(puzzle.initial_state.blocks);

  const moveBlock = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const newBlocks = [...blocks];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      setBlocks(newBlocks);
    } else if (direction === 'down' && index < blocks.length - 1) {
      const newBlocks = [...blocks];
      [newBlocks[index + 1], newBlocks[index]] = [newBlocks[index], newBlocks[index + 1]];
      setBlocks(newBlocks);
    }
  };

  const handleSubmit = () => {
    onSubmit({ order: blocks.map(b => b.id) });
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Network className="h-6 w-6 text-brand-400" />
          {puzzle.title}
        </h3>
        <p className="text-gray-400 mt-2">{puzzle.description}</p>
      </div>

      <div className="flex-1 bg-gray-900 rounded-xl border border-gray-700 p-6 shadow-inner flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-3">
          {blocks.map((block, index) => (
            <div 
              key={block.id} 
              className="flex items-center gap-4 bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg transition-all hover:border-brand-500"
            >
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => moveBlock(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => moveBlock(index, 'down')}
                  disabled={index === blocks.length - 1}
                  className="p-1 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex-1 text-white font-medium">
                <span className="text-brand-400 mr-3 font-mono">{index + 1}.</span>
                {block.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn-primary gap-2 bg-brand-600 hover:bg-brand-500"
        >
          {isSubmitting ? 'Evaluating...' : <><Send className="h-4 w-4" /> Submit Sequence</>}
        </button>
      </div>
    </div>
  );
}
