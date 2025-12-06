export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
            {/* We can add a global header here if needed, but requirements are specific per page */}
            {children}
        </div>
    )
}
