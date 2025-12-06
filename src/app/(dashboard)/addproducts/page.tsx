'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CompanySection from '@/components/dashboard/CompanySection';
import CategoryManager from '@/components/dashboard/CategoryManager';
import ProductManager from '@/components/dashboard/ProductManager';
import CouponManager from '@/components/dashboard/CouponManager';
import InvoiceHistory from '@/components/dashboard/InvoiceHistory';

export default function AddProductsPage() {
    return (
        <div className="min-h-screen p-6 pb-20">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header & Back Button */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/select"
                        className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Product Management</h1>
                        <p className="text-gray-400">Configure your enterprise settings and inventory</p>
                    </div>
                </div>

                {/* Sections */}
                <CompanySection />

                <div className="grid lg:grid-cols-2 gap-8">
                    <CategoryManager />
                    <CouponManager />
                </div>

                <ProductManager />

                <InvoiceHistory />
            </div>
        </div>
    );
}
