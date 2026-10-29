import AppShell from "@/components/AppShell";
import ProductForm from "@/components/ProductForm";

export default function NewProductPage() {
  return <AppShell current="/products"><div className="page-heading"><div><h1>Add product</h1><p className="subtitle">Create the master product and select publishing channels.</p></div></div><div className="panel"><ProductForm/></div></AppShell>;
}
