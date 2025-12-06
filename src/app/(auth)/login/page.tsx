'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2, UserCircle } from 'lucide-react';
import { loginAsGuest } from '@/app/guest-actions';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;

            // Check for enterprise approval status
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: enterprise, error: entError } = await supabase
                    .from('enterprises')
                    .select('is_approved')
                    .eq('id', user.id)
                    .single();

                if (entError) {
                    // If no enterprise found, maybe they are just registered but creation failed?
                    // Or they are super admin? Assuming standard flow.
                    console.error("Enterprise check failed", entError);
                }

                if (enterprise && !enterprise.is_approved) {
                    // Redirect to OTP page if not approved
                    router.push('/enter-otp');
                } else {
                    router.push('/select');
                }
            }

        } catch (err: any) {
            setError(err.message || 'Failed to login');
            setLoading(false); // Only stop loading on error, otherwise we redirect
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

            <main className="w-full max-w-md p-8 glass-card rounded-2xl relative z-10 mx-4">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
                        InvoiceIQ
                    </h1>
                    <p className="text-gray-400">Enterprise Login</p>
                </div>

                {error && (
                    <div className="p-4 mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white placeholder-gray-500 transition-all"
                            placeholder="admin@enterprise.com"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-300">Password</label>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-white placeholder-gray-500 transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-purple-900/20"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6">
                    <button
                        onClick={() => loginAsGuest()}
                        className="w-full py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <UserCircle size={20} />
                        <span>Continue as Guest</span>
                    </button>
                </div>

                <div className="mt-8 flex flex-col gap-3 text-center">
                    <Link
                        href="/register"
                        className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        Don't have an account? <span className="text-purple-400">Register Enterprise</span>
                    </Link>
                    <Link
                        href="/forgot-password"
                        className="text-sm text-gray-500 hover:text-purple-400 transition-colors"
                    >
                        Forgot Password?
                    </Link>
                </div>
            </main>
        </div>
    );
}
