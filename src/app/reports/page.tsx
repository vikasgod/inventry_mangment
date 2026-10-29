import AppShell from "@/components/AppShell";

export default function Page() {
  return (
    <AppShell current="/reports">
      <div className="page-heading">
        <div>
          <h1>Reports</h1>
          <p className="subtitle">
            Review inventory, sales and channel health.
          </p>
        </div>
      </div>
      <div className="panel">
        <div className="empty">
          Sales and profit reports become meaningful after channel order
          ingestion and fee data are integrated.
        </div>
      </div>
    </AppShell>
  );
}
