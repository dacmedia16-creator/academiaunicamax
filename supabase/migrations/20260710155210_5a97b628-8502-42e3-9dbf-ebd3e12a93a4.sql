
-- =========================
-- ENUMS
-- =========================
create type public.app_role as enum ('admin', 'student');
create type public.video_provider as enum ('youtube', 'vimeo', 'url');

-- =========================
-- PROFILES
-- =========================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- =========================
-- USER ROLES
-- =========================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Profiles policies
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

-- User roles policies (users can SEE own roles, only admins manage)
create policy "user_roles_select_own_or_admin" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_manage" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =========================
-- COURSES
-- =========================
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_url text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.courses to authenticated;
grant all on public.courses to service_role;
alter table public.courses enable row level security;

create policy "courses_select_published_or_admin" on public.courses
  for select to authenticated
  using (is_published or public.has_role(auth.uid(), 'admin'));
create policy "courses_admin_all" on public.courses
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =========================
-- MODULES
-- =========================
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.modules to authenticated;
grant all on public.modules to service_role;
alter table public.modules enable row level security;

create policy "modules_select_if_course_visible" on public.modules
  for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or exists (
      select 1 from public.courses c where c.id = course_id and c.is_published
    )
  );
create policy "modules_admin_all" on public.modules
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =========================
-- LESSONS
-- =========================
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text,
  video_provider public.video_provider not null default 'youtube',
  video_ref text not null default '',
  duration_seconds integer not null default 0,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.lessons to authenticated;
grant all on public.lessons to service_role;
alter table public.lessons enable row level security;

create policy "lessons_select_if_visible" on public.lessons
  for select to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or (
      is_published and exists (
        select 1 from public.modules m
        join public.courses c on c.id = m.course_id
        where m.id = module_id and c.is_published
      )
    )
  );
create policy "lessons_admin_all" on public.lessons
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index lessons_module_idx on public.lessons(module_id, sort_order);
create index modules_course_idx on public.modules(course_id, sort_order);

-- =========================
-- LESSON PROGRESS
-- =========================
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  percent numeric(5,2) not null default 0,
  position_seconds integer not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  last_watched_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);
grant select, insert, update, delete on public.lesson_progress to authenticated;
grant all on public.lesson_progress to service_role;
alter table public.lesson_progress enable row level security;

create policy "progress_select_own_or_admin" on public.lesson_progress
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "progress_insert_own" on public.lesson_progress
  for insert to authenticated
  with check (user_id = auth.uid());
create policy "progress_update_own" on public.lesson_progress
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progress_delete_own_or_admin" on public.lesson_progress
  for delete to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- =========================
