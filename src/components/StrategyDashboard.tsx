import { useState } from 'react';
import {
  Send, Zap, Target, Clock, CheckSquare, Square, Power, AlertTriangle,
  GitCompare, RefreshCw, Wifi, AlertCircle
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { RoleLabels } from '../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function StrategyDashboard() {
  const { 
    role, 
    dispatch, 
    activeStrategy, 
    strategyStats, 
    lossEstimation, 
    strategies, 
    inverters,
    strategyStats: stats
  } = useApp();
  const canIssue = role === 'dispatcher';
  const [showForm, setShowForm] = useState(false);
  const [ratio, setRatio] = useState(activeStrategy?.targetRatio ?? 30);
  const [name, setName] = useState('');

  const pendingRecalcInverters = inverters.filter(i => i.status === 'comm_restored' || i.executionStatus === 'pending_recalc');

  const pieData = [
    { name: '已执行', value: strategyStats.executedCount, color: COLORS[0] },
    { name: '未执行', value: strategyStats.notExecutedCount, color: COLORS[2] },
    { name: '已剔除(检修)', value: strategyStats.excludedCount, color: COLORS[1] },
    { name: '未知(通讯中断)', value: strategyStats.unknownCount, color: COLORS[3] },
    { name: '待重算(通讯恢复)', value: strategyStats.pendingRecalcCount, color: COLORS[4] }
  ].filter(d => d.value > 0);

  const areaData = Array.from(new Set(inverters.map(i => i.area))).map(area => {
    const list = inverters.filter(i => i.area === area);
    const executed = list.filter(i => i.executionStatus === 'executed').length;
    const others = list.length - executed;
    return { name: area.replace(/[方区号#-]/g, '').slice(0, 4), 已执行: executed, 其他: others };
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      dispatch({ type: 'SHOW_TOAST', toast: { type: 'warn', msg: '请输入策略名称' } });
      return;
    }
    if (ratio < 0 || ratio > 100) {
      dispatch({ type: 'SHOW_TOAST', toast: { type: 'error', msg: '限发比例必须在0-100之间' } });
      return;
    }
    dispatch({
      type: 'ISSUED_STRATEGY',
      targetRatio: ratio,
      name: name.trim(),
      issuedBy: `${RoleLabels[role]}-当前用户`
    });
    setShowForm(false);
    setName('');
  };

  const handleRelease = () => {
    if (!activeStrategy) return;
    if (!confirm('确定解除当前限发策略？解除后所有正常设备将恢复满发。')) return;
    dispatch({ type: 'RELEASE_STRATEGY', strategyId: activeStrategy.id });
  };

  const openComparison = () => {
    dispatch({ type: 'TOGGLE_STRATEGY_COMPARISON', show: true });
  };

  const simulateCommRestore = (invId: string) => {
    const inv = inverters.find(i => i.id === invId);
    if (!inv) return;
    const returnedPower = inv.ratedCapacity * (0.5 + Math.random() * 0.4);
    dispatch({
      type: 'COMMUNICATION_RESTORED',
      payload: {
        inverterId: invId,
        returnedPower: Math.round(returnedPower * 10) / 10,
        restoredAt: new Date().toISOString()
      }
    });
  };

  return (
    <div className="space-y-5">
      {pendingRecalcInverters.length > 0 && (
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <RefreshCw className="text-violet-600 animate-spin" size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-violet-800 flex items-center gap-2">
                通讯恢复待判设备提醒
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-600 text-white text-xs font-bold">
                  {pendingRecalcInverters.length} 台
                </span>
              </h3>
              <p className="text-sm text-violet-700 mt-1">
                以下设备通讯已恢复，<b>禁止直接标记为已执行</b>，必须根据回传功率重新计算达成率：
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingRecalcInverters.map(inv => (
                  <div key={inv.id} className="bg-white rounded-lg px-3 py-2 border border-violet-200 text-sm">
                    <span className="font-mono font-semibold text-violet-800">{inv.code}</span>
                    <span className="text-violet-600 ml-2">回传功率: {inv.returnedPower?.toFixed(1) || inv.currentPower.toFixed(1)} kW</span>
                    <button
                      onClick={() => dispatch({
                        type: 'RECALCULATE_ACHIEVEMENT',
                        payload: { inverterId: inv.id, recalculatedBy: `${RoleLabels[role]}-当前用户` }
                      })}
                      className="ml-2 px-2 py-0.5 rounded bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 transition-colors"
                    >
                      重新计算
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="text-grid-600" />}
          title="当前限发比例"
          main={`${activeStrategy?.targetRatio ?? 0}%`}
          sub={activeStrategy ? activeStrategy.name : '暂无活跃策略'}
          gradient="from-grid-50 to-blue-50"
        />
        <StatCard
          icon={<CheckSquare className="text-solar-600" />}
          title="策略达成率"
          main={`${strategyStats.achievementRate}%`}
          sub={`已执行 ${strategyStats.executedCount} / 可用 ${strategyStats.totalCount - strategyStats.excludedCount - strategyStats.unknownCount - strategyStats.pendingRecalcCount} 台`}
          gradient="from-solar-50 to-green-50"
        />
        <StatCard
          icon={<AlertTriangle className="text-warn-600" />}
          title="异常设备"
          main={`${strategyStats.excludedCount + strategyStats.unknownCount + strategyStats.pendingRecalcCount} 台`}
          sub={`检修中 ${strategyStats.excludedCount} · 中断 ${strategyStats.unknownCount} · 待判 ${strategyStats.pendingRecalcCount}`}
          gradient="from-warn-50 to-amber-50"
        />
        <StatCard
          icon={<Zap className="text-danger-600" />}
          title="日发电损失估算"
          main={`${lossEstimation.totalLoss} kWh`}
          sub={`约 ¥${lossEstimation.estimatedRevenueLoss}`}
          gradient="from-danger-50 to-rose-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-ink-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-ink-800 flex items-center gap-2">
                <Clock size={18} className="text-grid-600" /> 限发策略看板
              </h2>
              <p className="text-xs text-ink-500 mt-0.5">
                当前策略执行情况 · 下发时间：{activeStrategy ? new Date(activeStrategy.issuedAt).toLocaleString('zh-CN') : '-'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openComparison}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors border border-violet-200"
              >
                <GitCompare size={16} /> 版本对比
              </button>
              {strategies.filter(s => !s.isActive).length > 0 && (
                <button
                  onClick={() => simulateCommRestore('inv-028')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200"
                  title="模拟INV-028通讯恢复"
                >
                  <Wifi size={16} /> 模拟通讯恢复
                </button>
              )}
              {canIssue && activeStrategy && (
                <button
                  onClick={handleRelease}
                  disabled={!activeStrategy.isActive}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-warn-700 bg-warn-50 hover:bg-warn-100 transition-colors disabled:opacity-50"
                >
                  <Power size={16} /> 解除限发
                </button>
              )}
              {canIssue && (
                <button
                  onClick={() => setShowForm(s => !s)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-grid-600 to-grid-700 text-white hover:shadow-md transition-all"
                >
                  <Send size={16} /> {showForm ? '收起' : '下发新策略'}
                </button>
              )}
            </div>
          </div>

          {showForm && canIssue && (
            <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-grid-50 to-blue-50 border border-grid-100">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <label className="text-xs font-medium text-ink-600 mb-1 block">策略名称</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="如：6月19日 电网调峰限发"
                    className="w-full px-3 py-2 rounded-lg border border-ink-200 focus:border-grid-500 focus:ring-2 focus:ring-grid-100 outline-none text-sm"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="text-xs font-medium text-ink-600 mb-1 block">目标限发比例：<b className="text-grid-700">{ratio}%</b></label>
                  <input
                    type="range" min={0} max={80} step={5}
                    value={ratio}
                    onChange={e => setRatio(Number(e.target.value))}
                    className="w-full accent-grid-600"
                  />
                  <div className="flex justify-between text-[10px] text-ink-400 mt-0.5">
                    <span>0%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span>
                  </div>
                </div>
                <div className="md:col-span-3">
                  <button
                    onClick={handleSubmit}
                    className="w-full px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-grid-600 to-grid-700 text-white hover:shadow-md transition-all"
                  >
                    立即下发
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h3 className="text-sm font-semibold text-ink-700 mb-3">执行状态分布</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-700 mb-3">各区域执行情况</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip />
                    <Bar dataKey="已执行" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="其他" stackId="a" fill="#f1f5f9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-ink-100">
          <h2 className="text-base font-bold text-ink-800 flex items-center gap-2 mb-4">
            <Square size={18} className="text-ink-600" /> 策略历史
          </h2>
          <div className="space-y-3 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
            {strategies.map((s, idx) => (
              <div
                key={s.id}
                className={`p-3 rounded-xl border-2 transition-colors ${
                  s.isActive
                    ? 'border-solar-200 bg-solar-50'
                    : 'border-ink-100 bg-ink-50 hover:bg-ink-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {s.isActive && (
                      <span className="inline-block w-2 h-2 rounded-full bg-solar-500 animate-pulse" />
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      s.isActive
                        ? 'bg-solar-500 text-white'
                        : 'bg-ink-200 text-ink-600'
                    }`}>
                      {idx === 0 ? '最新' : s.isActive ? '活跃' : '历史'}
                    </span>
                  </div>
                  <span className="text-lg font-black text-ink-800">{s.targetRatio}%</span>
                </div>
                <p className="text-sm font-medium text-ink-800 line-clamp-1">{s.name}</p>
                <div className="mt-2 pt-2 border-t border-ink-100 text-[11px] text-ink-500 grid grid-cols-2 gap-1">
                  <span>下发：{new Date(s.issuedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-right">容量：{s.totalCapacity} kW</span>
                  {s.effectiveTo && (
                    <>
                      <span className="col-span-2">
                        解除：{new Date(s.effectiveTo).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, title, main, sub, gradient
}: {
  icon: React.ReactNode;
  title: string;
  main: string;
  sub: string;
  gradient: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 border border-ink-100 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-ink-600">{title}</p>
          <p className="mt-2 text-2xl font-black text-ink-800 tracking-tight">{main}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
          {icon}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-ink-500 leading-relaxed">{sub}</p>
    </div>
  );
}
