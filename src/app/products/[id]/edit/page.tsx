
import ProductForm from "@/components/products/ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#f4f7fc] p-4 sm:p-6">
      <ProductForm productId={id} />
    </div>
  );
}
