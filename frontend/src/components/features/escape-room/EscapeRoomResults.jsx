import { useNavigate } from 'react-router-dom';
import { Trophy, Home, Award, Clock, Target, Cpu } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';

export default function EscapeRoomResults({ attempt }) {
  const navigate = useNavigate();

  const chartOptions = {
    chart: { type: 'radar', toolbar: { show: false }, background: 'transparent' },
    xaxis: { 
      categories: ['Coding', 'Logic', 'Speed', 'Accuracy'],
      labels: { style: { colors: ['#9ca3af', '#9ca3af', '#9ca3af', '#9ca3af'], fontSize: '12px', fontFamily: 'monospace' } }
    },
    yaxis: { show: false, min: 0, max: 100 },
    stroke: { width: 2, colors: ['#3b82f6'] },
    fill: { opacity: 0.2, colors: ['#3b82f6'] },
    markers: { size: 4, colors: ['#fff'], strokeColors: '#3b82f6', strokeWidth: 2 },
    theme: { mode: 'dark' }
  };

  const chartSeries = [{
    name: 'Score',
    data: [attempt.coding_score || 0, attempt.logic_score || 0, attempt.speed_score || 80, attempt.accuracy_score || 90]
  }];

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-3xl bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl p-10 text-center relative overflow-hidden">
        
        {/* Confetti / BG effects could go here */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 via-accent-500 to-green-500" />
        
        <div className="mx-auto w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center border-4 border-gray-900 shadow-xl mb-6 relative z-10">
          <Trophy className="h-10 w-10 text-yellow-500" />
        </div>

        <h1 className="text-4xl font-black text-white uppercase tracking-tight mb-2">System Restored</h1>
        <p className="text-gray-400 mb-8">Lockdown averted. The network is secure.</p>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6">Performance Radar</h3>
            <div className="h-[250px]">
              <ReactApexChart options={chartOptions} series={chartSeries} type="radar" height="100%" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 flex-1 flex flex-col justify-center">
              <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Final Score</div>
              <div className="text-6xl font-black text-brand-400">{attempt.total_score}</div>
              <div className="text-sm text-gray-500 mt-2">Rank: <span className="text-white font-bold">A-Rank</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-400" />
                <div className="text-left">
                  <div className="text-xs text-gray-500 uppercase">Time</div>
                  <div className="text-lg font-bold text-white">04:32</div>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex items-center gap-3">
                <Target className="h-8 w-8 text-red-400" />
                <div className="text-left">
                  <div className="text-xs text-gray-500 uppercase">Mistakes</div>
                  <div className="text-lg font-bold text-white">2</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <button
          onClick={() => navigate('/escape-room')}
          className="btn-primary w-full max-w-sm mx-auto h-12 text-lg font-bold gap-2"
        >
          <Home className="h-5 w-5" /> Return to HQ
        </button>
      </div>
    </div>
  );
}
