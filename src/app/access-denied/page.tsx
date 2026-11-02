export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">No sections assigned</h1>
        <p className="mt-2 text-sm text-slate-600">Ask an administrator to grant access to at least one section.</p>
      </div>
    </div>
  );
}
