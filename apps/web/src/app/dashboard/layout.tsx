import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { getSession } from '@/lib/session';
import { PlanProvider } from '@/lib/plan-context';
import { ToastProvider } from '@/lib/toast-context';
import { ToastContainer } from '@/components/layout/toast-container';
import { PlanLimitInterceptor } from '@/components/plan/plan-limit-interceptor';
import { UsageWarningNotifier } from '@/components/plan/usage-warning-notifier';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <ToastProvider>
      <PlanProvider>
        <PlanLimitInterceptor />
        <UsageWarningNotifier />
        <div className="flex min-h-screen">
          <Sidebar userEmail={session.email} userRole={session.role} />
          <main className="flex-1 p-6 lg:p-8 ml-[260px] min-h-screen">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
        <ToastContainer />
      </PlanProvider>
    </ToastProvider>
  );
}
