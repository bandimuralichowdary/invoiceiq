'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAsGuest() {
    const cookieStore = await cookies();
    cookieStore.set('guest-mode', 'true', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600 // 1 hour session
    });
    redirect('/select');
}

export async function logoutGuest() {
    const cookieStore = await cookies();
    cookieStore.delete('guest-mode');
    redirect('/login');
}
