'use client';

import Link from 'next/link';

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            <main className="w-full max-w-md p-8 glass-card rounded-2xl relative z-10 mx-4 text-center">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Join InvoiceIQ</h1>
                    <p className="text-gray-400">Enterprise Access</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
                    <p className="text-gray-300 mb-4">
                        Account creation is currently by invitation only.
                    </p>
                    <p className="text-sm text-gray-400 mb-2">To request access, please contact the administrator:</p>

                    <a
                        href="mailto:muralibandi2004@gmail.com?subject=InvoicIQ Access Request"
                        className="text-pink-400 font-bold hover:text-pink-300 transition-colors block text-lg"
                    >
                        muralibandi2004@gmail.com
                    </a>
                </div>

                <div className="mt-6">
                    <Link href="/login" className="text-gray-400 hover:text-white transition-colors text-sm">
                        Return to <span className="text-pink-400">Login</span>
                    </Link>
                </div>
            </main>
        </div>
    );
}
