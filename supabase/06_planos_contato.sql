-- =====================================================================
-- PASTA DA PROVA — ETAPA 8: planos pagos (contato por WhatsApp)
--
-- Como usar: SQL Editor > New query > cole TODO este arquivo > Run.
-- ✅ Este arquivo NÃO apaga nada. Pode rodar de novo sem problema.
--
-- Guarda o número de WhatsApp para onde vão os pedidos de plano.
-- Você preenche o número pelo painel /admin (não precisa mexer aqui).
-- =====================================================================

alter table public.app_config add column if not exists whatsapp_contato text;

-- Qualquer pessoa logada pode ver o número (é o contato de vendas)
create or replace function public.contato_vendas()
returns text language sql stable security definer set search_path = ''
as $$
  select whatsapp_contato from public.app_config where id = 1;
$$;

-- Só o admin do app altera o número
create or replace function public.admin_definir_contato(p_whatsapp text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  digitos text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
begin
  if not public.eh_admin_app() then
    raise exception 'Acesso restrito ao administrador.';
  end if;
  if digitos = '' then
    update public.app_config set whatsapp_contato = null where id = 1;
    return;
  end if;
  -- aceita "(11) 91234-5678": coloca o 55 do Brasil se faltar
  if length(digitos) in (10, 11) then
    digitos := '55' || digitos;
  end if;
  if length(digitos) not between 12 and 13 then
    raise exception 'Número inválido. Use DDD + número, ex.: (11) 91234-5678.';
  end if;
  update public.app_config set whatsapp_contato = digitos where id = 1;
end;
$$;

revoke execute on function public.contato_vendas(), public.admin_definir_contato(text) from anon, public;
grant execute on function public.contato_vendas(), public.admin_definir_contato(text) to authenticated;
