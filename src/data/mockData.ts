import { Inverter, CurtailmentStrategy, MaintenanceRecord, UnavailableReason } from '../types';

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

const AREAS = ['A区-1号方阵', 'A区-2号方阵', 'B区-3号方阵', 'B区-4号方阵', 'C区-5号方阵', 'C区-6号方阵'];

const REASONS: UnavailableReason[] = [
  'fault_module', 'fault_inverter', 'fault_combiner', 'fault_grid', 'scheduled_maintenance', 'other'
];
const REASON_DESCS: Record<UnavailableReason, string[]> = {
  fault_module: ['组件热斑检测告警，需现场排查', '组件玻璃破碎', '组件旁路二极管故障'],
  fault_inverter: ['逆变器IGBT模块过温告警', '逆变器直流输入异常', '逆变器通讯板卡故障'],
  fault_combiner: ['汇流箱直流熔断器熔断', '汇流箱监控模块离线', '汇流箱绝缘监测告警'],
  fault_grid: ['并网点电压超限', '电网频率异常保护动作', '并网点开关跳闸'],
  scheduled_maintenance: ['季度预防性检修', '年度清洁保养', '固件升级维护'],
  other: ['设备年检待发证', '现场施工临时断电', '其他原因等待确认']
};

const MAINTENANCE_STAFF = ['李工', '王工', '张工', '赵工', '刘工'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildInverters(): Inverter[] {
  const list: Inverter[] = [];
  for (let i = 1; i <= 36; i++) {
    const area = AREAS[i % AREAS.length];
    const idx = String(i).padStart(3, '0');
    const rated = 250;
    const base: Inverter = {
      id: `INV-${idx}`,
      code: `PV-INV-${idx}`,
      name: `${area}#${i}逆变器`,
      area,
      ratedCapacity: rated,
      currentPower: rated * (0.55 + Math.random() * 0.4),
      status: 'normal',
      curtailmentRatio: 0,
      targetRatio: 0,
      executionStatus: 'executed',
      lastHeartbeat: hoursAgo(Math.random() * 0.3)
    };

    if (i === 3 || i === 15 || i === 28) {
      base.status = 'comm_lost';
      base.executionStatus = 'unknown';
      base.lastHeartbeat = hoursAgo(1.5 + Math.random() * 3);
      base.currentPower = 0;
    } else if (i === 7 || i === 19 || i === 31 || i === 33) {
      const reason = REASONS[i % REASONS.length];
      base.status = 'maintenance';
      base.executionStatus = 'excluded';
      base.unavailableReason = reason;
      base.unavailableDescription = REASON_DESCS[reason][i % 3];
      base.registeredBy = MAINTENANCE_STAFF[i % MAINTENANCE_STAFF.length];
      base.registeredAt = hoursAgo(2 + Math.random() * 20);
      base.currentPower = 0;
    }

    list.push(base);
  }
  return list;
}

function buildMaintenanceRecords(invs: Inverter[]): MaintenanceRecord[] {
  return invs
    .filter(i => i.status === 'maintenance')
    .map(i => ({
      id: `REC-${i.id}`,
      inverterId: i.id,
      inverterCode: i.code,
      reason: i.unavailableReason!,
      description: i.unavailableDescription!,
      registeredBy: i.registeredBy!,
      registeredAt: i.registeredAt!,
      expectedRestore: new Date(now.getTime() + (1 + Math.random() * 12) * 3600000).toISOString(),
      resolved: false
    }));
}

export const mockInverters: Inverter[] = buildInverters();

export const mockStrategies: CurtailmentStrategy[] = [
  {
    id: 'STR-20260619-001',
    name: '6月19日 10:00 电网调峰限发',
    targetRatio: 30,
    issuedBy: '调度员-陈调度',
    issuedAt: hoursAgo(0.8),
    effectiveFrom: hoursAgo(0.5),
    effectiveTo: new Date(now.getTime() + 4 * 3600000).toISOString(),
    isActive: true,
    totalCapacity: 9000,
    expectedPower: 6300
  }
];

export const mockRecords: MaintenanceRecord[] = buildMaintenanceRecords(mockInverters);

export const MAINTENANCE_STAFF_LIST = MAINTENANCE_STAFF;
export const ELECTRICITY_PRICE = 0.38;
export const PEAK_IRRADIANCE_HOURS = 4.2;
