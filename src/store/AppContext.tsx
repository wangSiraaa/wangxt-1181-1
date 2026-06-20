import React, { createContext, useContext, useMemo, useReducer, ReactNode } from 'react';
import {
  Inverter,
  CurtailmentStrategy,
  MaintenanceRecord,
  Role,
  ExecutionStatus,
  UnavailableReason,
  StrategyStats,
  LossEstimation,
  CommRecoveryRecord,
  StrategyExecutionRecord
} from '../types';
import {
  mockInverters,
  mockStrategies,
  mockRecords,
  mockCommRecoveryRecords,
  ELECTRICITY_PRICE,
  PEAK_IRRADIANCE_HOURS
} from '../data/mockData';

interface AppState {
  role: Role;
  inverters: Inverter[];
  strategies: CurtailmentStrategy[];
  records: MaintenanceRecord[];
  commRecoveryRecords: CommRecoveryRecord[];
  showStrategyComparison: boolean;
  toast: { type: 'success' | 'error' | 'info' | 'warn'; msg: string } | null;
}

type Action =
  | { type: 'SET_ROLE'; role: Role }
  | { type: 'ISSUED_STRATEGY'; targetRatio: number; name: string; issuedBy: string }
  | { type: 'RELEASE_STRATEGY'; strategyId: string }
  | { type: 'REGISTER_MAINTENANCE'; payload: { inverterId: string; reason: UnavailableReason; description: string; registeredBy: string; expectedRestore?: string } }
  | { type: 'RESOLVE_MAINTENANCE'; recordId: string }
  | { type: 'UPDATE_EXECUTION'; inverterId: string; curtailmentRatio: number }
  | { type: 'COMMUNICATION_RESTORED'; payload: { inverterId: string; returnedPower: number; restoredAt: string } }
  | { type: 'RECALCULATE_ACHIEVEMENT'; payload: { inverterId: string; recalculatedBy: string } }
  | { type: 'TOGGLE_STRATEGY_COMPARISON'; show: boolean }
  | { type: 'SHOW_TOAST'; toast: { type: 'success' | 'error' | 'info' | 'warn'; msg: string } }
  | { type: 'HIDE_TOAST' };

function calcExecutionStatus(inv: Inverter, targetRatio: number): ExecutionStatus {
  if (inv.status === 'maintenance') return 'excluded';
  if (inv.status === 'comm_lost') return 'unknown';
  if (inv.status === 'comm_restored') return 'pending_recalc';
  if (inv.status === 'offline') return 'unknown';
  if (targetRatio === 0) return 'executed';
  const diff = Math.abs(inv.curtailmentRatio - targetRatio);
  return diff <= 3 ? 'executed' : 'not_executed';
}

function calcRatioFromPower(power: number, ratedCapacity: number, targetRatio: number): number {
  if (ratedCapacity === 0) return 0;
  const theoreticalMax = ratedCapacity * 0.85;
  const actualRatio = Math.max(0, 100 - (power / theoreticalMax) * 100);
  return Math.round(actualRatio * 10) / 10;
}

function calculateLossForStrategy(
  strategy: CurtailmentStrategy,
  inverters: Inverter[]
): LossEstimation {
  let totalCap = 0, maintenanceCap = 0, commLostCap = 0, normalCap = 0;
  for (const inv of inverters) {
    totalCap += inv.ratedCapacity;
    if (inv.status === 'maintenance') maintenanceCap += inv.ratedCapacity;
    else if (inv.status === 'comm_lost' || inv.status === 'comm_restored' || inv.status === 'offline') commLostCap += inv.ratedCapacity;
    else normalCap += inv.ratedCapacity;
  }
  const activeCap = totalCap - maintenanceCap;
  const curtailmentLoss = normalCap * (strategy.targetRatio / 100) * PEAK_IRRADIANCE_HOURS;
  const maintenanceLoss = maintenanceCap * 0.85 * PEAK_IRRADIANCE_HOURS;
  const commLostLoss = commLostCap * 0.85 * PEAK_IRRADIANCE_HOURS;
  const totalLoss = curtailmentLoss + maintenanceLoss + commLostLoss;
  return {
    totalCapacity: totalCap,
    activeCapacity: activeCap,
    maintenanceCapacity: maintenanceCap,
    commLostCapacity: commLostCap,
    normalCapacity: normalCap,
    curtailmentLoss: Math.round(curtailmentLoss * 10) / 10,
    maintenanceLoss: Math.round(maintenanceLoss * 10) / 10,
    commLostLoss: Math.round(commLostLoss * 10) / 10,
    totalLoss: Math.round(totalLoss * 10) / 10,
    estimatedRevenueLoss: Math.round(totalLoss * ELECTRICITY_PRICE * 100) / 100
  };
}

