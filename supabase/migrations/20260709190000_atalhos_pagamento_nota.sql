alter table public.lancamentos
  add column possui_nota boolean not null default true,
  add column forma_pagamento text check (forma_pagamento in ('pix','boleto','transferência','dinheiro','cartão'));

create table public.atalhos_lancamento (
  id uuid primary key default gen_random_uuid(),
  emoji text,
  label text not null,
  categoria text not null check (categoria in ('material','mao_obra','equipamento')),
  descricao text not null,
  unidade text,
  created_at timestamptz default now()
);
grant select, insert, update, delete on public.atalhos_lancamento to anon, authenticated;
grant all on public.atalhos_lancamento to service_role;
alter table public.atalhos_lancamento enable row level security;
create policy "acesso_app_interno" on public.atalhos_lancamento for all to anon, authenticated using (true) with check (true);

insert into public.atalhos_lancamento (emoji, label, categoria, descricao, unidade) values
  ('🚜', 'Retroescavadeira', 'equipamento', 'Locação retroescavadeira', 'diária'),
  ('🏗️', 'Munck', 'equipamento', 'Serviço de munck', 'un'),
  ('🌀', 'Betoneira', 'equipamento', 'Locação betoneira', 'diária'),
  ('🪣', 'Caçamba', 'equipamento', 'Caçamba de entulho', 'un'),
  ('🚚', 'Guincho', 'equipamento', 'Serviço de guincho', 'un'),
  ('👷', 'Diária pedreiro', 'mao_obra', 'Diária pedreiro', 'diária'),
  ('🧑‍🔧', 'Diária servente', 'mao_obra', 'Diária servente', 'diária'),
  ('🛻', 'Caminhão pipa', 'equipamento', 'Água - caminhão pipa', 'un');
