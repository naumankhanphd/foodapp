import { AlarmController } from "./alarm-banner";

type StaffLayoutProps = {
  children: React.ReactNode;
};

export default function StaffLayout({ children }: StaffLayoutProps) {
  return (
    <main className="py-6 sm:py-10">
      <AlarmController />
      <div className="shell">
        {children}
      </div>
    </main>
  );
}
