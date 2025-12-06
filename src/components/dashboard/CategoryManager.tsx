'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Layers, Plus, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react';

type Category = {
    id: string;
    name: string;
};

export default function CategoryManager() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
            .from('categories')
            .select('*')
            .eq('enterprise_id', user.id)
            .order('created_at', { ascending: true });
        if (data) setCategories(data);
    };

    const handleAdd = async () => {
        if (!newCategory.trim()) return;
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('categories').insert({
            enterprise_id: user.id,
            name: newCategory
        });

        if (!error) {
            setNewCategory('');
            fetchCategories();
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this category?")) return;
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (!error) fetchCategories();
    };

    const startEdit = (cat: Category) => {
        setEditingId(cat.id);
        setEditName(cat.name);
    };

    const saveEdit = async () => {
        if (!editingId || !editName.trim()) return;
        const { error } = await supabase
            .from('categories')
            .update({ name: editName })
            .eq('id', editingId);

        if (!error) {
            setEditingId(null);
            fetchCategories();
        }
    };

    return (
        <section className="glass-card p-6 rounded-2xl h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-pink-500/20 rounded-xl text-pink-400">
                    <Layers size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Categories</h2>
            </div>

            <div className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none text-white text-sm"
                    placeholder="New Category..."
                />
                <button
                    onClick={handleAdd}
                    disabled={loading}
                    className="bg-pink-600 hover:bg-pink-500 text-white rounded-lg px-4 flex items-center justify-center transition-colors"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
                </button>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2 flex-1">
                {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group hover:border-pink-500/30 transition-colors">
                        {editingId === cat.id ? (
                            <div className="flex gap-2 items-center w-full">
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="bg-black/50 text-white px-2 py-1 rounded border border-pink-500/50 outline-none text-sm w-full"
                                />
                                <button onClick={saveEdit} className="text-green-400"><Check size={18} /></button>
                                <button onClick={() => setEditingId(null)} className="text-red-400"><X size={18} /></button>
                            </div>
                        ) : (
                            <>
                                <span className="text-gray-300 group-hover:text-white">{cat.name}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEdit(cat)} className="text-blue-400 hover:text-blue-300"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(cat.id)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
                {categories.length === 0 && <p className="text-gray-500 text-sm italic text-center py-4">No categories added.</p>}
            </div>
        </section>
    );
}
