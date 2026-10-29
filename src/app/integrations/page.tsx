import AppShell from "@/components/AppShell";
import IntegrationPanel from "@/components/IntegrationPanel";

export default function Page() {
  return <AppShell current="/integrations">
    <div className="page-heading"><div><h1>Integrations</h1><p className="subtitle">Configure your marketplace connection workflow.</p></div></div>
    <IntegrationPanel/>
  </AppShell>;
}
