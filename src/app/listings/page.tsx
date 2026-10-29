import AppShell from "@/components/AppShell";
import ListingTable from "@/components/ListingTable";

export default function Page() {
  return (
    <AppShell current="/listings">
      <div className="page-heading">
        <div>
          <h1>Marketplace listings</h1>
          <p className="subtitle">
            Track channel-specific listing IDs and synchronization status.
          </p>
        </div>
      </div>
      <ListingTable />
    </AppShell>
  );
}
