-- RUN THIS IN SUPABASE SQL EDITOR

-- Add columns for custom OTP reset flow
ALTER TABLE enterprises ADD COLUMN IF NOT EXISTS reset_otp text;
ALTER TABLE enterprises ADD COLUMN IF NOT EXISTS reset_otp_expiry timestamptz;
