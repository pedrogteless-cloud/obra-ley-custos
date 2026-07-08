
create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  categoria text not null check (categoria in ('material','mao_obra','equipamento')),
  subcategoria text,
  descricao text not null,
  fornecedor text,
  valor numeric(12,2) not null,
  quantidade numeric(10,2),
  unidade text,
  data date not null default current_date,
  responsavel text not null,
  comprovante_url text,
  observacao text,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.lancamentos to anon, authenticated;
grant all on public.lancamentos to service_role;
alter table public.lancamentos enable row level security;
create policy "acesso_app_interno" on public.lancamentos for all to anon, authenticated using (true) with check (true);

create table public.parcelas (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null references public.lancamentos(id) on delete cascade,
  numero int not null,
  valor numeric(12,2) not null,
  vencimento date not null,
  pago boolean default false,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.parcelas to anon, authenticated;
grant all on public.parcelas to service_role;
alter table public.parcelas enable row level security;
create policy "acesso_app_interno" on public.parcelas for all to anon, authenticated using (true) with check (true);

create table public.ordens_pagamento (
  id uuid primary key default gen_random_uuid(),
  parcela_id uuid not null references public.parcelas(id) on delete cascade,
  data_pagamento date not null,
  valor numeric(12,2) not null,
  fornecedor text,
  forma_pagamento text,
  status text not null default 'pendente' check (status in ('pendente','aprovada','paga')),
  aprovado_por text,
  observacao text,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.ordens_pagamento to anon, authenticated;
grant all on public.ordens_pagamento to service_role;
alter table public.ordens_pagamento enable row level security;
create policy "acesso_app_interno" on public.ordens_pagamento for all to anon, authenticated using (true) with check (true);

create index on public.parcelas(lancamento_id);
create index on public.parcelas(vencimento);
create index on public.ordens_pagamento(parcela_id);
create index on public.ordens_pagamento(status);
