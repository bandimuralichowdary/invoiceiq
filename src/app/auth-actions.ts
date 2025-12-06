'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import nodemailer from 'nodemailer';

// SMTP Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

/**
 * Sends a Forgot Password OTP to the user's email.
 * Uses Admin API to look up user by email first, ensuring robustness even if 'enterprises' email column is empty.
 */
export async function sendForgotPasswordOtp(email: string) {
    const supabase = createAdminClient();

    // 1. Find User by Email from Auth Schema (Source of Truth)
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error("Auth Admin Error:", authError);
        return { success: false, error: 'Authorization Error' };
    }

    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
        return { success: false, error: 'User not found' };
    }

    // 2. Check Enterprise Profile by User ID
    const { data: userRecord, error: findError } = await supabase
        .from('enterprises')
        .select('id, name')
        .eq('id', user.id)
        .single();

    if (findError || !userRecord) {
        return { success: false, error: 'Enterprise profile not found' };
    }

    // 3. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // 4. Save OTP to DB
    const { error: updateError } = await supabase
        .from('enterprises')
        .update({
            reset_otp: otp,
            reset_otp_expiry: expiry.toISOString()
        })
        .eq('id', userRecord.id);

    if (updateError) {
        console.error("DB OTP Error:", updateError);
        // Expose the specific DB error to help debug (likely "column does not exist")
        return { success: false, error: 'System error: ' + updateError.message };
    }

    // 5. Send Email
    try {
        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Reset Your Password - InvoiceIQ',
            html: `
                <h1>Password Reset Request</h1>
                <p>Hello ${userRecord.name},</p>
                <p>You requested to reset your password. Use the code below:</p>
                <h2 style="color: #6366f1; letter-spacing: 5px;">${otp}</h2>
                <p>This code expires in 10 minutes.</p>
                <p>If you didn't request this, ignore this email.</p>
            `,
        });
        return { success: true };
    } catch (emailError: any) {
        console.error("SMTP Error:", emailError);
        return { success: false, error: 'Failed to send email. Check SMTP config.' };
    }
}

/**
 * Verifies OTP only (used in enterotp page)
 */
export async function verifyForgotPasswordOtp(email: string, otp: string) {
    const supabase = createAdminClient();

    // 1. Find User
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) return { success: false, error: 'User not found' };

    // 2. Check OTP in Enterprise Profile
    const { data: userRecord } = await supabase
        .from('enterprises')
        .select('reset_otp, reset_otp_expiry')
        .eq('id', user.id)
        .single();

    if (!userRecord) return { success: false, error: 'User not found' };

    // 3. Validate
    if (userRecord.reset_otp !== otp) {
        return { success: false, error: 'Invalid OTP' };
    }

    const now = new Date();
    const expiry = new Date(userRecord.reset_otp_expiry);

    if (now > expiry) {
        return { success: false, error: 'OTP Expired' };
    }

    return { success: true };
}

/**
 * Verifies OTP and Resets Password (used in resetpassword page)
 */
export async function verifyOtpAndResetPassword(email: string, otp: string, newPassword: string) {
    const supabase = createAdminClient();

    // 1. Find User
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) return { success: false, error: 'User not found' };

    // 2. Check OTP
    const { data: userRecord } = await supabase
        .from('enterprises')
        .select('id, reset_otp, reset_otp_expiry')
        .eq('id', user.id)
        .single();

    if (!userRecord) return { success: false, error: 'User not found' };

    if (userRecord.reset_otp !== otp) {
        return { success: false, error: 'Invalid OTP' };
    }

    const now = new Date();
    const expiry = new Date(userRecord.reset_otp_expiry);

    if (now > expiry) {
        return { success: false, error: 'OTP Expired' };
    }

    // 3. Update Auth Password (Admin Action)
    const { error: authError } = await supabase.auth.admin.updateUserById(
        userRecord.id, // This is the Auth ID
        { password: newPassword }
    );

    if (authError) {
        return { success: false, error: authError.message };
    }

    // 4. Clear OTP
    await supabase.from('enterprises').update({ reset_otp: null, reset_otp_expiry: null }).eq('id', userRecord.id);

    return { success: true };
}
