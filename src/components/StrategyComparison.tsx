import { useState, useMemo } from 'react';
import {
  X, GitCompare, Target, Clock, Zap, TrendingDown, AlertTriangle,
  BarChart3, CheckCircle2, XCircle, WifiOff, Wrench, User,
  CalendarDays, ChevronDown, ChevronUp, BarChart2
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import {
  UnavailableReasonLabels,
  RoleLabels,
  ExecutionStatusLabels
} from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line
} from 'recharts';

export default function StrategyComparison() {
  const { 
    strategies, 
    dispatch, 
    calcStatsForStrategy, 
    calcLossForStrategy,
    role,
    inverters 
  } = useApp();
  
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<'table' | 'chart'>('table');

  const comparisonData = useMemo(() => {
    return strategies.slice(0, 5).map(strategy => ({
      strategy,
      stats: calcStatsForStrategy(strategy),
      loss: calcLossForStrategy(strategy),
      durationMinutes: strategy.executionDurationMinutes || 0,
      durationLabel: strategy.isActive 
        ? '执行中' 
        : strategy.executionDurationMinutes 
          ? `${Math.floor(strategy.executionDurationMinutes / 60)}h ${strategy.executionDurationMinutes % 60}m`
          : '未执行'
    }));
  }, [strategies, calcStatsForStrategy, calcLossForStrategy]);

  const chartData = useMemo(() => {
    return comparisonData.map((item, idx) => ({
      name: `V${comparisonData.length - idx}`,
      fullName: item.strategy.name,
      目标比例: item.strategy.targetRatio,
      达成率: item.stats.achievementRate,
      总损失: item.loss.totalLoss,
      执行时长: item.durationMinutes,
      已执行: item.stats.executedCount,
      未执行: item.stats.notExecutedCount,
      已剔除: item.stats.excludedCount
    })).reverse();
  }, [comparisonData]);

  const handleClose = () => {
    dispatch({ type: 'TOGGLE_STRATEGY_COMPARISON', show: false });
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1600px] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-ink-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-grid-500 to-grid-700 flex items-center justify-center text-white">
              <GitCompare size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink-800">策略版本对比</h2>
              <p className="text-xs text-ink-500">
                调度员连续下发多版限发比例时的版本对比、执行时段和发电损失分析
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex p-1 rounded-xl bg-ink-100">
              <button
                onClick={() => setCompareMode('table')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  compareMode === 'table'
                    ? 'bg-white text-ink-800 shadow-sm'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                <BarChart2 size={14} className="inline mr-1.5" /> 表格对比
              </button>
              <button
                onClick={() => setCompareMode('chart')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  compareMode === 'chart'
                    ? 'bg-white text-ink-800 shadow-sm'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                <BarChart3 size={14} className="inline mr-1.5" /> 图表分析
              </button>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-xl hover:bg-ink-100 text-ink-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {compareMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-grid-50 to-blue-50 text-ink-700 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 font-semibold text-left sticky left-0 bg-gradient-to-r from-grid-50 to-blue-50 z-10">对比项</th>
                    {comparisonData.map((item, idx) => (
                      <th 
                        key={item.strategy.id} 
                        className={`px-4 py-3 font-semibold text-center ${
                          item.strategy.isActive ? 'bg-solar-50 text-solar-700' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            item.strategy.isActive
                              ? 'bg-solar-500 text-white'
                              : idx === 0
                                ? 'bg-grid-500 text-white'
                                : 'bg-ink-200 text-ink-600'
                          }`}>
                            {item.strategy.isActive ? '活跃' : `V${comparisonData.length - idx}`}
                          </span>
                          <span className="font-black text-ink-800 text-base">{item.strategy.targetRatio}%</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  <tr className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-700 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <Target size={14} className="text-grid-600" /> 策略名称
                      </div>
                    </td>
                    {comparisonData.map(item => (
                      <td key={item.strategy.id} className={`px-4 py-3 text-center ${
                        item.strategy.isActive ? 'bg-solar-50/30' : ''
                      }`}>
                        <div className="font-semibold text-ink-800">{item.strategy.name}</div>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-700 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-grid-600" /> 下发人
                      </div>
                    </td>
                    {comparisonData.map(item => (
                      <td key={item.strategy.id} className={`px-4 py-3 text-center ${
                        item.strategy.isActive ? 'bg-solar-50/30' : ''
                      }`}>
                        <span className="text-ink-600">{item.strategy.issuedBy}</span>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-700 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-grid-600" /> 执行时段
                      </div>
                    </td>
                    {comparisonData.map(item => (
                      <td key={item.strategy.id} className={`px-4 py-3 text-center ${
                        item.strategy.isActive ? 'bg-solar-50/30' : ''
                      }`}>
                        <div className="text-ink-700">
                          <div className="text-xs text-ink-500">开始</div>
                          <div className="font-medium">{formatTime(item.strategy.effectiveFrom)}</div>
                          {item.strategy.effectiveTo && (
                            <>
                              <div className="text-xs text-ink-500 mt-1">结束</div>
                              <div className="font-medium">{formatTime(item.strategy.effectiveTo)}</div>
                            </>
                          )}
                          <div className={`mt-1 text-xs font-semibold ${
                            item.strategy.isActive ? 'text-solar-600' : 'text-ink-500'
                          }`}>
                            时长：{item.durationLabel}
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-700 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-solar-600" /> 策略达成率
                      </div>
                    </td>
                    {comparisonData.map(item => (
                      <td key={item.strategy.id} className={`px-4 py-3 text-center ${
                        item.strategy.isActive ? 'bg-solar-50/30' : ''
                      }`}>
                        <div className={`text-2xl font-black ${
                          item.stats.achievementRate >= 90 ? 'text-solar-600' :
                          item.stats.achievementRate >= 70 ? 'text-warn-600' : 'text-danger-600'
                        }`}>
                          {item.stats.achievementRate}%
                        </div>
                        <div className="text-xs text-ink-500 mt-1">
                          已执行 {item.stats.executedCount} / {item.stats.totalCount - item.stats.excludedCount}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-700 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <TrendingDown size={14} className="text-danger-600" /> 日发电损失
                      </div>
                    </td>
                    {comparisonData.map(item => (
                      <td key={item.strategy.id} className={`px-4 py-3 text-center ${
                        item.strategy.isActive ? 'bg-solar-50/30' : ''
                      }`}>
                        <div className="text-xl font-black text-danger-600">
                          {item.loss.totalLoss.toLocaleString()} kWh
                        </div>
                        <div className="text-xs text-ink-500">
                          约 ¥{item.loss.estimatedRevenueLoss.toLocaleString()}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-700 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-solar-600" /> 预期出力
                      </div>
                    </td>
                    {comparisonData.map(item => (
                      <td key={item.strategy.id} className={`px-4 py-3 text-center ${
                        item.strategy.isActive ? 'bg-solar-50/30' : ''
                      }`}>
                        <div className="text-lg font-bold text-ink-700">
                          {Math.round(item.strategy.expectedPower).toLocaleString()} kW
                        </div>
                        {item.strategy.lossDetail && (
                          <div className="text-xs text-ink-500">
                            实际 {Math.round(item.strategy.lossDetail.actualPower).toLocaleString()} kW
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-ink-50">
                    <td className="px-4 py-3 font-medium text-ink-700 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-2">
                        <BarChart3 size={14} className="text-grid-600" /> 损失构成
                      </div>
                    </td>
                    {comparisonData.map(item => (
                      <td key={item.strategy.id} className={`px-4 py-3 ${
                        item.strategy.isActive ? 'bg-solar-50/30' : ''
                      }`}>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-warn-600 flex items-center gap-1">
                              <Target size={10} /> 限发损失
                            </span>
                            <span className="font-medium">{item.loss.curtailmentLoss} kWh</span>
                          </div>
                          <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden">
                            <div className="h-full bg-warn-500" style={{ width: `${(item.loss.curtailmentLoss / Math.max(item.loss.totalLoss, 1)) * 100}%` }} />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-grid-600 flex items-center gap-1">
                              <Wrench size={10} /> 检修损失
                            </span>
                            <span className="font-medium">{item.loss.maintenanceLoss} kWh</span>
                          </div>
                          <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden">
                            <div className="h-full bg-grid-500" style={{ width: `${(item.loss.maintenanceLoss / Math.max(item.loss.totalLoss, 1)) * 100}%` }} />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-danger-600 flex items-center gap-1">
                              <WifiOff size={10} /> 通讯中断
                            </span>
                            <span className="font-medium">{item.loss.commLostLoss} kWh</span>
                          </div>
                          <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden">
                            <div className="h-full bg-danger-500" style={{ width: `${(item.loss.commLostLoss / Math.max(item.loss.totalLoss, 1)) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-ink-700 sticky left-0 bg-white z-10">
                      <button
                        onClick={() => setExpandedStrategy(expandedStrategy === 'excluded' ? null : 'excluded')}
                        className="flex items-center gap-2 hover:text-grid-600 transition-colors"
                      >
                        {expandedStrategy === 'excluded' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <XCircle size={14} className="text-grid-600" /> 已剔除设备明细
                      </button>
                    </td>
                    {comparisonData.map(item => (
                      <td key={item.strategy.id} className={`px-4 py-3 text-center ${
                        item.strategy.isActive ? 'bg-solar-50/30' : ''
                      }`}>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-grid-50 text-grid-700 text-xs font-semibold">
                          <Wrench size={12} /> {item.stats.excludedCount} 台
                        </span>
                      </td>
                    ))}
                  </tr>
                  {expandedStrategy === 'excluded' && comparisonData.map((item, idx) => (
                    <tr key={`excluded-${item.strategy.id}`} className="bg-grid-50/50">
                      <td className="px-4 py-2 text-xs text-ink-500 sticky left-0 bg-grid-50/50 z-10">
                        V{comparisonData.length - idx} 剔除设备
                      </td>
                      <td colSpan={comparisonData.length} className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          {item.strategy.excludedInverters?.map(exc => (
                            <div key={exc.inverterId} className="bg-white rounded-lg p-2 border border-grid-200 text-xs">
                              <div className="font-semibold text-ink-800">{exc.inverterCode}</div>
                              <div className="text-ink-500">{UnavailableReasonLabels[exc.reason]}</div>
                              <div className="text-ink-400 text-[10px] mt-1">
                                <User size={10} className="inline" /> {exc.registeredBy}
                              </div>
                              {exc.expectedRestore && (
                                <div className="text-grid-600 text-[10px]">
                                  <CalendarDays size={10} className="inline" /> 预计恢复: {formatTime(exc.expectedRestore)}
                                </div>
                              )}
                            </div>
                          ))}
                          {(!item.strategy.excludedInverters || item.strategy.excludedInverters.length === 0) && (
                            <span className="text-ink-400">无剔除设备</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-4 py-3 font-medium text-ink-700 sticky left-0 bg-white z-10">
                      <button
                        onClick={() => setExpandedStrategy(expandedStrategy === 'commlost' ? null : 'commlost')}
                        className="flex items-center gap-2 hover:text-danger-600 transition-colors"
                      >
                        {expandedStrategy === 'commlost' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <WifiOff size={14} className="text-danger-600" /> 通讯中断设备
                      </button>
                    </td>
                    {comparisonData.map(item => (
                      <td key={item.strategy.id} className={`px-4 py-3 text-center ${
                        item.strategy.isActive ? 'bg-solar-50/30' : ''
                      }`}>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-danger-50 text-danger-700 text-xs font-semibold">
                          <WifiOff size={12} /> {item.stats.unknownCount + item.stats.pendingRecalcCount} 台
                        </span>
                      </td>
                    ))}
                  </tr>
                  {expandedStrategy === 'commlost' && comparisonData.map((item, idx) => (
                    <tr key={`commlost-${item.strategy.id}`} className="bg-danger-50/50">
                      <td className="px-4 py-2 text-xs text-ink-500 sticky left-0 bg-danger-50/50 z-10">
                        V{comparisonData.length - idx} 中断设备
                      </td>
                      <td colSpan={comparisonData.length} className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          {item.strategy.commLostInverters?.map(comm => (
                            <div key={comm.inverterId} className="bg-white rounded-lg p-2 border border-danger-200 text-xs">
                              <div className="font-semibold text-ink-800">{comm.inverterCode}</div>
                              <div className="text-danger-600 text-[10px]">
                                <Clock size={10} className="inline" /> 中断: {formatTime(comm.lostAt)}
                              </div>
                              <div className="text-ink-500 text-[10px]">
                                影响 {comm.capacity} kW
                              </div>
                            </div>
                          ))}
                          {(!item.strategy.commLostInverters || item.strategy.commLostInverters.length === 0) && (
                            <span className="text-ink-400">无通讯中断设备</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-5 border border-ink-100">
                  <h3 className="text-sm font-bold text-ink-800 mb-4 flex items-center gap-2">
                    <Target size={16} className="text-grid-600" /> 目标比例 vs 达成率
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="目标比例" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="达成率" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-ink-100">
                  <h3 className="text-sm font-bold text-ink-800 mb-4 flex items-center gap-2">
                    <TrendingDown size={16} className="text-danger-600" /> 各版本发电损失对比
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="总损失" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-ink-100">
                  <h3 className="text-sm font-bold text-ink-800 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-solar-600" /> 执行状态分布
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="已执行" stackId="a" fill="#22c55e" />
                        <Bar dataKey="未执行" stackId="a" fill="#f59e0b" />
                        <Bar dataKey="已剔除" stackId="a" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-ink-100">
                  <h3 className="text-sm font-bold text-ink-800 mb-4 flex items-center gap-2">
                    <Clock size={16} className="text-ink-600" /> 执行时长趋势
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="执行时长" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-ink-100 bg-ink-50 flex items-center justify-between">
          <div className="text-xs text-ink-500">
            <AlertTriangle size={12} className="inline mr-1.5 text-warn-600" />
            当前视图：{RoleLabels[role]} · 共 {comparisonData.length} 个策略版本参与对比
          </div>
          <button
            onClick={handleClose}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-grid-600 to-grid-700 text-white hover:shadow-md transition-all"
          >
            关闭对比
          </button>
        </div>
      </div>
    </div>
  );
}
