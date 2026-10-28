-- =====================================================================
-- PASO 2: catálogo (marcas, categorías, productos, variantes, imágenes)
-- Ejecutar UNA sola vez en Supabase > SQL Editor > New query > Run
-- =====================================================================

-- ---------- Tablas ----------
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  brand_id uuid not null references public.brands(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  color text,
  sku text,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists products_brand_idx on public.products(brand_id);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists variants_product_idx on public.product_variants(product_id);
create index if not exists images_product_idx on public.product_images(product_id);

-- ---------- Administradores ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------- Permisos base ----------
revoke all on public.admins from anon, authenticated;
revoke all on public.brands, public.categories, public.products,
              public.product_variants, public.product_images from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.brands, public.categories, public.products,
                public.product_variants, public.product_images to anon;
grant select, insert, update, delete
  on public.brands, public.categories, public.products,
     public.product_variants, public.product_images to authenticated;

-- ---------- RLS ----------
alter table public.admins enable row level security;           -- sin políticas: nadie la toca por la API
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;

-- Lectura pública: solo lo publicado
create policy "publico lee marcas" on public.brands
  for select to anon, authenticated using (published);
create policy "publico lee categorias" on public.categories
  for select to anon, authenticated using (published);
create policy "publico lee productos" on public.products
  for select to anon, authenticated using (published);
create policy "publico lee variantes" on public.product_variants
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.published));
create policy "publico lee imagenes" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.published));

-- Administrador: todo
create policy "admin todo marcas" on public.brands
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo categorias" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo productos" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo variantes" on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin todo imagenes" on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Almacenamiento de fotos ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "fotos: lectura publica" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');
create policy "fotos: admin sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "fotos: admin edita" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "fotos: admin borra" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- ---------- IMPORTANTE: registrar a tu administrador ----------
-- Cambia el correo por el del usuario que creaste en Authentication > Users
insert into public.admins (user_id)
select id from auth.users where email = 'numa@oldranch.com'
on conflict do nothing;
