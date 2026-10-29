import AppShell from "@/components/AppShell";
import InventoryTable from "@/components/InventoryTable";

export default function Page() {
  return <AppShell current="/inventory">
    <div className="page-heading"><div><h1>Inventory</h1><p className="subtitle">Monitor physical, reserved and sellable stock.</p></div></div>
    <InventoryTable/>
  </AppShell>;
}
