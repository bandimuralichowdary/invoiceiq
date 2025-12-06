-- Create tables for InvoiceIQ

-- 1. Enterprises (Linked to Auth Users)
create table enterprises (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  logo_url text,
  gst_number text,
  address text,
  approval_otp text, -- Stores the OTP for verification
  is_approved boolean default false,
  created_at timestamptz default now()
);

-- 2. Categories
create table categories (
  id uuid default gen_random_uuid() primary key,
  enterprise_id uuid references enterprises(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- 3. Products
create table products (
  id uuid default gen_random_uuid() primary key,
  enterprise_id uuid references enterprises(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade,
  name text not null,
  brand text,
  price numeric not null, -- Selling price
  stock_quantity int default 0,
  gst_percentage numeric default 0,
  created_at timestamptz default now()
);

-- 4. Coupons
create table coupons (
  id uuid default gen_random_uuid() primary key,
  enterprise_id uuid references enterprises(id) on delete cascade not null,
  code text not null,
  discount_value numeric not null, -- Can be flat amount
  discount_type text check (discount_type in ('flat', 'percentage')) default 'flat',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 5. Invoices
create table invoices (
  id uuid default gen_random_uuid() primary key,
  enterprise_id uuid references enterprises(id) on delete cascade not null,
  customer_name text,
  customer_mobile text,
  total_amount numeric not null,
  payment_mode text,
  pdf_url text, -- Link to stored PDF if uploaded, or just metadata
  coupon_code text,
  created_at timestamptz default now(),
  invoice_number serial -- Auto-incrementing invoice number (scoped globally? Better to scope by enterprise or just serial)
);

-- 6. Invoice Items
create table invoice_items (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid references invoices(id) on delete cascade not null,
  product_id uuid references products(id) on delete set null,
  product_name text not null, -- Snapshot in case product is deleted
  quantity int not null,
  price numeric not null,
  gst numeric not null,
  total numeric not null
);

-- RLS Policies
alter table enterprises enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table coupons enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;

-- Policies for Enterprises: Users can only see/edit their own enterprise
create policy "Users can view own enterprise" on enterprises
  for select using (auth.uid() = id);

create policy "Users can update own enterprise" on enterprises
  for update using (auth.uid() = id);

create policy "Users can insert own enterprise" on enterprises
  for insert with check (auth.uid() = id);

-- Helper policy for child tables
-- (Assuming auth.uid() matches enterprise_id)

create policy "Users can view own categories" on categories for select using (enterprise_id = auth.uid());
create policy "Users can insert own categories" on categories for insert with check (enterprise_id = auth.uid());
create policy "Users can update own categories" on categories for update using (enterprise_id = auth.uid());
create policy "Users can delete own categories" on categories for delete using (enterprise_id = auth.uid());

create policy "Users can view own products" on products for select using (enterprise_id = auth.uid());
create policy "Users can insert own products" on products for insert with check (enterprise_id = auth.uid());
create policy "Users can update own products" on products for update using (enterprise_id = auth.uid());
create policy "Users can delete own products" on products for delete using (enterprise_id = auth.uid());

create policy "Users can view own coupons" on coupons for select using (enterprise_id = auth.uid());
create policy "Users can insert own coupons" on coupons for insert with check (enterprise_id = auth.uid());
create policy "Users can update own coupons" on coupons for update using (enterprise_id = auth.uid());
create policy "Users can delete own coupons" on coupons for delete using (enterprise_id = auth.uid());

create policy "Users can view own invoices" on invoices for select using (enterprise_id = auth.uid());
create policy "Users can insert own invoices" on invoices for insert with check (enterprise_id = auth.uid());

create policy "Users can view own invoice items" on invoice_items for select using (
  exists (select 1 from invoices where id = invoice_items.invoice_id and enterprise_id = auth.uid())
);
create policy "Users can insert own invoice items" on invoice_items for insert with check (
  exists (select 1 from invoices where id = invoice_items.invoice_id and enterprise_id = auth.uid())
);

-- Storage buckets setup (conceptual)
-- insert into storage.buckets (id, name) values ('logos', 'logos'), ('invoices', 'invoices');
-- create policy "Logo Access" on storage.objects for select using ( bucket_id = 'logos' );
-- create policy "Logo Upload" on storage.objects for insert with check ( bucket_id = 'logos' and auth.uid()::text = (storage.foldername(name))[1] );