function calculateStatsForStrategy(
  strategy: CurtailmentStrategy,
  inverters: Inverter[]
): StrategyStats {
  const targetRatio = strategy.targetRatio;
  let executed = 0, notExecuted = 0, excluded = 0, unknown = 0, pendingRecalc = 0;
  for (const inv of inverters) {
    const s = calcExecutionStatus(inv, targetRatio);
    if (s === 'executed') executed++;
    else if (s === 'not_executed') notExecuted++;
    else if (s === 'excluded') excluded++;
    else if (s === 'pending_recalc') pendingRecalc++;
    else unknown++;
  }
  const validTotal = inverters.filter(i => 
    i.status !== 'maintenance' && 
    i.status !== 'comm_lost' && 
    i.status !== 'offline' && 
    i.status !== 'comm_restored'
  ).length;
  const achievementRate = validTotal === 0 ? 0 : Math.round((executed / validTotal) * 1000) / 10;
  return {
    totalCount: inverters.length,
    executedCount: executed,
    notExecutedCount: notExecuted,
    excludedCount: excluded,
    unknownCount: unknown,
    pendingRecalcCount: pendingRecalc,
    achievementRate,
    activeRatio: targetRatio
  };
}

function buildInitialState(): AppState {
  const active = mockStrategies.find(s => s.isActive);
  const ratio = active?.targetRatio ?? 0;
  const inverters = mockInverters.map(inv => {
    if (inv.status === 'maintenance' || inv.status === 'comm_lost' || inv.status === 'comm_restored' || inv.status === 'offline') {
      return { ...inv, targetRatio: ratio };
    }
    let actualRatio = ratio;
    if (ratio > 0 && Math.random() > 0.85) actualRatio = Math.max(0, actualRatio - 5 - Math.random() * 10);
    const exec = calcExecutionStatus({ ...inv, curtailmentRatio: actualRatio }, ratio);
    return {
      ...inv,
      targetRatio: ratio,
      curtailmentRatio: actualRatio,
      currentPower: inv.ratedCapacity * (0.55 + Math.random() * 0.4) * (1 - actualRatio / 100),
      executionStatus: exec
    };
  });
  return {
    role: 'dispatcher',
    inverters,
    strategies: mockStrategies,
    records: mockRecords,
    commRecoveryRecords: mockCommRecoveryRecords,
    showStrategyComparison: false,
    toast: null
  };
}

