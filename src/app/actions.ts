'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAdminOtp(otp: string, companyName: string, userEmail: string) {
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
        console.warn("⚠️ ADMIN_EMAIL is not set in .env.local. OTP was:", otp);
        return { success: false, error: 'Admin email not configured' };
    }

    if (!process.env.RESEND_API_KEY) {
        console.warn("⚠️ RESEND_API_KEY is not set. OTP was:", otp);
        return { success: false, error: 'Email service not configured' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'InvoiceIQ <onboarding@resend.dev>', // Default Resend testing domain
            to: [adminEmail],
            subject: `Action Required: New Enterprise Registration (${companyName})`,
            html: `
        <h1>New Enterprise Registration</h1>
        <p><strong>Company:</strong> ${companyName}</p>
        <p><strong>Registrant Email:</strong> ${userEmail}</p>
        <p>A new enterprise has requested access. Please verify them with the following OTP:</p>
        <h2 style="color: #6366f1; font-size: 32px; letter-spacing: 5px;">${otp}</h2>
        <p>Share this OTP with the user to verify their account.</p>
      `,
        });

        if (error) {
            console.error("Resend Error:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        console.error("Email Send Failed:", err);
        return { success: false, error: err.message };
    }
}
