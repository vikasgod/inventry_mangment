import AppShell from "@/components/AppShell";


export default function Page() {
  return <AppShell current="/warehouses">
    <div className="page-heading"><div><h1>Warehouses</h1><p className="subtitle">Manage stock by physical warehouse.</p></div></div>
    <div className="panel"><div className="empty">The starter uses a MAIN warehouse. Add a Warehouse model and warehouse administration when you need multiple locations.</div></div>
  </AppShell>;
}
