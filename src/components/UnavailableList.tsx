import { useState, useMemo } from 'react';
import {
  Wrench, CheckCircle2, Clock, User, FileText, Filter, XCircle,
  RotateCcw, ChevronDown, CalendarDays, AlertTriangle, AlertOctagon,
  Timer, Zap
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { UnavailableReason, UnavailableReasonLabels } from '../types';

export default function UnavailableList() {
  const { role, dispatch, records, inverters } = useApp();
  const canResolve = role === 'maintenance' || role === 'operator';

  const [tab, setTab] = useState<'active' | 'resolved'>('active');
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  const list = useMemo(() => {
    let r = tab === 'active' ? records.filter(x => !x.resolved) : records.filter(x => x.resolved);
    if (reasonFilter !== 'all') r = r.filter(x => x.reason === reasonFilter);
    return r.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
  }, [records, tab, reasonFilter]);

  const stats = useMemo(() => {
    const active = records.filter(r => !r.resolved);
    const grouped = Object.keys(UnavailableReasonLabels).reduce((acc, k) => {
      acc[k as UnavailableReason] = active.filter(r => r.reason === k).length;
      return acc;
    }, {} as Record<UnavailableReason, number>);
    return {
      activeCount: active.length,
      activeCapacity: active.reduce((s, r) => {
        const inv = inverters.find(i => i.id === r.inverterId);
        return s + (inv?.ratedCapacity ?? 0);
      }, 0),
      grouped
    };
  }, [records, inverters]);

  const handleResolve = (id: string) => {
    if (!confirm('确认检修完成？设备将恢复为正常运行状态。')) return;
    dispatch({ type: 'RESOLVE_MAINTENANCE', recordId: id });
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-ink-100">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-base font-bold text-ink-800 flex items-center gap-2">
            <Wrench size={18} className="text-warn-600" /> 设备不可用清单
          </h2>
          <p className="text-xs text-ink-500 mt-0.5">
            登记检修中的设备 · 当前 <b className="text-warn-700">{stats.activeCount}</b> 台在修 ·
            影响容量 <b className="text-warn-700">{stats.activeCapacity} kW</b>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-ink-100">
            <button
              onClick={() => setTab('active')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === 'active'
                  ? 'bg-white text-ink-800 shadow-sm'
                  : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              检修中 {stats.activeCount > 0 && `(${stats.activeCount})`}
            </button>
            <button
              onClick={() => setTab('resolved')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === 'resolved'
                  ? 'bg-white text-ink-800 shadow-sm'
                  : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              已恢复
            </button>
          </div>

          <div className="relative">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white border border-ink-200 text-ink-600 hover:bg-ink-50">
              <Filter size={15} /> 原因筛选
              <ChevronDown size={14} />
            </button>
          </div>
          <select
            value={reasonFilter}
            onChange={e => setReasonFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-ink-200 focus:border-grid-500 outline-none bg-white text-ink-700"
          >
            <option value="all">全部原因</option>
            {Object.entries(UnavailableReasonLabels).map(([k, v]) => (
              <option key={k} value={k}>{v} {stats.grouped[k as UnavailableReason] ? `(${stats.grouped[k as UnavailableReason]})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {tab === 'active' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-5">
          {Object.entries(UnavailableReasonLabels).map(([k, v]) => (
            <div
              key={k}
              onClick={() => setReasonFilter(reasonFilter === k ? 'all' : k)}
              className={`p-3 rounded-xl cursor-pointer transition-all border ${
                reasonFilter === k
                  ? 'bg-warn-50 border-warn-300 shadow-sm'
                  : 'bg-ink-50 border-ink-100 hover:bg-ink-100'
              }`}
            >
              <div className="text-2xl font-black text-ink-800">{stats.grouped[k as UnavailableReason]}</div>
              <div className="text-[11px] text-ink-500 mt-0.5">{v}</div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 max-h-[460px] overflow-y-auto scrollbar-thin pr-1">
        {list.map(rec => {
          const inv = inverters.find(i => i.id === rec.inverterId);
          const now = Date.now();
          const isOverdue = !rec.resolved && rec.expectedRestore && now > new Date(rec.expectedRestore).getTime();
          const downtimeMinutes = Math.floor((now - new Date(rec.registeredAt).getTime()) / 60000);
          const downtimeHours = Math.floor(downtimeMinutes / 60);
          const downtimeDays = Math.floor(downtimeHours / 24);

          const estimatedLoss = inv ? Math.round(inv.ratedCapacity * 0.85 * (downtimeMinutes / 60) * 0.4) : 0;

          return (
            <div
              key={rec.id}
              className={`p-4 rounded-xl border-2 transition-colors ${
                rec.resolved
                  ? 'border-ink-100 bg-ink-50/50 opacity-75'
                  : isOverdue
                    ? 'border-danger-200 bg-gradient-to-br from-white to-danger-50/40 hover:shadow-md'
                    : 'border-warn-100 bg-gradient-to-br from-white to-warn-50/30 hover:shadow-md'
              }`}
            >
              {isOverdue && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-danger-100 border border-danger-200">
                  <AlertOctagon size={16} className="text-danger-600 shrink-0" />
                  <span className="text-sm font-semibold text-danger-700">
                    ⚠️ 已超过预计恢复时间！请联系 {rec.registeredBy} 追责
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    rec.resolved
                      ? 'bg-solar-100 text-solar-700'
                      : isOverdue
                        ? 'bg-danger-100 text-danger-700'
                        : 'bg-warn-100 text-warn-700'
                  }`}>
                    {rec.resolved ? <CheckCircle2 size={20} /> : isOverdue ? <AlertOctagon size={20} /> : <AlertTriangle size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <code className="px-2 py-0.5 rounded-md bg-ink-100 text-ink-700 text-xs font-mono">
                        {rec.inverterCode}
                      </code>
                      <span className="font-semibold text-ink-800 text-sm truncate">
                        {inv?.name ?? '-'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        rec.reason === 'scheduled_maintenance'
                          ? 'bg-grid-50 text-grid-700'
                          : 'bg-danger-50 text-danger-700'
                      }`}>
                        {UnavailableReasonLabels[rec.reason]}
                      </span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-ink-300"></span>
                      <span className="text-xs text-ink-500">{inv?.area}</span>
                      {!rec.resolved && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ink-100 text-ink-600 text-xs">
                          <Timer size={10} />
                          {downtimeDays > 0 ? `${downtimeDays}天${downtimeHours % 24}小时` : downtimeHours > 0 ? `${downtimeHours}小时${downtimeMinutes % 60}分` : `${downtimeMinutes}分钟`}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-ink-700 leading-relaxed mb-2">
                      <FileText size={13} className="inline -mt-0.5 mr-1 text-ink-400" />
                      {rec.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
                      <span className="flex items-center gap-1 font-medium text-ink-600">
                        <User size={12} /> 责任人：{rec.registeredBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> 登记时间：{new Date(rec.registeredAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {rec.expectedRestore && !rec.resolved && (
                        <span className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-danger-600' : 'text-warn-600'}`}>
                          <CalendarDays size={12} /> {isOverdue ? '应恢复：' : '预计恢复：'}
                          {new Date(rec.expectedRestore).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {rec.resolved && rec.resolvedAt && (
                        <span className="flex items-center gap-1 text-solar-600 font-medium">
                          <CheckCircle2 size={12} /> 实际恢复：{new Date(rec.resolvedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {!rec.resolved && inv && estimatedLoss > 0 && (
                        <span className="flex items-center gap-1 text-danger-600 font-medium">
                          <Zap size={12} /> 估算发电损失：{estimatedLoss} kWh
                        </span>
                      )}
                      {inv && (
                        <span className="flex items-center gap-1 ml-auto text-ink-600 font-medium">
                          <XCircle size={12} /> 影响容量 {inv.ratedCapacity} kW
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!rec.resolved && canResolve && (
                  <div className="flex flex-col gap-2 items-end">
                    <button
                      onClick={() => handleResolve(rec.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-solar-500 to-solar-600 text-white hover:shadow-md transition-all shrink-0"
                    >
                      <RotateCcw size={15} /> 恢复设备
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {list.length === 0 && (
          <div className="py-12 text-center text-ink-400">
            <CheckCircle2 size={40} className="mx-auto mb-2 text-solar-400" />
            <p className="text-sm">{tab === 'active' ? '当前没有在修设备' : '暂无恢复记录'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
