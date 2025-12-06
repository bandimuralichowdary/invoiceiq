/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Save, Loader2, ArrowLeft } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from 'next/link';
import { useGuest } from '@/hooks/useGuest';

type Category = { id: string; name: string };
type Product = {
    id: string;
    category_id: string;
    name: string;
    brand: string;
    price: number;
    stock_quantity: number;
    gst_percentage: number;
};
type InvoiceItem = {
    id: number; // local temp id
    category_id: string;
    product_name: string;
    product_id: string; // Specific brand variant
    brand: string;
    price: number;
    quantity: number;
    stock: number;
    gst: number;
};

export default function InvoiceForm() {
    const [loading, setLoading] = useState(false);
    const [enterprise, setEnterprise] = useState<{ name: string, logo_url: string } | null>(null);

    // Data
    const [categories, setCategories] = useState<Category[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);

    // Form Fields
    const [customerName, setCustomerName] = useState('');
    const [customerMobile, setCustomerMobile] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [couponCode, setCouponCode] = useState('');
    const [discount, setDiscount] = useState<{ value: number, type: 'flat' | 'percentage', min_order_amount: number } | null>(null);
    const [couponError, setCouponError] = useState('');

    const router = useRouter();
    const supabase = createClient();
    const isGuest = useGuest();

    useEffect(() => {
        fetchInitialData();
    }, [isGuest]);

    const fetchInitialData = async () => {
        if (isGuest) {
            setEnterprise({ name: 'Guest Enterprise', logo_url: '' });
            setCategories([{ id: 'guest-cat-1', name: 'Electronics' }]);
            setAllProducts([{
                id: 'guest-prod-1',
                name: 'Demo Laptop',
                brand: 'TechGuest',
                price: 50000,
                stock_quantity: 10,
                gst_percentage: 18,
                category_id: 'guest-cat-1'
            }]);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch Enterprise
        const { data: ent } = await supabase.from('enterprises').select('name, logo_url').eq('id', user.id).single();
        if (ent) setEnterprise(ent);

        // Fetch Categories
        const { data: cats } = await supabase.from('categories').select('*').eq('enterprise_id', user.id);
        if (cats) setCategories(cats);

        // Fetch All Products (Optimized: Fetch all and filter locally for responsiveness)
        const { data: prods } = await supabase.from('products').select('*').eq('enterprise_id', user.id);
        if (prods) setAllProducts(prods);
    };

    // Helper: Get Unique Product Names for Category
    const getProductNames = (catId: string) => {
        const contextProducts = allProducts.filter(p => p.category_id === catId);
        return Array.from(new Set(contextProducts.map(p => p.name)));
    };

    // Helper: Get Brands for Product Name
    const getBrands = (catId: string, pName: string) => {
        return allProducts.filter(p => p.category_id === catId && p.name === pName);
    };

    const addItem = () => {
        setItems([...items, {
            id: Date.now(),
            category_id: '',
            product_name: '',
            product_id: '',
            brand: '',
            price: 0,
            quantity: 1,
            stock: 0,
            gst: 0
        }]);
    };

    const updateItem = (id: number, field: keyof InvoiceItem, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };

                // Cascade Logic
                if (field === 'category_id') {
                    updated.product_name = '';
                    updated.product_id = '';
                    updated.brand = '';
                    updated.price = 0;
                    updated.stock = 0;
                    updated.gst = 0;
                }
                if (field === 'product_name') {
                    updated.product_id = '';
                    updated.brand = '';
                    updated.price = 0;
                    updated.stock = 0;
                    updated.gst = 0;
                }
                if (field === 'product_id') {
                    // Find the exact product variant to fill details
                    const variant = allProducts.find(p => p.id === value);
                    if (variant) {
                        updated.brand = variant.brand; // Visual confirm
                        updated.price = variant.price;
                        updated.stock = variant.stock_quantity;
                        updated.gst = variant.gst_percentage;
                    }
                }
                if (field === 'quantity') {
                    // Stock Check
                    if (value > updated.stock) {
                        alert(`Cannot exceed available stock of ${updated.stock}`);
                        updated.quantity = updated.stock;
                    }
                    if (value < 1) updated.quantity = 1;
                }
                return updated;
            }
            return item;
        }));
    };

    const removeItem = (id: number) => {
        setItems(items.filter(i => i.id !== id));
    };

    const applyCoupon = async () => {
        setCouponError('');
        setDiscount(null);
        if (!couponCode.trim()) return;

        if (isGuest) {
            if (couponCode.toUpperCase() === 'GUEST20') {
                setDiscount({ value: 20, type: 'percentage', min_order_amount: 0 });
            } else {
                setCouponError('Invalid coupon (Try GUEST20)');
            }
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase.from('coupons')
            .select('*')
            .eq('code', couponCode.toUpperCase())
            .eq('enterprise_id', user.id)
            .eq('is_active', true)
            .single();

        if (data) {
            setDiscount({
                value: data.discount_value,
                type: data.discount_type,
                min_order_amount: data.min_order_amount || 0
            });
        } else {
            setCouponError('Invalid or inactive coupon code');
        }
    };

    // Calculations
    const calculateTotal = () => {
        let subTotal = 0;
        let totalGst = 0;

        items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            const tax = (itemTotal * item.gst) / 100;
            subTotal += itemTotal;
            totalGst += tax;
        });

        let grandTotal = subTotal + totalGst;

        if (discount) {
            if (subTotal < discount.min_order_amount) {
                // Do not apply discount yet, maybe handle UI warning else where or just don't subtract
                // We will handle the UI warning in the return render
            } else {
                if (discount.type === 'flat') {
                    grandTotal -= discount.value;
                } else {
                    grandTotal -= (grandTotal * discount.value / 100);
                }
            }
        }
        return Math.max(0, grandTotal).toFixed(2);
    };

    const handleGenerate = async () => {
        if (items.length === 0) {
            alert("Add at least one product");
            return;
        }
        if (!customerName) {
            alert("Enter customer name");
            return;
        }

        setLoading(true);

        try {
            let invoiceId = 'GUEST-' + Date.now();
            let invoiceNumber = 'INV-GUEST';

            if (!isGuest) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Save Invoice Header
                const { data: invoiceData, error: invError } = await supabase.from('invoices').insert({
                    enterprise_id: user.id,
                    customer_name: customerName,
                    customer_mobile: customerMobile,
                    total_amount: parseFloat(calculateTotal()),
                    coupon_code: discount ? couponCode : null
                }).select().single();

                if (invError) throw invError;

                invoiceId = invoiceData.id;
                invoiceNumber = invoiceData.invoice_number;

                // 2. Save Items & Reduce Stock concurrently
                for (const item of items) {
                    await supabase.from('invoice_items').insert({
                        invoice_id: invoiceId,
                        product_id: item.product_id,
                        product_name: item.product_name,
                        quantity: item.quantity,
                        price: item.price,
                        gst: item.gst,
                        total: (item.price * item.quantity)
                    });

                    await supabase.from('products').update({
                        stock_quantity: item.stock - item.quantity
                    }).eq('id', item.product_id);
                }
            }

            // 3. Generate PDF (Common for Guest & User)
            const doc = new jsPDF();

            // Header
            if (enterprise?.name) {
                doc.setFontSize(22);
                doc.text(enterprise.name, 14, 20);
            }
            doc.setFontSize(12);
            doc.text("INVOICE", 14, 30);
            doc.text(`Customer: ${customerName}`, 14, 40);
            doc.text(`Mobile: ${customerMobile}`, 14, 46);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 40);
            doc.text(`Invoice #: ${invoiceNumber}`, 150, 46);

            // Table
            const tableRows = items.map((item, index) => [
                index + 1,
                `${item.product_name} (${item.brand})`,
                item.quantity,
                item.price.toFixed(2),
                `${item.gst}%`,
                (item.price * item.quantity).toFixed(2)
            ]);

            autoTable(doc, {
                startY: 55,
                head: [['#', 'Product', 'Qty', 'Price', 'Tax', 'Total']],
                body: tableRows,
            });

            // Totals
            const finalY = (doc as any).lastAutoTable.finalY || 60;
            doc.text(`Grand Total: ₹${calculateTotal()}`, 14, finalY + 10);
            if (discount) {
                doc.setFontSize(10);
                doc.text(`(Discount Applied: ${couponCode})`, 14, finalY + 16);
            }

            // Save
            doc.save(`invoice_${invoiceNumber}.pdf`);

            alert("Invoice Generated Successfully!");

            if (!isGuest) {
                router.push('/addproducts');
            }

        } catch (err: any) {
            console.error(err);
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/select"
                    className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">New Invoice</h1>
                    <p className="text-gray-400">Generate bills for your customers</p>
                </div>
            </div>

            {/* Header Section */}
            <section className="glass-card p-6 rounded-2xl flex justify-between items-start">
                <div className="w-full max-w-md space-y-4">
                    <div>
                        <label className="text-sm text-gray-400">Customer Name</label>
                        <input
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400">Mobile Number</label>
                        <input
                            value={customerMobile}
                            onChange={(e) => setCustomerMobile(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                            placeholder="9876543210"
                        />
                    </div>
                </div>

                <div className="text-right">
                    {enterprise?.logo_url && (
                        <img src={enterprise.logo_url} alt="Logo" className="h-16 object-contain ml-auto mb-2" />
                    )}
                    <h2 className="text-2xl font-bold text-white uppercase">{enterprise?.name || 'My Company'}</h2>
                    <p className="text-gray-400 text-sm">Date: {new Date().toLocaleDateString()}</p>
                </div>
            </section>

            {/* Dynamic Table */}
            <section className="glass-card p-6 rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-gray-400 text-xs uppercase border-b border-white/10">
                                <th className="p-3">#</th>
                                <th className="p-3 min-w-[150px]">Category</th>
                                <th className="p-3 min-w-[150px]">Product</th>
                                <th className="p-3 min-w-[150px]">Brand</th>
                                <th className="p-3">Qty</th>
                                <th className="p-3">Price</th>
                                <th className="p-3">Stock</th>
                                <th className="p-3">Total</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {items.map((item, idx) => (
                                <tr key={item.id} className="border-b border-white/5">
                                    <td className="p-3 text-gray-500">{idx + 1}</td>
                                    <td className="p-3">
                                        <select
                                            value={item.category_id}
                                            onChange={(e) => updateItem(item.id, 'category_id', e.target.value)}
                                            className="bg-black/40 border border-white/10 rounded px-2 py-1 w-full text-gray-300"
                                        >
                                            <option value="">Select</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-3">
                                        <select
                                            value={item.product_name}
                                            disabled={!item.category_id}
                                            onChange={(e) => updateItem(item.id, 'product_name', e.target.value)}
                                            className="bg-black/40 border border-white/10 rounded px-2 py-1 w-full text-gray-300 disabled:opacity-50"
                                        >
                                            <option value="">Select</option>
                                            {getProductNames(item.category_id).map(name => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-3">
                                        <select
                                            value={item.product_id}
                                            disabled={!item.product_name}
                                            onChange={(e) => updateItem(item.id, 'product_id', e.target.value)}
                                            className="bg-black/40 border border-white/10 rounded px-2 py-1 w-full text-gray-300 disabled:opacity-50"
                                        >
                                            <option value="">Select</option>
                                            {getBrands(item.category_id, item.product_name).map(p => (
                                                <option key={p.id} value={p.id}>{p.brand}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateItem(item.id, 'quantity', item.quantity - 1)}
                                                className="px-2 bg-white/10 rounded hover:bg-white/20"
                                            >-</button>
                                            <span className="w-8 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateItem(item.id, 'quantity', item.quantity + 1)}
                                                className="px-2 bg-white/10 rounded hover:bg-white/20"
                                            >+</button>
                                        </div>
                                    </td>
                                    <td className="p-3 text-white">₹{item.price}</td>
                                    <td className="p-3 text-gray-400">{item.stock}</td>
                                    <td className="p-3 text-white font-bold">₹{(item.price * item.quantity).toFixed(2)}</td>
                                    <td className="p-3">
                                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-white">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <button
                    onClick={addItem}
                    className="mt-4 flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
                >
                    <Plus size={18} /> Add Product
                </button>
            </section>

            {/* Footer / Calculation */}
            <section className="glass-card p-8 rounded-2xl">
                <div className="flex flex-col md:flex-row justify-between items-end gap-8">
                    <div className="w-full max-w-xs">
                        <label className="text-sm text-gray-400 mb-2 block">Coupon Code</label>
                        <div className="flex gap-2">
                            <input
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                placeholder="PROMO20"
                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                            />
                            <button
                                onClick={applyCoupon}
                                className="bg-purple-600 hover:bg-purple-500 text-white px-4 rounded-lg font-bold"
                            >Apply</button>
                        </div>
                        {couponError && <p className="text-xs text-red-400 mt-2">{couponError}</p>}
                        {discount && <p className="text-xs text-green-400 mt-2">Discount Applied!</p>}
                    </div>

                    <div className="text-right space-y-2">
                        <div className="text-2xl font-bold text-gray-400">Total: <span className="text-white">₹{calculateTotal()}</span></div>
                        {discount && (
                            calculateTotal() === (items.reduce((acc, i) => acc + (i.price * i.quantity), 0) + items.reduce((acc, i) => acc + (i.price * i.quantity * i.gst / 100), 0)).toFixed(2)
                                && items.reduce((acc, i) => acc + (i.price * i.quantity), 0) < discount.min_order_amount
                                ? <div className="text-sm text-yellow-400">Add items worth ₹{discount.min_order_amount} to apply coupon</div>
                                : <div className="text-sm text-green-400">Includes discount</div>
                        )}

                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="mt-4 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:from-green-500 hover:to-emerald-500 transition-all flex items-center gap-2 ml-auto"
                        >
                            {loading ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                            <span>Generate & Download Bill</span>
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
