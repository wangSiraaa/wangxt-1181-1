import { AppProvider, useApp } from './store/AppContext';
import Header from './components/Header';
import StrategyDashboard from './components/StrategyDashboard';
import InverterTable from './components/InverterTable';
import UnavailableList from './components/UnavailableList';
import LossEstimation from './components/LossEstimation';
import StrategyComparison from './components/StrategyComparison';
import Toast from './components/Toast';

function AppContent() {
  const { showStrategyComparison } = useApp();
  return (
    <div className="min-h-screen bg-ink-100">
      <Header />
      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <StrategyDashboard />
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3">
            <InverterTable />
          </div>
          <div className="xl:col-span-2">
            <UnavailableList />
          </div>
        </div>
        <LossEstimation />

        <footer className="pt-4 pb-2 text-center text-xs text-ink-400">
          <p>
            光伏电站逆变器限发策略管理系统 · v1.0 ·
            数据本地联动，实时计算策略达成率与发电损失 ·
            <span className="mx-1 text-ink-300">|</span>
            业务规则：通讯中断→不标记已执行、限发解除前→禁止手动满发、检修中→从达成率剔除
            <span className="mx-1 text-ink-300">|</span>
            新增：策略滚动·通讯恢复补判·版本对比·追责追踪
          </p>
        </footer>
      </main>
      <Toast />
      {showStrategyComparison && <StrategyComparison />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
