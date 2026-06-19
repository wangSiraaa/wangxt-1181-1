import React, { createContext, useContext, useMemo, useReducer, ReactNode } from 'react';
import {
  Inverter,
  CurtailmentStrategy,
  MaintenanceRecord,
  Role,
  ExecutionStatus,
  UnavailableReason,
  StrategyStats,
  LossEstimation
} from '../types';
import {
  mockInverters,
  mockStrategies,
  mockRecords,
  ELECTRICITY_PRICE,
  PEAK_IRRADIANCE_HOURS
} from '../data/mockData';

interface AppState {
  role: Role;
  inverters: Inverter[];
  strategies: CurtailmentStrategy[];
  records: MaintenanceRecord[];
  toast: { type: 'success' | 'error' | 'info' | 'warn'; msg: string } | null;
}

type Action =
  | { type: 'SET_ROLE'; role: Role }
  | { type: 'ISSUED_STRATEGY'; targetRatio: number; name: string; issuedBy: string }
  | { type: 'RELEASE_STRATEGY'; strategyId: string }
  | { type: 'REGISTER_MAINTENANCE'; payload: { inverterId: string; reason: UnavailableReason; description: string; registeredBy: string; expectedRestore?: string } }
  | { type: 'RESOLVE_MAINTENANCE'; recordId: string }
  | { type: 'UPDATE_EXECUTION'; inverterId: string; curtailmentRatio: number }
  | { type: 'SHOW_TOAST'; toast: { type: 'success' | 'error' | 'info' | 'warn'; msg: string } }
  | { type: 'HIDE_TOAST' };

function calcExecutionStatus(inv: Inverter, targetRatio: number): ExecutionStatus {
  if (inv.status === 'maintenance') return 'excluded';
  if (inv.status === 'comm_lost') return 'unknown';
  if (inv.status === 'offline') return 'unknown';
  if (targetRatio === 0) return 'executed';
  const diff = Math.abs(inv.curtailmentRatio - targetRatio);
  return diff <= 3 ? 'executed' : 'not_executed';
}

function buildInitialState(): AppState {
  const active = mockStrategies.find(s => s.isActive);
  const ratio = active?.targetRatio ?? 0;
  const inverters = mockInverters.map(inv => {
    if (inv.status === 'maintenance' || inv.status === 'comm_lost' || inv.status === 'offline') {
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
    toast: null
  };
}

const initialState: AppState = buildInitialState();

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, role: action.role };

    case 'ISSUED_STRATEGY': {
      const now = new Date().toISOString();
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
        expectedPower: 0
      };
      strat.expectedPower = strat.totalCapacity * (1 - action.targetRatio / 100) * 0.85;

      const deactivated = state.strategies.map(s => ({ ...s, isActive: false, effectiveTo: now }));
      const newStrategies = [strat, ...deactivated];

      const newInverters = state.inverters.map(inv => {
        if (inv.status === 'maintenance' || inv.status === 'comm_lost' || inv.status === 'offline') {
          return { ...inv, targetRatio: action.targetRatio };
        }
        let actualRatio = action.targetRatio;
        if (Math.random() > 0.85) actualRatio = Math.max(0, actualRatio - 5 - Math.random() * 10);
        return {
          ...inv,
          targetRatio: action.targetRatio,
          curtailmentRatio: actualRatio,
          executionStatus: calcExecutionStatus({ ...inv, curtailmentRatio: actualRatio }, action.targetRatio)
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
      const newStrategies = state.strategies.map(s =>
        s.id === action.strategyId ? { ...s, isActive: false, effectiveTo: now } : s
      );
      const newInverters = state.inverters.map(inv => {
        if (inv.status === 'maintenance') return inv;
        if (inv.status === 'comm_lost' || inv.status === 'offline') {
          return { ...inv, targetRatio: 0 };
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
              registeredAt: now
            }
          : inv
      );
      const record: MaintenanceRecord = {
        id: `REC-${Date.now()}`,
        inverterId,
        inverterCode: newInverters.find(i => i.id === inverterId)!.code,
        reason,
        description,
        registeredBy,
        registeredAt: now,
        expectedRestore,
        resolved: false
      };
      return {
        ...state,
        inverters: newInverters,
        records: [record, ...state.records],
        toast: { type: 'success', msg: '设备不可用原因已登记' }
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
          registeredAt: undefined
        };
        restored.executionStatus = calcExecutionStatus(restored, targetRatio);
        return restored;
      });
      const newRecords = state.records.map(r =>
        r.id === action.recordId ? { ...r, resolved: true, resolvedAt: now } : r
      );
      return {
        ...state,
        inverters: newInverters,
        records: newRecords,
        toast: { type: 'success', msg: '检修完成，设备已恢复运行' }
      };
    }

    case 'UPDATE_EXECUTION': {
      const newInverters = state.inverters.map(inv => {
        if (inv.id !== action.inverterId) return inv;
        if (inv.status === 'comm_lost') return inv;
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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const activeStrategy = state.strategies.find(s => s.isActive);
  const targetRatio = activeStrategy?.targetRatio ?? 0;

  const strategyStats: StrategyStats = useMemo(() => {
    const validList = state.inverters.filter(i => i.status !== 'maintenance');
    const total = state.inverters.length;
    let executed = 0, notExecuted = 0, excluded = 0, unknown = 0;
    for (const inv of state.inverters) {
      const s = calcExecutionStatus(inv, targetRatio);
      if (s === 'executed') executed++;
      else if (s === 'not_executed') notExecuted++;
      else if (s === 'excluded') excluded++;
      else unknown++;
    }
    const validTotal = validList.filter(i => i.status !== 'comm_lost' && i.status !== 'offline').length;
    const achievementRate = validTotal === 0 ? 0 : Math.round((executed / validTotal) * 1000) / 10;
    return {
      totalCount: total,
      executedCount: executed,
      notExecutedCount: notExecuted,
      excludedCount: excluded,
      unknownCount: unknown,
      achievementRate,
      activeRatio: targetRatio
    };
  }, [state.inverters, targetRatio]);

  const lossEstimation: LossEstimation = useMemo(() => {
    let totalCap = 0, maintenanceCap = 0, commLostCap = 0, normalCap = 0;
    for (const inv of state.inverters) {
      totalCap += inv.ratedCapacity;
      if (inv.status === 'maintenance') maintenanceCap += inv.ratedCapacity;
      else if (inv.status === 'comm_lost' || inv.status === 'offline') commLostCap += inv.ratedCapacity;
      else normalCap += inv.ratedCapacity;
    }
    const activeCap = totalCap - maintenanceCap;
    const curtailmentLoss = normalCap * (targetRatio / 100) * PEAK_IRRADIANCE_HOURS;
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
  }, [state.inverters, targetRatio]);

  const value: AppContextValue = {
    ...state,
    dispatch,
    activeStrategy,
    strategyStats,
    lossEstimation
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
