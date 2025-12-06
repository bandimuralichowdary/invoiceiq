-- INVOICEIQ COMPLETE DATABASE SCHEMA
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Enable UUID Extension (usually enabled by default, but good to ensure)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Clean up existing tables if rebuilding (OPTIONAL - COMMENT OUT IF PRESERVING DATA)
-- DROP TABLE IF EXISTS invoice_items CASCADE;
-- DROP TABLE IF EXISTS invoices CASCADE;
-- DROP TABLE IF EXISTS coupons CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS categories CASCADE;
-- DROP TABLE IF EXISTS enterprises CASCADE;

-- 3. Enterprises Table
CREATE TABLE enterprises (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name text NOT NULL,
  email text, -- Added for easier admin lookup
  logo_url text, -- We store external URL strings here
  gst_number text,
  address text,
  approval_otp text, -- Stores the OTP for verification
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 4. Categories Table
CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id uuid REFERENCES enterprises(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 5. Products Table
CREATE TABLE products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id uuid REFERENCES enterprises(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  brand text,
  price numeric NOT NULL DEFAULT 0,
  stock_quantity int DEFAULT 0,
  gst_percentage numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 6. Coupons Table
CREATE TABLE coupons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id uuid REFERENCES enterprises(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  discount_value numeric NOT NULL,
  discount_type text CHECK (discount_type IN ('flat', 'percentage')) DEFAULT 'flat',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 7. Invoices Table
CREATE TABLE invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enterprise_id uuid REFERENCES enterprises(id) ON DELETE CASCADE NOT NULL,
  customer_name text,
  customer_mobile text,
  total_amount numeric NOT NULL,
  coupon_code text,
  invoice_number SERIAL, -- Global serial. For per-enterprise, logic is more complex. Global is fine for MVP.
  created_at timestamptz DEFAULT now()
);

-- 8. Invoice Items Table
CREATE TABLE invoice_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL, -- Keep record even if product deleted eventually, or Set Null
  product_name text NOT NULL, -- Snapshot of name
  quantity int NOT NULL,
  price numeric NOT NULL,
  gst numeric NOT NULL,
  total numeric NOT NULL
);

-- 9. Storage Buckets (Optional - if upgrading to file storage later)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT DO NOTHING;

-- 10. Row Level Security (RLS) Policies
ALTER TABLE enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Enterprise Policies
CREATE POLICY "Users can view own enterprise" ON enterprises FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own enterprise" ON enterprises FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own enterprise" ON enterprises FOR INSERT WITH CHECK (auth.uid() = id);

-- Category Policies
CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (enterprise_id = auth.uid());
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (enterprise_id = auth.uid());
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (enterprise_id = auth.uid());
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (enterprise_id = auth.uid());

-- Product Policies
CREATE POLICY "Users can view own products" ON products FOR SELECT USING (enterprise_id = auth.uid());
CREATE POLICY "Users can insert own products" ON products FOR INSERT WITH CHECK (enterprise_id = auth.uid());
CREATE POLICY "Users can update own products" ON products FOR UPDATE USING (enterprise_id = auth.uid());
CREATE POLICY "Users can delete own products" ON products FOR DELETE USING (enterprise_id = auth.uid());

-- Coupon Policies
CREATE POLICY "Users can view own coupons" ON coupons FOR SELECT USING (enterprise_id = auth.uid());
CREATE POLICY "Users can insert own coupons" ON coupons FOR INSERT WITH CHECK (enterprise_id = auth.uid());
CREATE POLICY "Users can update own coupons" ON coupons FOR UPDATE USING (enterprise_id = auth.uid());
CREATE POLICY "Users can delete own coupons" ON coupons FOR DELETE USING (enterprise_id = auth.uid());

-- Invoice Policies
CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (enterprise_id = auth.uid());
CREATE POLICY "Users can insert own invoices" ON invoices FOR INSERT WITH CHECK (enterprise_id = auth.uid());

-- Invoice Item Policies
-- Note: Subqueries in RLS can be expensive, but safe for MVP scale.
CREATE POLICY "Users can view own invoice items" ON invoice_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM invoices WHERE id = invoice_items.invoice_id AND enterprise_id = auth.uid())
);
CREATE POLICY "Users can insert own invoice items" ON invoice_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM invoices WHERE id = invoice_items.invoice_id AND enterprise_id = auth.uid())
);
