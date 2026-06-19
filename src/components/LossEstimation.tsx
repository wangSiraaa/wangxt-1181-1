import {
  TrendingDown, Zap, DollarSign, AlertTriangle, Server,
  WifiOff, Target, BarChart3, Wrench
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';

export default function LossEstimation() {
  const { lossEstimation, strategyStats, activeStrategy, inverters } = useApp();

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
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-danger-50 to-rose-50 border border-danger-100">
            <DollarSign size={18} className="text-danger-600" />
            <div>
              <p className="text-[11px] text-danger-600 leading-tight">预计经济损失</p>
              <p className="text-xl font-black text-danger-700 leading-tight">¥ {lossEstimation.estimatedRevenueLoss.toLocaleString()}</p>
            </div>
          </div>
        </div>

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
