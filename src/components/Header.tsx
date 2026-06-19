import { Sun, Users, Settings2, Bell } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { Role, RoleLabels } from '../types';

export default function Header() {
  const { role, dispatch, strategyStats } = useApp();

  const roles: Role[] = ['dispatcher', 'operator', 'maintenance'];

  return (
    <header className="bg-white border-b border-ink-200 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-solar-500 to-solar-700 flex items-center justify-center text-white">
            <Sun size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-ink-800 leading-tight">光伏电站逆变器限发策略管理</h1>
            <p className="text-xs text-ink-500">PV Inverter Curtailment Strategy System</p>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-solar-50 text-solar-700 text-sm">
            <span className="inline-block w-2 h-2 rounded-full bg-solar-500 animate-pulse"></span>
            策略达成率 <b className="text-base">{strategyStats.achievementRate}%</b>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-100">
            <Users size={16} className="text-ink-500 ml-2" />
            {roles.map(r => (
              <button
                key={r}
                onClick={() => dispatch({ type: 'SET_ROLE', role: r })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  role === r
                    ? 'bg-white text-ink-800 shadow-sm'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {RoleLabels[r]}
              </button>
            ))}
          </div>

          <button className="relative w-9 h-9 rounded-xl bg-ink-50 hover:bg-ink-100 flex items-center justify-center text-ink-600 transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger-500"></span>
          </button>

          <div className="flex items-center gap-2 pl-4 border-l border-ink-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-grid-500 to-grid-700 flex items-center justify-center text-white text-sm font-bold">
              {RoleLabels[role][0]}
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-ink-800 leading-tight">{RoleLabels[role]}</p>
              <p className="text-xs text-ink-500">当前视图</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
