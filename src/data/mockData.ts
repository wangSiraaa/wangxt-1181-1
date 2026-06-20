import { Inverter, CurtailmentStrategy, MaintenanceRecord, UnavailableReason, CommRecoveryRecord } from '../types';

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const hoursLater = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();

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
const DISPATCHERS = ['陈调度', '林调度', '周调度', '吴调度'];

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
      lastHeartbeat: hoursAgo(Math.random() * 0.3),
      executionHistory: []
    };

    if (i === 3 || i === 15) {
      base.status = 'comm_lost';
      base.executionStatus = 'unknown';
      base.lastHeartbeat = hoursAgo(1.5 + Math.random() * 2);
      base.currentPower = 0;
      base.commLostAt = base.lastHeartbeat;
    } else if (i === 28) {
      base.status = 'comm_restored';
      base.executionStatus = 'pending_recalc';
      base.lastHeartbeat = hoursAgo(0.1);
      base.commLostAt = hoursAgo(3.5);
      base.commRestoredAt = hoursAgo(0.1);
      base.returnedPower = rated * 0.72;
      base.currentPower = rated * 0.72;
    } else if (i === 7 || i === 19 || i === 31 || i === 33) {
      const reason = REASONS[i % REASONS.length];
      base.status = 'maintenance';
      base.executionStatus = 'excluded';
      base.unavailableReason = reason;
      base.unavailableDescription = REASON_DESCS[reason][i % 3];
      base.registeredBy = MAINTENANCE_STAFF[i % MAINTENANCE_STAFF.length];
      base.registeredAt = hoursAgo(2 + Math.random() * 20);
      base.expectedRestore = hoursLater(1 + Math.random() * 12);
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
      expectedRestore: i.expectedRestore,
      resolved: false,
      capacity: i.ratedCapacity,
      area: i.area
    }));
}

function buildStrategies(invs: Inverter[]): CurtailmentStrategy[] {
  const totalCapacity = invs.reduce((s, i) => s + i.ratedCapacity, 0);
  const maintenanceInvs = invs.filter(i => i.status === 'maintenance');
  const commLostInvs = invs.filter(i => i.status === 'comm_lost' || i.status === 'comm_restored');

  const strategyData = [
    {
      id: 'STR-20260619-001',
      name: '6月19日 08:00 早峰首次限发',
      targetRatio: 20,
      issuedBy: `调度员-${DISPATCHERS[0]}`,
      issuedAt: hoursAgo(6),
      effectiveFrom: hoursAgo(5.5),
      effectiveTo: hoursAgo(4),
      isActive: false,
      totalCapacity,
      expectedPower: totalCapacity * 0.85 * 0.8
    },
    {
      id: 'STR-20260619-002',
      name: '6月19日 12:00 午峰加严限发',
      targetRatio: 40,
      issuedBy: `调度员-${DISPATCHERS[1]}`,
      issuedAt: hoursAgo(4),
      effectiveFrom: hoursAgo(3.5),
      effectiveTo: hoursAgo(2),
      isActive: false,
      totalCapacity,
      expectedPower: totalCapacity * 0.85 * 0.6
    },
    {
      id: 'STR-20260619-003',
      name: '6月19日 14:00 晚峰前调升',
      targetRatio: 30,
      issuedBy: `调度员-${DISPATCHERS[2]}`,
      issuedAt: hoursAgo(2),
      effectiveFrom: hoursAgo(1.5),
      effectiveTo: hoursAgo(0.5),
      isActive: false,
      totalCapacity,
      expectedPower: totalCapacity * 0.85 * 0.7
    },
    {
      id: 'STR-20260619-004',
      name: '6月19日 16:00 电网调峰限发',
      targetRatio: 30,
      issuedBy: `调度员-${DISPATCHERS[0]}`,
      issuedAt: hoursAgo(0.8),
      effectiveFrom: hoursAgo(0.5),
      effectiveTo: hoursLater(4),
      isActive: true,
      totalCapacity,
      expectedPower: totalCapacity * 0.85 * 0.7
    }
  ];

  return strategyData.map((s, idx) => {
    const strategy: CurtailmentStrategy = {
      ...s,
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

    if (!s.isActive && s.effectiveTo) {
      const durationMs = new Date(s.effectiveTo).getTime() - new Date(s.effectiveFrom).getTime();
      strategy.executionDurationMinutes = Math.round(durationMs / 60000);
      
      const normalCap = totalCapacity - maintenanceInvs.reduce((s, i) => s + i.ratedCapacity, 0);
      const activeHours = strategy.executionDurationMinutes / 60;
      const peakHoursFactor = 0.8;
      
      strategy.lossDetail = {
        curtailmentLoss: Math.round(normalCap * (s.targetRatio / 100) * activeHours * peakHoursFactor * 10) / 10,
        maintenanceLoss: Math.round(maintenanceInvs.reduce((s, i) => s + i.ratedCapacity, 0) * activeHours * peakHoursFactor * 10) / 10,
        commLostLoss: Math.round(commLostInvs.reduce((s, i) => s + i.ratedCapacity, 0) * activeHours * peakHoursFactor * 10) / 10,
        totalLoss: 0,
        estimatedRevenueLoss: 0,
        actualPower: Math.round(normalCap * (1 - s.targetRatio / 100) * activeHours * peakHoursFactor * 10) / 10,
        expectedPower: s.expectedPower * activeHours
      };
      strategy.lossDetail.totalLoss = Math.round(
        (strategy.lossDetail.curtailmentLoss + strategy.lossDetail.maintenanceLoss + strategy.lossDetail.commLostLoss) * 10
      ) / 10;
      strategy.lossDetail.estimatedRevenueLoss = Math.round(strategy.lossDetail.totalLoss * ELECTRICITY_PRICE * 100) / 100;
    }

    return strategy;
  });
}

function buildCommRecoveryRecords(): CommRecoveryRecord[] {
  return [
    {
      id: 'REC-COMM-001',
      inverterId: 'INV-028',
      inverterCode: 'PV-INV-028',
      lostAt: hoursAgo(3.5),
      restoredAt: hoursAgo(0.1),
      downtimeMinutes: 204,
      returnedPower: 180.5,
      targetRatioAtRecovery: 30,
      recalculatedRatio: 28,
      recalculatedStatus: 'executed',
      recalculatedAt: hoursAgo(0.05),
      recalculatedBy: '场站值班员-王值班'
    }
  ];
}

export const mockInverters: Inverter[] = buildInverters();
export const mockStrategies: CurtailmentStrategy[] = buildStrategies(mockInverters);
export const mockRecords: MaintenanceRecord[] = buildMaintenanceRecords(mockInverters);
export const mockCommRecoveryRecords: CommRecoveryRecord[] = buildCommRecoveryRecords();

export const MAINTENANCE_STAFF_LIST = MAINTENANCE_STAFF;
export const DISPATCHER_LIST = DISPATCHERS;
export const ELECTRICITY_PRICE = 0.38;
export const PEAK_IRRADIANCE_HOURS = 4.2;
