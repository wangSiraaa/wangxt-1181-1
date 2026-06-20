import React, { useState, useMemo } from 'react';
import {
  Search, SlidersHorizontal, Signal, WifiOff, Wrench, XCircle, CheckCircle2,
  AlertCircle, X, Pencil, Gauge, ChevronDown, ChevronRight, RefreshCw,
  CalendarDays, User, FileText, Wifi, Target, Clock
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import {
  InverterStatus, InverterStatusLabels,
  ExecutionStatus, ExecutionStatusLabels,
  UnavailableReason, UnavailableReasonLabels, RoleLabels
} from '../types';

export default function InverterTable() {
  const { role, dispatch, inverters, activeStrategy } = useApp();
  const canEdit = role === 'operator' || role === 'dispatcher';
  const canRegister = role === 'maintenance' || role === 'operator';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [execFilter, setExecFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [editInv, setEditInv] = useState<string | null>(null);
  const [editRatio, setEditRatio] = useState(0);
  const [registerInv, setRegisterInv] = useState<string | null>(null);
  const [registerReason, setRegisterReason] = useState<UnavailableReason>('fault_inverter');
  const [registerDesc, setRegisterDesc] = useState('');
  const [registerRestore, setRegisterRestore] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRows(newSet);
  };

  const filtered = useMemo(() => {
    return inverters.filter(inv => {
      if (search && !(
        inv.code.toLowerCase().includes(search.toLowerCase()) ||
        inv.name.toLowerCase().includes(search.toLowerCase()) ||
        inv.area.toLowerCase().includes(search.toLowerCase())
      )) return false;
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (execFilter !== 'all' && inv.executionStatus !== execFilter) return false;
      return true;
    });
  }, [inverters, search, statusFilter, execFilter]);

  const startEdit = (id: string, current: number) => {
    setEditInv(id);
    setEditRatio(current);
  };

  const saveEdit = (id: string) => {
    const inv = inverters.find(i => i.id === id);
    if (!inv) return;
    if (inv.status === 'comm_lost') {
      dispatch({ type: 'SHOW_TOAST', toast: { type: 'error', msg: '通讯中断的逆变器无法修改执行比例' } });
      setEditInv(null);
      return;
    }
    if (activeStrategy && activeStrategy.targetRatio > 0 && editRatio === 0) {
      dispatch({ type: 'SHOW_TOAST', toast: { type: 'warn', msg: '限发策略未解除前，不能手动恢复满发（设置0%）' } });
      return;
    }
    if (editRatio < 0 || editRatio > 100) {
      dispatch({ type: 'SHOW_TOAST', toast: { type: 'error', msg: '比例必须在0-100之间' } });
      return;
    }
    dispatch({ type: 'UPDATE_EXECUTION', inverterId: id, curtailmentRatio: editRatio });
    dispatch({ type: 'SHOW_TOAST', toast: { type: 'success', msg: '执行比例已更新' } });
    setEditInv(null);
  };

  const submitRegister = (id: string) => {
    if (!registerDesc.trim()) {
      dispatch({ type: 'SHOW_TOAST', toast: { type: 'warn', msg: '请填写详细原因描述' } });
      return;
    }
    dispatch({
      type: 'REGISTER_MAINTENANCE',
      payload: {
        inverterId: id,
        reason: registerReason,
        description: registerDesc.trim(),
        registeredBy: `${RoleLabels[role]}-当前用户`,
        expectedRestore: registerRestore || undefined
      }
    });
    setRegisterInv(null);
    setRegisterDesc('');
    setRegisterRestore('');
    setRegisterReason('fault_inverter');
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setExecFilter('all');
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-ink-100">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-ink-800 flex items-center gap-2">
            <Gauge size={18} className="text-solar-600" /> 逆变器设备状态
          </h2>
          <p className="text-xs text-ink-500 mt-0.5">
            共 {filtered.length} 台设备 · 目标比例 {activeStrategy?.targetRatio ?? 0}%
            {(role === 'operator' || role === 'dispatcher') && (
              <span className="ml-2 text-grid-600">点击"编辑"可调整单台执行比例</span>
            )}
            {role === 'maintenance' && (
              <span className="ml-2 text-warn-600">点击"登记"可录入设备不可用原因</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索编号/名称/区域"
              className="pl-9 pr-3 py-2 text-sm w-56 rounded-xl border border-ink-200 focus:border-grid-500 focus:ring-2 focus:ring-grid-100 outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
              showFilters
                ? 'bg-grid-50 border-grid-300 text-grid-700'
                : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50'
            }`}
          >
            <SlidersHorizontal size={15} /> 筛选
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {(search || statusFilter !== 'all' || execFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm text-ink-500 hover:text-danger-600 hover:bg-danger-50 transition-colors"
            >
              <X size={14} /> 重置
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="mb-4 p-4 rounded-xl bg-ink-50 border border-ink-100 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 block">设备状态</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-ink-200 bg-white focus:border-grid-500 outline-none text-sm"
            >
              <option value="all">全部状态</option>
              {Object.entries(InverterStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 block">执行状态</label>
            <select
              value={execFilter}
              onChange={e => setExecFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-ink-200 bg-white focus:border-grid-500 outline-none text-sm"
            >
              <option value="all">全部执行</option>
              {Object.entries(ExecutionStatusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="overflow-x-auto -mx-5 scrollbar-thin">
        <table className="w-full text-sm min-w-[1100px]">
          <thead>
            <tr className="bg-ink-50 text-left text-ink-600 text-xs uppercase tracking-wide">
              <th className="px-2 py-3 font-semibold w-8"></th>
              <th className="px-5 py-3 font-semibold">编号</th>
              <th className="px-2 py-3 font-semibold">设备名称</th>
              <th className="px-2 py-3 font-semibold">区域</th>
              <th className="px-2 py-3 font-semibold">额定/当前功率</th>
              <th className="px-2 py-3 font-semibold">设备状态</th>
              <th className="px-2 py-3 font-semibold">目标/实际比例</th>
              <th className="px-2 py-3 font-semibold">执行状态</th>
              <th className="px-2 py-3 font-semibold">最后心跳</th>
              <th className="px-5 py-3 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {filtered.map(inv => (
              <React.Fragment key={inv.id}>
                <tr className="hover:bg-ink-50 transition-colors group">
                  <td className="px-2 py-3">
                    {(inv.status === 'maintenance' || inv.status === 'comm_restored' || inv.executionStatus === 'pending_recalc') && (
                      <button
                        onClick={() => toggleExpand(inv.id)}
                        className="p-1 rounded hover:bg-ink-100 transition-colors text-ink-400 hover:text-ink-600"
                      >
                        {expandedRows.has(inv.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <code className="px-2 py-1 rounded-md bg-ink-100 text-ink-700 text-xs font-mono font-medium">
                      {inv.code}
                    </code>
                  </td>
                  <td className="px-2 py-3 font-medium text-ink-800">{inv.name}</td>
                  <td className="px-2 py-3 text-ink-600 text-xs">{inv.area}</td>
                  <td className="px-2 py-3">
                    <div className="text-ink-800 font-medium">
                      {inv.returnedPower !== undefined && inv.executionStatus === 'pending_recalc' ? (
                        <span className="text-violet-600">{inv.returnedPower.toFixed(1)} kW</span>
                      ) : (
                        inv.currentPower.toFixed(1)
                      )} kW
                    </div>
                    <div className="text-[11px] text-ink-400">/ {inv.ratedCapacity} kW</div>
                    {inv.returnedPower !== undefined && inv.executionStatus === 'pending_recalc' && (
                      <div className="text-[10px] text-violet-500 mt-0.5">回传功率</div>
                    )}
                  </td>
                <td className="px-2 py-3">
                  <StatusBadge status={inv.status} />
                </td>
                <td className="px-2 py-3">
                  {editInv === inv.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={0} max={100}
                        value={editRatio}
                        onChange={e => setEditRatio(Number(e.target.value))}
                        className="w-16 px-2 py-1 rounded-md border border-grid-300 text-sm focus:ring-2 focus:ring-grid-100 outline-none"
                      />
                      <span className="text-ink-500">%</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-20 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                          <span
                            className={`block h-full ${inv.targetRatio === inv.curtailmentRatio ? 'bg-solar-500' : 'bg-warn-500'}`}
                            style={{ width: `${inv.curtailmentRatio}%` }}
                          />
                        </span>
                        <span className={`font-bold ${
                          inv.curtailmentRatio === inv.targetRatio ? 'text-solar-700' : 'text-warn-700'
                        }`}>
                          {inv.curtailmentRatio}%
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-400 mt-0.5">目标 {inv.targetRatio}%</div>
                    </div>
                  )}
                </td>
                <td className="px-2 py-3">
                  <ExecutionBadge status={inv.executionStatus} />
                </td>
                <td className="px-2 py-3">
                  <div className="text-xs text-ink-600">
                    {new Date(inv.lastHeartbeat).toLocaleString('zh-CN', {
                      hour: '2-digit', minute: '2-digit', second: '2-digit', month: '2-digit', day: '2-digit'
                    })}
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  {editInv === inv.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => saveEdit(inv.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-solar-500 text-white hover:bg-solar-600"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditInv(null)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-ink-100 text-ink-600 hover:bg-ink-200"
                      >
                        取消
                      </button>
                    </div>
                  ) : registerInv === inv.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => submitRegister(inv.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-warn-500 text-white hover:bg-warn-600"
                      >
                        提交
                      </button>
                      <button
                        onClick={() => { setRegisterInv(null); setRegisterDesc(''); setRegisterRestore(''); }}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-ink-100 text-ink-600 hover:bg-ink-200"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && inv.status === 'normal' && (
                        <button
                          onClick={() => startEdit(inv.id, inv.curtailmentRatio)}
                          className="p-1.5 rounded-lg text-grid-600 hover:bg-grid-50 transition-colors"
                          title="调整执行比例"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {canRegister && inv.status !== 'maintenance' && (
                        <button
                          onClick={() => setRegisterInv(inv.id)}
                          className="p-1.5 rounded-lg text-warn-600 hover:bg-warn-50 transition-colors"
                          title="登记不可用原因"
                        >
                          <Wrench size={15} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
              {expandedRows.has(inv.id) && (
                <tr className="bg-ink-50/50">
                  <td colSpan={10} className="px-5 py-4 border-t border-ink-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {inv.status === 'maintenance' && inv.unavailableRecord && (
                        <div className="bg-white rounded-xl p-4 border border-warn-200">
                          <h4 className="text-sm font-semibold text-warn-800 mb-3 flex items-center gap-2">
                            <Wrench size={16} className="text-warn-600" /> 检修追责信息
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-ink-600">
                              <span className="text-ink-400 w-20">不可用原因：</span>
                              <span className="font-medium text-warn-700">
                                {UnavailableReasonLabels[inv.unavailableRecord.reason]}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 text-ink-600">
                              <span className="text-ink-400 w-20 shrink-0">详细描述：</span>
                              <span className="flex-1">{inv.unavailableRecord.description}</span>
                            </div>
                            <div className="flex items-center gap-2 text-ink-600">
                              <User size={12} className="text-ink-400" />
                              <span className="text-ink-400">登记人：</span>
                              <span className="font-medium">{inv.unavailableRecord.registeredBy}</span>
                            </div>
                            <div className="flex items-center gap-2 text-ink-600">
                              <CalendarDays size={12} className="text-ink-400" />
                              <span className="text-ink-400">登记时间：</span>
                              <span>{new Date(inv.unavailableRecord.registeredAt).toLocaleString('zh-CN')}</span>
                            </div>
                            {inv.unavailableRecord.expectedRestore && (
                              <div className="flex items-center gap-2 text-warn-600">
                                <Clock size={12} />
                                <span className="w-20">预计恢复：</span>
                                <span className="font-medium">
                                  {new Date(inv.unavailableRecord.expectedRestore).toLocaleString('zh-CN')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {(inv.status === 'comm_restored' || inv.executionStatus === 'pending_recalc') && (
                        <div className="bg-white rounded-xl p-4 border border-violet-200">
                          <h4 className="text-sm font-semibold text-violet-800 mb-3 flex items-center gap-2">
                            <RefreshCw size={16} className="text-violet-600 animate-spin" /> 通讯恢复补判信息
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-ink-600">
                              <Wifi size={12} className="text-violet-500" />
                              <span className="text-ink-400 w-24">回传功率：</span>
                              <span className="font-medium text-violet-700">
                                {inv.returnedPower?.toFixed(1) || inv.currentPower.toFixed(1)} kW
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-ink-600">
                              <Target size={12} className="text-ink-400" />
                              <span className="text-ink-400 w-24">目标比例：</span>
                              <span className="font-medium">{inv.targetRatio}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-ink-600">
                              <Gauge size={12} className="text-ink-400" />
                              <span className="text-ink-400 w-24">当前比例：</span>
                              <span className="font-medium text-warn-600">{inv.curtailmentRatio}%</span>
                            </div>
                            <div className="flex items-center gap-2 text-ink-600">
                              <AlertCircle size={12} className="text-warn-500" />
                              <span className="text-warn-600 text-xs">
                                禁止直接标记为已执行，必须按回传功率重新计算达成率
                              </span>
                            </div>
                            <button
                              onClick={() => dispatch({
                                type: 'RECALCULATE_ACHIEVEMENT',
                                payload: { inverterId: inv.id, recalculatedBy: `${RoleLabels[role]}-当前用户` }
                              })}
                              className="mt-2 w-full px-3 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <RefreshCw size={14} /> 重新计算达成率
                            </button>
                          </div>
                        </div>
                      )}
                      {inv.commRecoveryRecord && (
                        <div className="bg-white rounded-xl p-4 border border-blue-200 md:col-span-2">
                          <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-blue-600" /> 通讯恢复重算记录
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="text-ink-600">
                              <span className="text-ink-400">中断时间：</span>
                              <span className="font-medium">{new Date(inv.commRecoveryRecord.lostAt).toLocaleString('zh-CN')}</span>
                            </div>
                            <div className="text-ink-600">
                              <span className="text-ink-400">恢复时间：</span>
                              <span className="font-medium text-green-600">{new Date(inv.commRecoveryRecord.restoredAt).toLocaleString('zh-CN')}</span>
                            </div>
                            <div className="text-ink-600">
                              <span className="text-ink-400">中断时长：</span>
                              <span className="font-medium">{inv.commRecoveryRecord.downtimeMinutes} 分钟</span>
                            </div>
                            <div className="text-ink-600">
                              <span className="text-ink-400">重算后比例：</span>
                              <span className="font-medium text-violet-600">{inv.commRecoveryRecord.recalculatedRatio}%</span>
                            </div>
                            <div className="text-ink-600">
                              <span className="text-ink-400">重算后状态：</span>
                              <span className="font-medium">{ExecutionStatusLabels[inv.commRecoveryRecord.recalculatedStatus]}</span>
                            </div>
                            <div className="text-ink-600">
                              <span className="text-ink-400">重算人：</span>
                              <span className="font-medium">{inv.commRecoveryRecord.recalculatedBy}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}

            {registerInv && (() => {
              const inv = inverters.find(i => i.id === registerInv);
              if (!inv) return null;
              return (
                <tr>
                  <td colSpan={10} className="px-5 py-4 bg-gradient-to-r from-warn-50 to-amber-50 border-t border-warn-200">
                    <div className="max-w-2xl">
                      <p className="text-sm font-semibold text-warn-800 mb-3 flex items-center gap-2">
                        <AlertCircle size={16} /> 登记不可用原因 · {inv.code} {inv.name}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-ink-600 mb-1 block">不可用原因 *</label>
                          <select
                            value={registerReason}
                            onChange={e => setRegisterReason(e.target.value as UnavailableReason)}
                            className="w-full px-3 py-2 rounded-lg border border-ink-200 bg-white focus:border-grid-500 outline-none text-sm"
                          >
                            {Object.entries(UnavailableReasonLabels).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-ink-600 mb-1 block">预计恢复时间</label>
                          <input
                            type="datetime-local"
                            value={registerRestore}
                            onChange={e => setRegisterRestore(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-ink-200 focus:border-grid-500 outline-none text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-medium text-ink-600 mb-1 block">详细描述 *</label>
                          <textarea
                            value={registerDesc}
                            onChange={e => setRegisterDesc(e.target.value)}
                            placeholder="请输入具体故障现象、排查情况等信息..."
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-ink-200 focus:border-grid-500 outline-none text-sm resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-ink-400">
          <XCircle size={40} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">没有匹配的设备</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: InverterStatus }) {
  const config = {
    normal: { icon: Signal, cls: 'bg-solar-50 text-solar-700 border-solar-200', text: InverterStatusLabels.normal },
    comm_lost: { icon: WifiOff, cls: 'bg-danger-50 text-danger-700 border-danger-200', text: InverterStatusLabels.comm_lost },
    comm_restored: { icon: Wifi, cls: 'bg-violet-50 text-violet-700 border-violet-200', text: InverterStatusLabels.comm_restored },
    maintenance: { icon: Wrench, cls: 'bg-grid-50 text-grid-700 border-grid-200', text: InverterStatusLabels.maintenance },
    offline: { icon: XCircle, cls: 'bg-ink-100 text-ink-600 border-ink-200', text: InverterStatusLabels.offline }
  }[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${config.cls}`}>
      <Icon size={11} />
      {config.text}
    </span>
  );
}

function ExecutionBadge({ status }: { status: ExecutionStatus }) {
  const config = {
    executed: { icon: CheckCircle2, cls: 'bg-solar-50 text-solar-700', text: ExecutionStatusLabels.executed },
    not_executed: { icon: AlertCircle, cls: 'bg-warn-50 text-warn-700', text: ExecutionStatusLabels.not_executed },
    excluded: { icon: XCircle, cls: 'bg-grid-50 text-grid-700', text: ExecutionStatusLabels.excluded },
    unknown: { icon: WifiOff, cls: 'bg-danger-50 text-danger-700', text: ExecutionStatusLabels.unknown },
    pending_recalc: { icon: RefreshCw, cls: 'bg-violet-50 text-violet-700', text: ExecutionStatusLabels.pending_recalc }
  }[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
      <Icon size={11} className={status === 'pending_recalc' ? 'animate-spin' : ''} />
      {config.text}
    </span>
  );
}
