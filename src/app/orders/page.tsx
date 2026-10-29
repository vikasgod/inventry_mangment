import AppShell from "@/components/AppShell";
import OrdersPanel from "@/components/OrdersPanel";

export default function Page() {
  return <AppShell current="/orders">
    <div className="page-heading"><div><h1>Orders</h1><p className="subtitle">Unified order view across all connected channels.</p></div></div>
    <OrdersPanel/>
  </AppShell>;
}