const initialState: AppState = buildInitialState();

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, role: action.role };

    case 'TOGGLE_STRATEGY_COMPARISON':
      return { ...state, showStrategyComparison: action.show };

    case 'ISSUED_STRATEGY': {
      const now = new Date().toISOString();
      const maintenanceInvs = state.inverters.filter(i => i.status === 'maintenance');
      const commLostInvs = state.inverters.filter(i => i.status === 'comm_lost' || i.status === 'comm_restored');
      
      const strat: CurtailmentStrategy = {
        id: `STR-${Date.now()}`,
        name: action.name,
        targetRatio: action.targetRatio,
        issuedBy: action.issuedBy,
        issuedAt: now,
        effectiveFrom: now,
        effectiveTo: null,
        isActive: true,
        totalCapacity: state.inverters.reduce((s, i) => s + i.ratedCapacity, 0),
        expectedPower: 0,
        excludedInverters: maintenanceInvs.map(inv => ({
          inverterId: inv.id,
          inverterCode: inv.code,
          reason: inv.unavailableReason!,
          description: inv.unavailableDescription!,
          registeredBy: inv.registeredBy!,
          registeredAt: inv.registeredAt!,
          expectedRestore: inv.expectedRestore,
          capacity: inv.ratedCapacity
        })),
        commLostInverters: commLostInvs.map(inv => ({
          inverterId: inv.id,
          inverterCode: inv.code,
          lostAt: inv.commLostAt || inv.lastHeartbeat,
          capacity: inv.ratedCapacity
        }))
      };
      strat.expectedPower = strat.totalCapacity * (1 - action.targetRatio / 100) * 0.85;

      const prevActive = state.strategies.find(s => s.isActive);
      const deactivated = state.strategies.map(s => {
        if (s.isActive) {
          const durationMs = new Date(now).getTime() - new Date(s.effectiveFrom).getTime();
          const durationMinutes = Math.round(durationMs / 60000);
          const loss = calculateLossForStrategy(s, state.inverters);
          return { 
            ...s, 
            isActive: false, 
            effectiveTo: now,
            executionDurationMinutes: durationMinutes,
            lossDetail: {
              curtailmentLoss: loss.curtailmentLoss,
              maintenanceLoss: loss.maintenanceLoss,
              commLostLoss: loss.commLostLoss,
              totalLoss: loss.totalLoss,
              estimatedRevenueLoss: loss.estimatedRevenueLoss,
              actualPower: loss.normalCapacity * (1 - s.targetRatio / 100) * 0.85 * (durationMinutes / 60),
              expectedPower: s.expectedPower * (durationMinutes / 60)
            }
          };
        }
        return s;
      });
      const newStrategies = [strat, ...deactivated];

      const newInverters = state.inverters.map(inv => {
        const execRecord: StrategyExecutionRecord = {
          strategyId: prevActive?.id || '',
          inverterId: inv.id,
          targetRatio: inv.targetRatio,
          actualRatio: inv.curtailmentRatio,
          executionStatus: inv.executionStatus,
          recordedAt: now
        };
        
        if (inv.status === 'maintenance' || inv.status === 'comm_lost' || inv.status === 'offline') {
          return { 
            ...inv, 
            targetRatio: action.targetRatio,
            executionHistory: [...(inv.executionHistory || []), execRecord]
          };
        }
        if (inv.status === 'comm_restored') {
          return {
            ...inv,
            targetRatio: action.targetRatio,
            executionStatus: 'pending_recalc' as ExecutionStatus,
            executionHistory: [...(inv.executionHistory || []), execRecord]
          };
        }
        let actualRatio = action.targetRatio;
        if (Math.random() > 0.85) actualRatio = Math.max(0, actualRatio - 5 - Math.random() * 10);
        const newExec = calcExecutionStatus({ ...inv, curtailmentRatio: actualRatio }, action.targetRatio);
        return {
          ...inv,
          targetRatio: action.targetRatio,
          curtailmentRatio: actualRatio,
          executionStatus: newExec,
          executionHistory: [...(inv.executionHistory || []), execRecord]
        };
      });

      return {
        ...state,
        strategies: newStrategies,
        inverters: newInverters,
        toast: { type: 'success', msg: `限发策略已下发：目标比例 ${action.targetRatio}%` }
      };
    }

    case 'RELEASE_STRATEGY': {
      const now = new Date().toISOString();
      const strategy = state.strategies.find(s => s.id === action.strategyId);
      const durationMs = strategy ? new Date(now).getTime() - new Date(strategy.effectiveFrom).getTime() : 0;
      const durationMinutes = Math.round(durationMs / 60000);
      const loss = strategy ? calculateLossForStrategy(strategy, state.inverters) : null;
      
      const newStrategies = state.strategies.map(s =>
        s.id === action.strategyId ? { 
          ...s, 
          isActive: false, 
          effectiveTo: now,
          executionDurationMinutes: durationMinutes,
          lossDetail: loss ? {
            curtailmentLoss: loss.curtailmentLoss,
            maintenanceLoss: loss.maintenanceLoss,
            commLostLoss: loss.commLostLoss,
            totalLoss: loss.totalLoss,
            estimatedRevenueLoss: loss.estimatedRevenueLoss,
            actualPower: loss.normalCapacity * (1 - s.targetRatio / 100) * 0.85 * (durationMinutes / 60),
            expectedPower: s.expectedPower * (durationMinutes / 60)
          } : undefined
        } : s
      );
      const newInverters = state.inverters.map(inv => {
        if (inv.status === 'maintenance') return inv;
        if (inv.status === 'comm_lost' || inv.status === 'offline') {
          return { ...inv, targetRatio: 0 };
        }
        if (inv.status === 'comm_restored') {
          return { ...inv, targetRatio: 0, executionStatus: 'pending_recalc' as ExecutionStatus };
        }
        return {
          ...inv,
          targetRatio: 0,
          curtailmentRatio: 0,
          currentPower: inv.ratedCapacity * (0.85 + Math.random() * 0.1),
          executionStatus: 'executed' as ExecutionStatus
        };
      });
      return {
        ...state,
        strategies: newStrategies,
        inverters: newInverters,
        toast: { type: 'success', msg: '限发策略已解除，设备恢复满发' }
      };
    }

    case 'REGISTER_MAINTENANCE': {
      const { inverterId, reason, description, registeredBy, expectedRestore } = action.payload;
      const now = new Date().toISOString();
      const inv = state.inverters.find(i => i.id === inverterId);
      if (!inv) return state;
      
      const newInverters = state.inverters.map(inv =>
        inv.id === inverterId
          ? {
              ...inv,
              status: 'maintenance' as const,
              executionStatus: 'excluded' as ExecutionStatus,
              currentPower: 0,
              unavailableReason: reason,
              unavailableDescription: description,
              registeredBy,
              registeredAt: now,
              expectedRestore
            }
          : inv
      );
      const record: MaintenanceRecord = {
        id: `REC-${Date.now()}`,
        inverterId,
        inverterCode: inv.code,
        reason,
        description,
        registeredBy,
        registeredAt: now,
        expectedRestore,
        resolved: false,
        capacity: inv.ratedCapacity,
        area: inv.area
      };
      
      const newStrategies = state.strategies.map(s => {
        if (!s.isActive) return s;
        return {
          ...s,
          excludedInverters: [
            ...(s.excludedInverters || []),
            {
              inverterId,
              inverterCode: inv.code,
              reason,
              description,
              registeredBy,
              registeredAt: now,
              expectedRestore,
              capacity: inv.ratedCapacity
            }
          ]
        };
      });
      
      return {
        ...state,
        inverters: newInverters,
        records: [record, ...state.records],
        strategies: newStrategies,
        toast: { type: 'success', msg: '设备不可用原因已登记，已从策略统计中剔除' }
      };
    }

    case 'RESOLVE_MAINTENANCE': {
      const now = new Date().toISOString();
      const rec = state.records.find(r => r.id === action.recordId);
      if (!rec) return state;
      const activeStrat = state.strategies.find(s => s.isActive);
      const targetRatio = activeStrat?.targetRatio ?? 0;
      const newInverters = state.inverters.map(inv => {
        if (inv.id !== rec.inverterId) return inv;
        const restored = {
          ...inv,
          status: 'normal' as const,
          currentPower: inv.ratedCapacity * (0.85 + Math.random() * 0.1) * (1 - targetRatio / 100),
          curtailmentRatio: targetRatio,
          targetRatio,
          unavailableReason: undefined,
          unavailableDescription: undefined,
          registeredBy: undefined,
          registeredAt: undefined,
          expectedRestore: undefined
        };
        restored.executionStatus = calcExecutionStatus(restored, targetRatio);
        return restored;
      });
      const newRecords = state.records.map(r =>
        r.id === action.recordId ? { ...r, resolved: true, resolvedAt: now } : r
      );
      
      const newStrategies = state.strategies.map(s => {
        if (!s.isActive) return s;
        return {
          ...s,
          excludedInverters: (s.excludedInverters || []).filter(e => e.inverterId !== rec.inverterId)
        };
      });
      
      return {
        ...state,
        inverters: newInverters,
        records: newRecords,
        strategies: newStrategies,
        toast: { type: 'success', msg: '检修完成，设备已恢复运行' }
      };
    }

    case 'COMMUNICATION_RESTORED': {
      const { inverterId, returnedPower, restoredAt } = action.payload;
      const inv = state.inverters.find(i => i.id === inverterId);
      if (!inv) return state;
      
      const activeStrat = state.strategies.find(s => s.isActive);
      const targetRatio = activeStrat?.targetRatio ?? 0;
      
      const newInverters = state.inverters.map(i =>
        i.id === inverterId
          ? {
              ...i,
              status: 'comm_restored' as const,
              executionStatus: 'pending_recalc' as ExecutionStatus,
              currentPower: returnedPower,
              returnedPower,
              lastHeartbeat: restoredAt,
              commRestoredAt: restoredAt,
              targetRatio
            }
          : i
      );
      
      const newStrategies = state.strategies.map(s => {
        if (!s.isActive) return s;
        return {
          ...s,
          commLostInverters: (s.commLostInverters || []).filter(c => c.inverterId !== inverterId)
        };
      });
      
      return {
        ...state,
        inverters: newInverters,
        strategies: newStrategies,
        toast: { 
          type: 'warn', 
          msg: `${inv.code} 通讯已恢复，请根据回传功率重新计算达成率，禁止直接标记为已执行` 
        }
      };
    }

    case 'RECALCULATE_ACHIEVEMENT': {
      const { inverterId, recalculatedBy } = action.payload;
      const inv = state.inverters.find(i => i.id === inverterId);
      if (!inv) return state;
      if (inv.status !== 'comm_restored') {
        return { 
          ...state, 
          toast: { type: 'error', msg: '只有通讯恢复待判状态的设备才需要重算' } 
        };
      }
      
      const targetRatio = inv.targetRatio;
      const returnedPower = inv.returnedPower ?? inv.currentPower;
      const recalculatedRatio = calcRatioFromPower(returnedPower, inv.ratedCapacity, targetRatio);
      const diff = Math.abs(recalculatedRatio - targetRatio);
      const newStatus: ExecutionStatus = diff <= 3 ? 'executed' : 'not_executed';
      
      const now = new Date().toISOString();
      const downtimeMinutes = inv.commLostAt 
        ? Math.round((new Date(now).getTime() - new Date(inv.commLostAt).getTime()) / 60000)
        : 0;
      
      const commRec: CommRecoveryRecord = {
        id: `REC-COMM-${Date.now()}`,
        inverterId,
        inverterCode: inv.code,
        lostAt: inv.commLostAt || inv.lastHeartbeat,
        restoredAt: inv.commRestoredAt || now,
        downtimeMinutes,
        returnedPower,
        targetRatioAtRecovery: targetRatio,
        recalculatedRatio,
        recalculatedStatus: newStatus,
        recalculatedAt: now,
        recalculatedBy
      };
      
      const newInverters = state.inverters.map(i =>
        i.id === inverterId
          ? {
              ...i,
              status: 'normal' as const,
              curtailmentRatio: recalculatedRatio,
              executionStatus: newStatus,
              recalculatedAt: now,
              commLostAt: undefined,
              commRestoredAt: undefined,
              returnedPower: undefined
            }
          : i
      );
      
      return {
        ...state,
        inverters: newInverters,
        commRecoveryRecords: [commRec, ...state.commRecoveryRecords],
        toast: { 
          type: newStatus === 'executed' ? 'success' : 'warn', 
          msg: `达成率已重算：实际比例 ${recalculatedRatio}%，判定为${newStatus === 'executed' ? '已执行' : '未执行'}` 
        }
      };
    }

    case 'UPDATE_EXECUTION': {
      const newInverters = state.inverters.map(inv => {
        if (inv.id !== action.inverterId) return inv;
        if (inv.status === 'comm_lost') return inv;
        if (inv.status === 'comm_restored') {
          return { ...inv, executionStatus: 'pending_recalc' as ExecutionStatus };
        }
        const updated = { ...inv, curtailmentRatio: action.curtailmentRatio };
        updated.executionStatus = calcExecutionStatus(updated, inv.targetRatio);
        return updated;
      });
      return { ...state, inverters: newInverters };
    }

    case 'SHOW_TOAST':
      return { ...state, toast: action.toast };

    case 'HIDE_TOAST':
      return { ...state, toast: null };

    default:
      return state;
  }
}

