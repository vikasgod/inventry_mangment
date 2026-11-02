import Sidebar, { type SessionUser } from "@/components/Sidebar";

export default function AppShell({ children, user }: { children: React.ReactNode; user: SessionUser }) {
  return <div className="shell">
    <Sidebar user={user}/>
    <div className="main">
      <header className="topbar">
        <div><strong>Inventory workspace</strong><br/><small>Manage products, stock and channels</small></div>
        <div className="badge">Admin workspace</div>
      </header>
      <main className="content">{children}</main>
    </div>
  </div>;
}
