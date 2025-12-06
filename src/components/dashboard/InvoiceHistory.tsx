'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, Download, Trash2, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useGuest } from '@/hooks/useGuest';

type Invoice = {
    id: string;
    customer_name: string;
    total_amount: number;
    created_at: string;
    invoice_number: number;
};

export default function InvoiceHistory() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const isGuest = useGuest();

    useEffect(() => {
        fetchInvoices();
    }, [isGuest]);

    const fetchInvoices = async () => {
        if (isGuest) {
            // We can't easily show history for guest unless we store in localstorage, which we aren't doing.
            // Just show empty or maybe a mock item if we want.
            // For now, empty is fine.
            setLoading(false);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('invoices')
            .select('*')
            .eq('enterprise_id', user.id)
            .order('created_at', { ascending: false });

        if (data) setInvoices(data);
        setLoading(false);
    };

    const handleDownload = async (invoice: Invoice) => {
        if (isGuest) return;

        try {
            // 1. Fetch Invoice Items
            const { data: items } = await supabase
                .from('invoice_items')
                .select('*')
                .eq('invoice_id', invoice.id);

            if (!items || items.length === 0) {
                alert("No items found for this invoice.");
                return;
            }

            // 2. Fetch Enterprise Info
            const { data: { user } } = await supabase.auth.getUser();
            const { data: ent } = await supabase.from('enterprises').select('name').eq('id', user?.id).single();

            // 3. Generate PDF
            const doc = new jsPDF();

            // Header
            if (ent?.name) {
                doc.setFontSize(22);
                doc.text(ent.name, 14, 20);
            }
            doc.setFontSize(12);
            doc.text("INVOICE", 14, 30);
            doc.text(`Customer: ${invoice.customer_name}`, 14, 40);

            const dateStr = new Date(invoice.created_at).toLocaleDateString();
            doc.text(`Date: ${dateStr}`, 150, 40);
            doc.text(`Invoice #: ${invoice.invoice_number}`, 150, 46);

            // Table
            const tableRows = items.map((item, index) => [
                index + 1,
                item.product_name,
                item.quantity,
                item.price.toFixed(2),
                `${item.gst}%`,
                // Calculate total if not strictly stored, but we do store 'total' in invoice_items typically or calculate it
                // Logic in InvoiceForm used (item.price * item.quantity).toFixed(2)
                (item.price * item.quantity).toFixed(2)
            ]);

            autoTable(doc, {
                startY: 55,
                head: [['#', 'Product', 'Qty', 'Price', 'Tax', 'Total']],
                body: tableRows,
            });

            // Totals
            const finalY = (doc as any).lastAutoTable.finalY || 60;
            doc.text(`Grand Total: ₹${invoice.total_amount}`, 14, finalY + 10);

            // Save
            doc.save(`invoice_${invoice.invoice_number}.pdf`);
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to download invoice.");
        }
    };

    const handleDelete = async (id: string) => {
        if (isGuest) {
            alert("Guest mode: Cannot delete.");
            return;
        }
        if (!confirm("Are you sure you want to delete this invoice? This cannot be undone.")) return;

        const { error } = await supabase.from('invoices').delete().eq('id', id);
        if (!error) {
            setInvoices(invoices.filter(i => i.id !== id));
        } else {
            alert("Failed to delete invoice.");
        }
    };

    return (
        <section className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                    <FileText size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Generated Invoices</h2>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-gray-400 text-xs uppercase border-b border-white/10">
                            <th className="p-3">Inv #</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {invoices.map(inv => (
                            <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-3 text-indigo-300 font-mono">#{inv.invoice_number}</td>
                                <td className="p-3 text-gray-300">{new Date(inv.created_at).toLocaleDateString()}</td>
                                <td className="p-3 text-white">{inv.customer_name}</td>
                                <td className="p-3 text-green-400 font-bold">₹{inv.total_amount}</td>
                                <td className="p-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDownload(inv)}
                                            className="text-gray-400 hover:text-white flex items-center gap-2 text-xs border border-white/10 px-2 py-1 rounded hover:bg-white/5 transition-colors"
                                        >
                                            <Download size={14} />
                                            Download
                                        </button>
                                        <button
                                            onClick={() => handleDelete(inv.id)}
                                            className="text-red-400 hover:text-red-300 ml-2"
                                            title="Delete Invoice"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && invoices.length === 0 && <div className="p-8 text-center text-gray-500">No invoices generated yet.</div>}
            </div>
        </section>
    );
}
