export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4">
            <span className="text-white text-xl font-bold">FE</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Future Education</h1>
          <p className="text-sm text-gray-500 mt-1">Lead Management System</p>
        </div>
        {children}
      </div>
    </div>
  );
}
