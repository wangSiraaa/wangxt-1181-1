import { useState, useMemo } from 'react';
import {
  TrendingDown, Zap, DollarSign, AlertTriangle, Server,
  WifiOff, Target, BarChart3, Wrench, GitCompare, ChevronDown,
  Check, X
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';
import { CurtailmentStrategy, LossEstimation as LossEstimationType, StrategyStats } from '../types';

export default function LossEstimation() {
  const { lossEstimation, strategyStats, activeStrategy, inverters, strategies, calcLossForStrategy, calcStatsForStrategy } = useApp();
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>(activeStrategy ? [activeStrategy.id] : []);
  const [showStrategySelector, setShowStrategySelector] = useState(false);

  const toggleStrategySelection = (strategyId: string) => {
    setSelectedStrategyIds(prev => {
      if (prev.includes(strategyId)) {
        return prev.filter(id => id !== strategyId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), strategyId];
      }
      return [...prev, strategyId];
    });
  };

  const strategyComparisonData = useMemo(() => {
    return selectedStrategyIds.map(id => {
      const strategy = strategies.find(s => s.id === id);
      if (!strategy) return null;
      const loss = calcLossForStrategy(strategy);
      const stats = calcStatsForStrategy(strategy);
      const duration = strategy.effectiveTo
        ? Math.round((new Date(strategy.effectiveTo).getTime() - new Date(strategy.effectiveFrom).getTime()) / 60000)
        : Math.round((Date.now() - new Date(strategy.effectiveFrom).getTime()) / 60000);
      return { strategy, loss, stats, duration };
    }).filter(Boolean) as { strategy: CurtailmentStrategy; loss: LossEstimationType; stats: StrategyStats; duration: number }[];
  }, [selectedStrategyIds, strategies, calcLossForStrategy, calcStatsForStrategy]);

  const comparisonChartData = useMemo(() => {
    return strategyComparisonData.map((item, idx) => ({
      name: `V${strategies.length - idx} ${item.strategy.targetRatio}%`,
      限发损失: item.loss.curtailmentLoss,
      检修损失: item.loss.maintenanceLoss,
      通讯中断损失: item.loss.commLostLoss,
      总损失: item.loss.totalLoss,
      达成率: item.stats.achievementRate,
      执行时长: item.duration
    }));
  }, [strategyComparisonData, strategies.length]);

  const compositionData = [
    {
      name: '限发损失',
      value: lossEstimation.curtailmentLoss,
      capacity: lossEstimation.normalCapacity,
      color: '#f59e0b',
      icon: Target
    },
    {
      name: '检修损失',
      value: lossEstimation.maintenanceLoss,
      capacity: lossEstimation.maintenanceCapacity,
      color: '#3b82f6',
      icon: Wrench
    },
    {
      name: '通讯中断损失',
      value: lossEstimation.commLostLoss,
      capacity: lossEstimation.commLostCapacity,
      color: '#ef4444',
      icon: WifiOff
    }
  ];

  const maxVal = Math.max(...compositionData.map(d => d.value), 1);

  const hourlyForecast = Array.from({ length: 12 }, (_, i) => {
    const h = 8 + i;
    const hourLabel = `${String(h).padStart(2, '0')}:00`;
    const irradianceFactor = Math.sin(((h - 6) / 12) * Math.PI);
    const baseFactor = Math.max(0, irradianceFactor);
    const targetRatio = activeStrategy?.targetRatio ?? 0;
    const totalCap = lossEstimation.totalCapacity;
    const normalCap = lossEstimation.normalCapacity;
    const maintCap = lossEstimation.maintenanceCapacity;
    const commCap = lossEstimation.commLostCapacity;

    const actualPower = normalCap * (1 - targetRatio / 100) * 0.85 * baseFactor;
    const curtailmentLoss = normalCap * (targetRatio / 100) * 0.85 * baseFactor;
    const maintLoss = maintCap * 0.85 * baseFactor;
    const commLoss = commCap * 0.85 * baseFactor;

    return {
      time: hourLabel,
      '实际发电(kW)': Math.round(actualPower),
      '限发损失(kW)': Math.round(curtailmentLoss),
      '检修损失(kW)': Math.round(maintLoss),
      '通讯中断(kW)': Math.round(commLoss),
      '理论峰值(kW)': Math.round(totalCap * 0.85 * baseFactor)
    };
  });

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-ink-100">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-bold text-ink-800 flex items-center gap-2">
              <TrendingDown size={18} className="text-danger-600" /> 发电损失估算
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              基于当日峰值日照时长 4.2h · 电价 ¥0.38/kWh · 实时联动设备状态
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowStrategySelector(s => !s)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 transition-colors"
              >
                <GitCompare size={16} />
                <span className="text-sm font-medium">
                  对比策略版本 ({selectedStrategyIds.length}/3)
                </span>
                <ChevronDown size={14} className={`transition-transform ${showStrategySelector ? 'rotate-180' : ''}`} />
              </button>
              {showStrategySelector && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-ink-200 z-20 overflow-hidden">
                  <div className="p-3 border-b border-ink-100 bg-ink-50">
                    <p className="text-xs font-medium text-ink-600">选择最多3个策略进行对比</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {strategies.map((s, idx) => (
                      <div
                        key={s.id}
                        onClick={() => toggleStrategySelection(s.id)}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-ink-50 cursor-pointer transition-colors ${
                          selectedStrategyIds.includes(s.id) ? 'bg-violet-50' : ''
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedStrategyIds.includes(s.id)
                            ? 'bg-violet-600 border-violet-600'
                            : 'border-ink-300'
                        }`}>
                          {selectedStrategyIds.includes(s.id) && <Check size={12} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-ink-800">V{strategies.length - idx}</span>
                            <span className="text-xs font-bold text-violet-600">{s.targetRatio}%</span>
                            {s.isActive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-solar-100 text-solar-700">活跃</span>
                            )}
                          </div>
                          <p className="text-xs text-ink-500 truncate">{s.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-ink-100 flex justify-end">
                    <button
                      onClick={() => setShowStrategySelector(false)}
                      className="px-3 py-1.5 text-xs text-ink-500 hover:text-ink-700"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-danger-50 to-rose-50 border border-danger-100">
              <DollarSign size={18} className="text-danger-600" />
              <div>
                <p className="text-[11px] text-danger-600 leading-tight">预计经济损失</p>
                <p className="text-xl font-black text-danger-700 leading-tight">¥ {lossEstimation.estimatedRevenueLoss.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {strategyComparisonData.length > 1 && (
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200">
            <h3 className="text-sm font-semibold text-violet-800 mb-3 flex items-center gap-2">
              <GitCompare size={16} /> 策略版本损失对比
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={comparisonChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6d28d9' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar yAxisId="left" dataKey="限发损失" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="检修损失" stackId="a" fill="#3b82f6" />
                  <Bar yAxisId="left" dataKey="通讯中断损失" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="达成率" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              {strategyComparisonData.map((item, idx) => (
                <div key={item.strategy.id} className="bg-white rounded-lg p-3 border border-violet-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-violet-700">
                      V{strategies.length - idx} · {item.strategy.name}
                    </span>
                    <span className="text-lg font-black text-violet-800">{item.strategy.targetRatio}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-ink-500">总损失：</span>
                      <span className="font-medium text-danger-600">{item.loss.totalLoss} kWh</span>
                    </div>
                    <div>
                      <span className="text-ink-500">达成率：</span>
                      <span className="font-medium text-solar-600">{item.stats.achievementRate}%</span>
                    </div>
                    <div>
                      <span className="text-ink-500">执行时长：</span>
                      <span className="font-medium text-grid-600">
                        {item.duration >= 60 ? `${Math.floor(item.duration / 60)}h${item.duration % 60}m` : `${item.duration}m`}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-500">经济损失：</span>
                      <span className="font-medium text-warn-600">¥{item.loss.estimatedRevenueLoss}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
          <LossCard
            icon={<Zap size={18} className="text-solar-600" />}
            label="总装机容量"
            value={`${lossEstimation.totalCapacity} kW`}
            sub={`${inverters.length} 台逆变器`}
            bg="from-solar-50 to-green-50"
          />
          <LossCard
            icon={<Server size={18} className="text-grid-600" />}
            label="有效运行容量"
            value={`${lossEstimation.activeCapacity} kW`}
            sub={`${strategyStats.totalCount - strategyStats.excludedCount} 台在网`}
            bg="from-grid-50 to-blue-50"
          />
          <LossCard
            icon={<AlertTriangle size={18} className="text-warn-600" />}
            label="日损失电量"
            value={`${lossEstimation.totalLoss} kWh`}
            sub={`占理论值 ${((lossEstimation.totalLoss / (lossEstimation.totalCapacity * 0.85 * 4.2)) * 100).toFixed(1)}%`}
            bg="from-warn-50 to-amber-50"
          />
          <LossCard
            icon={<BarChart3 size={18} className="text-ink-600" />}
            label="限发比例"
            value={`${strategyStats.activeRatio}%`}
            sub={`达成率 ${strategyStats.achievementRate}%`}
            bg="from-ink-50 to-slate-50"
          />
        </div>

        <div className="space-y-3">
          {compositionData.map(item => {
            const Icon = item.icon;
            const percent = (item.value / maxVal) * 100;
            const lossCapPercent = lossEstimation.totalCapacity === 0 ? 0 : (item.capacity / lossEstimation.totalCapacity) * 100;
            return (
              <div key={item.name} className="p-3 rounded-xl bg-ink-50/80 hover:bg-ink-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm" style={{ color: item.color }}>
                      <Icon size={16} />
                    </div>
                    <span className="text-sm font-semibold text-ink-800">{item.name}</span>
                    <span className="text-[11px] text-ink-500 px-2 py-0.5 rounded-full bg-white border border-ink-200">
                      影响 {item.capacity} kW ({lossCapPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-ink-800">{item.value} kWh</span>
                    <span className="ml-2 text-xs text-ink-500">
                      占损失 {lossEstimation.totalLoss === 0 ? 0 : ((item.value / lossEstimation.totalLoss) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-white overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%`, backgroundColor: item.color }}
                  />
                </div>
              </div>
            );
          })}
          {lossEstimation.totalLoss === 0 && (
            <div className="p-6 text-center text-solar-600 rounded-xl bg-solar-50 border border-solar-100">
              <Zap size={28} className="mx-auto mb-1" />
              <p className="text-sm font-medium">当前无发电损失</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-ink-100">
        <h2 className="text-base font-bold text-ink-800 flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-grid-600" /> 当日出力预测曲线
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={hourlyForecast} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey="实际发电(kW)" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="限发损失(kW)" stackId="a" fill="#f59e0b" />
              <Bar dataKey="检修损失(kW)" stackId="a" fill="#3b82f6" />
              <Bar dataKey="通讯中断(kW)" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="理论峰值(kW)"
                stroke="#0f172a"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function LossCard({
  icon, label, value, sub, bg
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  bg: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${bg} rounded-xl p-4 border border-ink-100`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-ink-600">{label}</p>
          <p className="mt-1.5 text-xl font-black text-ink-800 tracking-tight">{value}</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">
          {icon}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-ink-500">{sub}</p>
    </div>
  );
}
