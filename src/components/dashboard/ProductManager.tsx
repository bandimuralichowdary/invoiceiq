'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Package, Plus, Trash2, Search, Loader2, Edit2 } from 'lucide-react';
import { useGuest } from '@/hooks/useGuest';

type Product = {
    id: string;
    category_id: string;
    name: string;
    brand: string;
    price: number;
    stock_quantity: number;
    gst_percentage: number;
};

type Category = {
    id: string;
    name: string;
};

export default function ProductManager() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [gst, setGst] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const supabase = createClient();
    const isGuest = useGuest();

    useEffect(() => {
        fetchData();
    }, [isGuest]); // Re-fetch if guest mode detected

    const fetchData = async () => {
        if (isGuest) {
            // Mock data for guest
            setCategories([{ id: 'guest-cat-1', name: 'Electronics' }]);
            setProducts([{
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

        // Fetch Categories
        const { data: catData } = await supabase
            .from('categories')
            .select('id, name')
            .eq('enterprise_id', user.id);
        if (catData) setCategories(catData);

        // Fetch Products
        fetchProductsList(user.id);
    };

    const fetchProductsList = async (userId: string) => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('enterprise_id', userId)
            .order('created_at', { ascending: false });
        if (data) setProducts(data);
    }

    const handleAddOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isGuest) {
            alert("Guest mode: Changes are not saved.");
            return;
        }

        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payload = {
            enterprise_id: user.id,
            category_id: categoryId,
            name: name,
            brand: brand,
            price: parseFloat(price),
            stock_quantity: parseInt(stock),
            gst_percentage: parseFloat(gst)
        };

        let error;
        if (editingId) {
            const { error: err } = await supabase.from('products').update(payload).eq('id', editingId);
            error = err;
        } else {
            const { error: err } = await supabase.from('products').insert(payload);
            error = err;
        }

        if (!error) {
            resetForm();
            fetchProductsList(user.id);
        }
        setLoading(false);
    };

    const resetForm = () => {
        setName('');
        setBrand('');
        setCategoryId('');
        setPrice('');
        setStock('');
        setGst('');
        setEditingId(null);
    };

    const startEdit = (p: Product) => {
        setName(p.name);
        setBrand(p.brand);
        setCategoryId(p.category_id);
        setPrice(p.price.toString());
        setStock(p.stock_quantity.toString());
        setGst(p.gst_percentage.toString());
        setEditingId(p.id);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (isGuest) {
            alert("Guest mode: Cannot delete.");
            return;
        }
        if (!confirm("Delete this product?")) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) fetchProductsList(user.id);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <section className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
                    <Package size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Inventory / Products</h2>
            </div>

            {/* Add Product Form */}
            <form onSubmit={handleAddOrUpdate} className="bg-white/5 p-6 rounded-xl mb-8 border border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
                    {editingId && <button type="button" onClick={resetForm} className="text-xs text-red-400">Cancel Edit</button>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="col-span-1">
                        <label className="text-xs text-gray-500 block mb-1">Category</label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            required
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                        >
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="col-span-1">
                        <label className="text-xs text-gray-500 block mb-1">Product Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="e.g. Smartphone"
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="text-xs text-gray-500 block mb-1">Brand</label>
                        <input
                            type="text"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                            required
                            placeholder="e.g. Apple"
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="text-xs text-gray-500 block mb-1">Price (₹)</label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="text-xs text-gray-500 block mb-1">Stock Qty</label>
                        <input
                            type="number"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            required
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="col-span-1">
                        <label className="text-xs text-gray-500 block mb-1">GST (%)</label>
                        <input
                            type="number"
                            value={gst}
                            onChange={(e) => setGst(e.target.value)}
                            required
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        <span>{editingId ? 'Update Product' : 'Add Product'}</span>
                    </button>
                </div>
            </form>

            {/* Product List */}
            <div>
                <div className="flex items-center gap-2 mb-4 bg-white/5 p-2 rounded-lg border border-white/10 w-full max-w-sm">
                    <Search size={18} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent outline-none text-white text-sm w-full"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-gray-400 text-xs uppercase border-b border-white/10">
                                <th className="p-3">Name</th>
                                <th className="p-3">Brand</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Price</th>
                                <th className="p-3">Stock</th>
                                <th className="p-3">GST</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {filteredProducts.map(p => (
                                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <td className="p-3 text-white font-medium">{p.name}</td>
                                    <td className="p-3 text-gray-300">{p.brand}</td>
                                    <td className="p-3 text-gray-400">{categories.find(c => c.id === p.category_id)?.name || '-'}</td>
                                    <td className="p-3 text-white">₹{p.price}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs ${p.stock_quantity > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {p.stock_quantity}
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-400">{p.gst_percentage}%</td>
                                    <td className="p-3">
                                        <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={16} />
                                        </button>
                                        <button onClick={() => startEdit(p)} className="text-blue-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                            <Edit2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredProducts.length === 0 && <div className="text-center p-8 text-gray-500 italic">No products found.</div>}
                </div>
            </div>
        </section>
    );
}
