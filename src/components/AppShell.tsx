import Sidebar from "@/components/Sidebar";

export default function AppShell({ children, current = "/" }: { children: React.ReactNode; current?: string }) {
  return <div className="shell">
    <Sidebar current={current}/>
    <div className="main">
      <header className="topbar">
        <div><strong>Inventory workspace</strong><br/><small>Manage products, stock and channels</small></div>
        <div className="badge">Admin workspace</div>
      </header>
      <main className="content">{children}</main>
    </div>
  </div>;
}
