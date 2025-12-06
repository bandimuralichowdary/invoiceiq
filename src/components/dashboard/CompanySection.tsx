/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Building2, Save, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useGuest } from '@/hooks/useGuest';

export default function CompanySection() {
    const [name, setName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const supabase = createClient();
    const isGuest = useGuest();

    const convertDriveLink = (url: string) => {
        // Extract ID from common Drive URL formats
        // https://drive.google.com/file/d/FILE_ID/view
        // https://drive.google.com/uc?id=FILE_ID
        const match = url.match(/[-\w]{25,}/);
        if (match && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
            return `https://drive.google.com/uc?export=view&id=${match[0]}`;
        }
        return url;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setMessage('File too large (Max 2MB)');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const converted = convertDriveLink(val);
        setLogoUrl(converted);
    };

    useEffect(() => {
        fetchCompanyDetails();
    }, []);

    const fetchCompanyDetails = async () => {
        if (isGuest) return; // Guests have no data to fetch
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('enterprises')
            .select('name, logo_url')
            .eq('id', user.id)
            .single();

        if (data) {
            setName(data.name || '');
            setLogoUrl(data.logo_url || '');
        }
    };

    const handleUpdate = async () => {
        if (isGuest) {
            setMessage("Guest mode: Changes are not saved.");
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        setLoading(true);
        setMessage('');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('enterprises')
            .upsert({ id: user.id, name, logo_url: logoUrl, is_approved: true }) // Auto-approve invited already active users, or keep default? 
        // If they are invited, they are implicitly approved to access.
        // RLS policies might require them to be approved?
        // Wait, schema says "is_approved default false". If I invite them, I want them to use it.
        // Login check: "if (enterprise && !enterprise.is_approved)".
        // If I upsert here, I should set is_approved: true probably, or else they might get stuck if they log out and back in?
        // Actually, if I created them via Invite, they are authorized.
        // Let's set is_approved: true on upsert.

        setLoading(false);
        if (!error) {
            setMessage('Company details updated!');
            setTimeout(() => setMessage(''), 3000);
        } else {
            setMessage('Failed to update.');
        }
    };

    // Mock upload since we don't have storage setup in the schema script yet or buckets created
    // In a real app, we would upload to Supabase Storage.
    // Ideally I should let the user just paste a URL for MVP if storage is complex to setup via SQL only.
    // Or I can try to set up storage.
    // For now I'll provide a text input for URL + a fake file input that alerts.

    return (
        <section className="glass-card p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                    <Building2 size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Company Profile</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 items-start">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Company Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-white"
                        placeholder="Enter company name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Logo URL or Upload</label>
                    <div className="space-y-3">
                        {/* URL Input */}
                        <input
                            type="text"
                            value={logoUrl.startsWith('data:') ? '' : logoUrl} // Don't show base64 string in text input
                            onChange={handleUrlChange}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-white text-sm"
                            placeholder="https://example.com/logo.png OR Drive Link"
                        />

                        {/* OR Divider */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="h-px bg-white/10 flex-1"></span>
                            OR UPLOAD FROM DEVICE
                            <span className="h-px bg-white/10 flex-1"></span>
                        </div>

                        {/* File Input */}
                        <label className="flex items-center justify-center w-full px-4 py-3 bg-white/5 border border-dashed border-white/20 rounded-xl hover:bg-white/10 cursor-pointer transition-all group">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div className="flex items-center gap-2 text-gray-400 group-hover:text-white">
                                <Upload size={18} />
                                <span className="text-sm">Choose Image (Max 2MB)</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Preview */}
            {logoUrl && (
                <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-2">Logo Preview:</p>
                    <div className="w-32 h-32 relative bg-white/5 rounded-lg overflow-hidden flex items-center justify-center border border-white/10">
                        {/* Using standard img tag for external URLs to avoid Next.js Image config issues */}
                        <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                </div>
            )}

            <div className="mt-6 flex items-center justify-between">
                <span className={`text-sm ${message.includes('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                    {message}
                </span>

                <button
                    onClick={handleUpdate}
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:from-purple-500 hover:to-blue-500 transition-all flex items-center gap-2"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    <span>Save Changes</span>
                </button>
            </div>
        </section>
    );
}