interface AppContextValue extends AppState {
  dispatch: React.Dispatch<Action>;
  activeStrategy: CurtailmentStrategy | undefined;
  strategyStats: StrategyStats;
  lossEstimation: LossEstimation;
  calcStatsForStrategy: (s: CurtailmentStrategy) => StrategyStats;
  calcLossForStrategy: (s: CurtailmentStrategy) => LossEstimation;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const activeStrategy = state.strategies.find(s => s.isActive);
  const targetRatio = activeStrategy?.targetRatio ?? 0;

  const strategyStats: StrategyStats = useMemo(() => {
    return calculateStatsForStrategy(activeStrategy || mockStrategies[0], state.inverters);
  }, [state.inverters, activeStrategy]);

  const lossEstimation: LossEstimation = useMemo(() => {
    return calculateLossForStrategy(activeStrategy || mockStrategies[0], state.inverters);
  }, [state.inverters, activeStrategy]);

  const calcStatsForStrategy = (s: CurtailmentStrategy) => calculateStatsForStrategy(s, state.inverters);
  const calcLossForStrategy = (s: CurtailmentStrategy) => calculateLossForStrategy(s, state.inverters);

  const value: AppContextValue = {
    ...state,
    dispatch,
    activeStrategy,
    strategyStats,
    lossEstimation,
    calcStatsForStrategy,
    calcLossForStrategy
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
