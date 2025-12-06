'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Ticket, Plus, Trash2, Loader2, Tag } from 'lucide-react';

type Coupon = {
    id: string;
    code: string;
    discount_value: number;
    discount_type: 'flat' | 'percentage';
    is_active: boolean;
    min_order_amount: number;
};

export default function CouponManager() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [code, setCode] = useState('');
    const [value, setValue] = useState('');
    const [type, setType] = useState<'flat' | 'percentage'>('flat');
    const [minAmount, setMinAmount] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
            .from('coupons')
            .select('*')
            .eq('enterprise_id', user.id)
            .order('created_at', { ascending: false });
        if (data) setCoupons(data);
    };

    const handleAddOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || !value) return;
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
            enterprise_id: user.id,
            code: code.toUpperCase(),
            discount_value: parseFloat(value),
            discount_type: type,
            min_order_amount: parseFloat(minAmount) || 0
        };

        let error;

        if (editingId) {
            const { error: err } = await supabase
                .from('coupons')
                .update(payload)
                .eq('id', editingId);
            error = err;
        } else {
            const { error: err } = await supabase.from('coupons').insert(payload);
            error = err;
        }

        if (!error) {
            resetForm();
            fetchCoupons();
        }
        setLoading(false);
    };

    const resetForm = () => {
        setCode('');
        setValue('');
        setMinAmount('');
        setType('flat');
        setEditingId(null);
    };

    const startEdit = (coupon: Coupon) => {
        setCode(coupon.code);
        setValue(coupon.discount_value.toString());
        setType(coupon.discount_type);
        setMinAmount(coupon.min_order_amount?.toString() || '');
        setEditingId(coupon.id);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this coupon?")) return;
        const { error } = await supabase.from('coupons').delete().eq('id', id);
        if (!error) fetchCoupons();
    };

    /*
    const toggleActive = async (id: string, current: boolean) => {
        await supabase.from('coupons').update({ is_active: !current }).eq('id', id);
        fetchCoupons();
    }
    */

    return (
        <section className="glass-card p-6 rounded-2xl h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-500/20 rounded-xl text-green-400">
                    <Ticket size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Coupons</h2>
            </div>

            <form onSubmit={handleAddOrUpdate} className="flex flex-col gap-3 mb-6 bg-white/5 p-4 rounded-xl">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-white text-sm"
                        placeholder="Code (e.g. SAVE10)"
                        required
                    />
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                        className="bg-black/40 text-white rounded-lg border border-white/10 px-2 text-sm outline-none"
                    >
                        <option value="flat">₹ Flat</option>
                        <option value="percentage">% Off</option>
                    </select>
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-white text-sm"
                        placeholder="Value"
                        required
                    />
                    <input
                        type="number"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                        className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-white text-sm"
                        placeholder="Min Order ₹"
                    />
                </div>
                <div className="flex justify-end gap-2">
                    {editingId && (
                        <button type="button" onClick={resetForm} className="text-gray-400 text-xs hover:text-white">Cancel</button>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-6 py-2 text-sm font-bold flex items-center justify-center transition-colors"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : (editingId ? "Update Coupon" : "Add Coupon")}
                    </button>
                </div>
            </form>

            <div className="space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2 flex-1">
                {coupons.map((coupon) => (
                    <div key={coupon.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-green-500/30 transition-colors">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white tracking-wide">{coupon.code}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${coupon.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {coupon.is_active ? 'ACTIVE' : 'INACTIVE'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                {coupon.discount_type === 'flat' ? `₹${coupon.discount_value} OFF` : `${coupon.discount_value}% OFF`}
                                {coupon.min_order_amount > 0 && <span className="ml-2 text-gray-500">• Min Order: ₹{coupon.min_order_amount}</span>}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            {/* <button onClick={() => toggleActive(coupon.id, coupon.is_active)} className="text-gray-400 hover:text-white" title="Toggle Active">
                                <Tag size={16} />
                            </button> */}
                            <button onClick={() => startEdit(coupon)} className="text-blue-400 hover:text-blue-300">
                                <Ticket size={16} />
                            </button>
                            <button onClick={() => handleDelete(coupon.id)} className="text-red-400 hover:text-red-300">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {coupons.length === 0 && <p className="text-gray-500 text-sm italic text-center py-4">No coupons created.</p>}
            </div>
        </section>
    );
}
