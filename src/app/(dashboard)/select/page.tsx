'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Plus, FileText, ShoppingBag } from 'lucide-react';
import { logoutGuest } from '@/app/guest-actions';
import { useGuest } from '@/hooks/useGuest';

export default function SelectPage() {
    const router = useRouter();
    const supabase = createClient();

    const isGuest = useGuest();

    const handleLogout = async () => {
        if (isGuest) {
            await logoutGuest();
        } else {
            await supabase.auth.signOut();
            router.push('/login');
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black pointer-events-none" />

            <div className="relative z-10 w-full max-w-4xl">
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                            Dashboard
                        </h1>
                        <p className="text-gray-400 mt-2">Manage your enterprise</p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Tile 1: Add Products */}
                    <Link href="/addproducts" className="group">
                        <div className="h-64 glass-card rounded-3xl p-8 flex flex-col justify-between hover:border-purple-500/50 transition-all transform hover:-translate-y-1 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-purple-500/20" />

                            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                                <ShoppingBag size={28} />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">Manage Products</h2>
                                <p className="text-gray-400">Add products, categories, coupons, and configure company details.</p>
                            </div>

                            <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                                <div className="bg-purple-500 text-white p-3 rounded-full shadow-lg shadow-purple-900/40">
                                    <Plus size={24} />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Tile 2: Invoice Form */}
                    <Link href="/invoiceform" className="group">
                        <div className="h-64 glass-card rounded-3xl p-8 flex flex-col justify-between hover:border-blue-500/50 transition-all transform hover:-translate-y-1 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20" />

                            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                                <FileText size={28} />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">Create Invoice</h2>
                                <p className="text-gray-400">Generate PDF invoices, manage billing, and customer details.</p>
                            </div>

                            <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
                                <div className="bg-blue-500 text-white p-3 rounded-full shadow-lg shadow-blue-900/40">
                                    <Plus size={24} />
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
