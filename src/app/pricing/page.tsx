import AppShell from "@/components/AppShell";
import PricingForm from "@/components/PricingForm";

export default function Page() {
  return <AppShell current="/pricing">
    <div className="page-heading"><div><h1>Pricing & offers</h1><p className="subtitle">Set channel-specific prices with minimum-price guardrails.</p></div></div>
    <PricingForm/>
  </AppShell>;
}
