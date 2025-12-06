-- RUN THIS IN SUPABASE SQL EDITOR TO UPDATE YOUR SCHEMA

-- 1. Add min_order_amount column to coupons table
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_order_amount numeric DEFAULT 0;

-- 2. (Optional) Check existing RLS policies if needed, but adding a column usually doesn't require policy changes if "select *" is used.
