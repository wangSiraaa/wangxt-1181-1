export type Role = 'dispatcher' | 'operator' | 'maintenance';

export const RoleLabels: Record<Role, string> = {
  dispatcher: '调度员',
  operator: '场站值班员',
  maintenance: '检修人员'
};

export type InverterStatus = 'normal' | 'comm_lost' | 'maintenance' | 'offline';
export const InverterStatusLabels: Record<InverterStatus, string> = {
  normal: '正常运行',
  comm_lost: '通讯中断',
  maintenance: '检修中',
  offline: '离线'
};

export type ExecutionStatus = 'executed' | 'not_executed' | 'excluded' | 'unknown';
export const ExecutionStatusLabels: Record<ExecutionStatus, string> = {
  executed: '已执行',
  not_executed: '未执行',
  excluded: '已剔除',
  unknown: '未知'
};

export type UnavailableReason =
  | 'fault_module'
  | 'fault_inverter'
  | 'fault_combiner'
  | 'fault_grid'
  | 'scheduled_maintenance'
  | 'other';

export const UnavailableReasonLabels: Record<UnavailableReason, string> = {
  fault_module: '组件故障',
  fault_inverter: '逆变器故障',
  fault_combiner: '汇流箱故障',
  fault_grid: '电网侧故障',
  scheduled_maintenance: '计划检修',
  other: '其他原因'
};

export interface Inverter {
  id: string;
  code: string;
  name: string;
  area: string;
  ratedCapacity: number;
  currentPower: number;
  status: InverterStatus;
  curtailmentRatio: number;
  targetRatio: number;
  executionStatus: ExecutionStatus;
  lastHeartbeat: string;
  unavailableReason?: UnavailableReason;
  unavailableDescription?: string;
  registeredBy?: string;
  registeredAt?: string;
}

export interface CurtailmentStrategy {
  id: string;
  name: string;
  targetRatio: number;
  issuedBy: string;
  issuedAt: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  totalCapacity: number;
  expectedPower: number;
}

export interface MaintenanceRecord {
  id: string;
  inverterId: string;
  inverterCode: string;
  reason: UnavailableReason;
  description: string;
  registeredBy: string;
  registeredAt: string;
  expectedRestore?: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface LossEstimation {
  totalCapacity: number;
  activeCapacity: number;
  maintenanceCapacity: number;
  commLostCapacity: number;
  normalCapacity: number;
  curtailmentLoss: number;
  maintenanceLoss: number;
  commLostLoss: number;
  totalLoss: number;
  estimatedRevenueLoss: number;
}

export interface StrategyStats {
  totalCount: number;
  executedCount: number;
  notExecutedCount: number;
  excludedCount: number;
  unknownCount: number;
  achievementRate: number;
  activeRatio: number;
}
