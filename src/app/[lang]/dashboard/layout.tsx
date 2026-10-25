import { Suspense } from "react";
import { DashboardNotice } from "@/components/DashboardNotice";
import { DashNav } from "@/components/dashboard/DashNav";

// Статична обвивка — сесията се чете само в съдържанието (зад Suspense)
export default function DashboardLayout({ children }: LayoutProps<"/[lang]/dashboard">) {
  return (
    <div className="container dash">
      <Suspense fallback={<DashNav static />}>
        <DashNav />
      </Suspense>
      <div className="dash-body">
        <Suspense fallback={null}>
          <DashboardNotice />
        </Suspense>
        {children}
      </div>
    </div>
  );
}
