'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { verifyForgotPasswordOtp } from '@/app/auth-actions';

function EnterOtpContent() {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const type = searchParams.get('type') || 'register'; // register | recovery
    const email = searchParams.get('email'); // Needed for recovery verification if not in session, but usually VerifyOtp with type='recovery' needs email + token

    const supabase = createClient();

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (type === 'register') {
                // Verify against 'enterprises' table approval_otp
                // Note: User must be authenticated (session exists) for this to work based on my Login/Register flow,
                // OR I need to look up by something else if they aren't logged in. 
                // My Register page logs them in (signUp does that).

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('No user session found. Please login.');

                const { data: enterprise } = await supabase
                    .from('enterprises')
                    .select('approval_otp')
                    .eq('id', user.id)
                    .single();

                if (!enterprise) throw new Error('Enterprise not found');

                if (enterprise.approval_otp !== otp) {
                    throw new Error('Invalid OTP');
                }

                // OTP Matches -> Approve
                const { error: updateError } = await supabase
                    .from('enterprises')
                    .update({ is_approved: true, approval_otp: null }) // Clear OTP after use
                    .eq('id', user.id);

                if (updateError) throw updateError;

                router.push('/select');

            } else if (type === 'recovery') {
                if (!email) throw new Error("Email is missing for recovery.");

                // Validate the OTP against DB (ReadOnly)
                const result = await verifyForgotPasswordOtp(email, otp);

                if (!result.success) {
                    throw new Error(result.error);
                }

                // If successful, pass checks to reset password page
                // We pass OTP too so we can verify again in the final step securely
                router.push(`/resetpassword?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`);
            }

        } catch (err: any) {
            setError(err.message || 'Validation failed');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
            <main className="w-full max-w-md p-8 glass-card rounded-2xl relative z-10 mx-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Enter OTP</h1>
                    <p className="text-gray-400">
                        {type === 'register'
                            ? 'Enter the code provided by the Admin'
                            : 'Enter the code sent to your email'}
                    </p>
                </div>

                {error && (
                    <div className="p-4 mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleVerify} className="space-y-6">
                    <div>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                            className="w-full px-4 py-4 text-center text-2xl tracking-widest bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-white placeholder-gray-600"
                            placeholder="1234"
                            maxLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify Code'}
                    </button>
                </form>
            </main>
        </div>
    );
}

export default function EnterOtpPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
            <EnterOtpContent />
        </Suspense>
    )
}