-- SIGNUP TRIGGER: create profile + student role
-- =========================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'student')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================
-- UNLOCK FUNCTION
-- Returns TRUE when the given lesson is unlocked for the given user.
-- A lesson is unlocked iff it is the first published lesson of the course
-- (order by module.sort_order, then lesson.sort_order) OR the previous
-- published lesson is completed by the user.
-- =========================
create or replace function public.is_lesson_unlocked(_user_id uuid, _lesson_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _course_id uuid;
  _ordered_ids uuid[];
  _idx int;
  _prev_id uuid;
  _prev_completed boolean;
begin
  select c.id into _course_id
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where l.id = _lesson_id;

  if _course_id is null then
    return false;
  end if;

  select array_agg(l.id order by m.sort_order, l.sort_order, l.created_at)
  into _ordered_ids
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.course_id = _course_id
    and l.is_published = true;

  if _ordered_ids is null or array_length(_ordered_ids, 1) is null then
    return false;
  end if;

  _idx := array_position(_ordered_ids, _lesson_id);
  if _idx is null then
    return false;
  end if;

  if _idx = 1 then
    return true;
  end if;

  _prev_id := _ordered_ids[_idx - 1];
  select coalesce(lp.completed, false) into _prev_completed
  from public.lesson_progress lp
  where lp.user_id = _user_id and lp.lesson_id = _prev_id;

  return coalesce(_prev_completed, false);
end;
$$;

-- =========================
-- UPSERT PROGRESS RPC
-- Validates unlock server-side. Marks completed at >=90%.
-- =========================
create or replace function public.upsert_lesson_progress(
  _lesson_id uuid,
  _percent numeric,
  _position_seconds integer
)
returns public.lesson_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _row public.lesson_progress;
  _is_complete boolean;
  _clamped_pct numeric;
begin
  if _uid is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_lesson_unlocked(_uid, _lesson_id) then
    raise exception 'lesson locked';
  end if;

  _clamped_pct := greatest(0, least(100, coalesce(_percent, 0)));
  _is_complete := _clamped_pct >= 90;

  insert into public.lesson_progress as lp
    (user_id, lesson_id, percent, position_seconds, completed, completed_at, last_watched_at)
  values (
    _uid, _lesson_id, _clamped_pct, greatest(0, coalesce(_position_seconds, 0)),
    _is_complete,
    case when _is_complete then now() else null end,
    now()
  )
  on conflict (user_id, lesson_id) do update set
    percent = greatest(lp.percent, excluded.percent),
    position_seconds = greatest(lp.position_seconds, excluded.position_seconds),
    completed = lp.completed or excluded.completed,
    completed_at = coalesce(lp.completed_at, case when (lp.completed or excluded.completed) then now() else null end),
    last_watched_at = now()
  returning * into _row;

  return _row;
end;
$$;

grant execute on function public.is_lesson_unlocked(uuid, uuid) to authenticated;
grant execute on function public.upsert_lesson_progress(uuid, numeric, integer) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- =========================
-- SEED DATA: 6 cursos com módulos e aulas
-- =========================
do $seed$
declare
  c_intro uuid; c_atend uuid; c_capt uuid; c_neg uuid; c_etica uuid; c_mkt uuid;
  m uuid;
begin
  insert into public.courses (title, description, is_published, sort_order) values
    ('Introdução ao Mercado Imobiliário', 'Fundamentos, panorama do setor e o papel do corretor.', true, 1) returning id into c_intro;
  insert into public.courses (title, description, is_published, sort_order) values
    ('Atendimento e Relacionamento com Clientes', 'Como criar experiências memoráveis e fidelizar clientes.', true, 2) returning id into c_atend;
  insert into public.courses (title, description, is_published, sort_order) values
    ('Captação de Imóveis', 'Estratégias para prospectar e captar imóveis de qualidade.', true, 3) returning id into c_capt;
  insert into public.courses (title, description, is_published, sort_order) values
    ('Técnicas de Negociação', 'Fechamento, contorno de objeções e psicologia da venda.', true, 4) returning id into c_neg;
  insert into public.courses (title, description, is_published, sort_order) values
    ('Ética e Boas Práticas', 'Conduta profissional, CRECI e legislação aplicada.', true, 5) returning id into c_etica;
  insert into public.courses (title, description, is_published, sort_order) values
    ('Marketing Imobiliário', 'Marca pessoal, redes sociais e anúncios que vendem.', true, 6) returning id into c_mkt;

  -- Helper pattern: create module + 3 lessons per module
  -- Curso Intro
  insert into public.modules (course_id, title, sort_order) values (c_intro, 'Panorama do Setor', 1) returning id into m;
  insert into public.lessons (module_id, title, description, video_provider, video_ref, duration_seconds, sort_order) values
    (m, 'Boas-vindas e visão geral', 'Introdução ao curso.', 'youtube', 'dQw4w9WgXcQ', 180, 1),
    (m, 'Como o mercado se organiza', 'Agentes, produtos e regulação.', 'youtube', 'aqz-KE-bpKQ', 300, 2),
    (m, 'O papel do corretor', 'Responsabilidades e oportunidades.', 'youtube', 'ScMzIvxBSi4', 240, 3);
  insert into public.modules (course_id, title, sort_order) values (c_intro, 'Perfil do Profissional', 2) returning id into m;
  insert into public.lessons (module_id, title, description, video_provider, video_ref, duration_seconds, sort_order) values
    (m, 'Habilidades essenciais', 'O que separa os melhores.', 'youtube', 'M7lc1UVf-VE', 260, 1),
    (m, 'Planejamento de carreira', 'Metas e desenvolvimento contínuo.', 'youtube', 'jNQXAC9IVRw', 220, 2);

  -- Atendimento
  insert into public.modules (course_id, title, sort_order) values (c_atend, 'Fundamentos do Atendimento', 1) returning id into m;
  insert into public.lessons (module_id, title, description, video_provider, video_ref, duration_seconds, sort_order) values
    (m, 'Escuta ativa', 'Ouvir para entender.', 'youtube', 'ScMzIvxBSi4', 210, 1),
    (m, 'Perfil do cliente', 'Segmentação prática.', 'youtube', 'dQw4w9WgXcQ', 240, 2),
    (m, 'Primeiro contato', 'Como abrir bem uma conversa.', 'youtube', 'aqz-KE-bpKQ', 200, 3);
  insert into public.modules (course_id, title, sort_order) values (c_atend, 'Fidelização', 2) returning id into m;
  insert into public.lessons (module_id, title, description, video_provider, video_ref, duration_seconds, sort_order) values
    (m, 'Pós-venda que encanta', 'Transforme clientes em fãs.', 'youtube', 'M7lc1UVf-VE', 260, 1),
    (m, 'Indicações e referências', 'Como pedir da forma certa.', 'youtube', 'jNQXAC9IVRw', 230, 2);

  -- Captação
  insert into public.modules (course_id, title, sort_order) values (c_capt, 'Prospecção Ativa', 1) returning id into m;
  insert into public.lessons (module_id, title, description, video_provider, video_ref, duration_seconds, sort_order) values
    (m, 'Onde encontrar imóveis', 'Fontes e canais.', 'youtube', 'dQw4w9WgXcQ', 260, 1),
    (m, 'Abordagem ao proprietário', 'Roteiro que funciona.', 'youtube', 'aqz-KE-bpKQ', 240, 2),
    (m, 'Análise de exclusividade', 'Por que vale a pena.', 'youtube', 'ScMzIvxBSi4', 220, 3);

  -- Negociação
  insert into public.modules (course_id, title, sort_order) values (c_neg, 'Contorno de Objeções', 1) returning id into m;
  insert into public.lessons (module_id, title, description, video_provider, video_ref, duration_seconds, sort_order) values
    (m, 'As 5 objeções mais comuns', 'Como responder com segurança.', 'youtube', 'M7lc1UVf-VE', 260, 1),
    (m, 'Ancoragem de preço', 'Como conduzir o valor.', 'youtube', 'jNQXAC9IVRw', 240, 2),
    (m, 'Fechamento consultivo', 'Sem forçar a barra.', 'youtube', 'dQw4w9WgXcQ', 300, 3);

  -- Ética
  insert into public.modules (course_id, title, sort_order) values (c_etica, 'Conduta Profissional', 1) returning id into m;
  insert into public.lessons (module_id, title, description, video_provider, video_ref, duration_seconds, sort_order) values
    (m, 'Código de ética do CRECI', 'Pontos essenciais.', 'youtube', 'aqz-KE-bpKQ', 240, 1),
    (m, 'Conflitos de interesse', 'Como identificar e evitar.', 'youtube', 'ScMzIvxBSi4', 220, 2);

  -- Marketing
  insert into public.modules (course_id, title, sort_order) values (c_mkt, 'Marca Pessoal', 1) returning id into m;
  insert into public.lessons (module_id, title, description, video_provider, video_ref, duration_seconds, sort_order) values
    (m, 'Posicionamento de marca', 'Como se diferenciar.', 'youtube', 'M7lc1UVf-VE', 260, 1),
    (m, 'Conteúdo no Instagram', 'O que postar toda semana.', 'youtube', 'jNQXAC9IVRw', 240, 2),
    (m, 'Anúncios que convertem', 'Meta e Google Ads básico.', 'youtube', 'dQw4w9WgXcQ', 300, 3);
end
$seed$;
