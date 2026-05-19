-- Restrict llm_config providers to OpenAI-compatible endpoints only.

update public.llm_config
set provider = 'custom'
where provider = 'anthropic';

alter table public.llm_config
  drop constraint if exists llm_config_provider_check;

alter table public.llm_config
  add constraint llm_config_provider_check
  check (provider in ('openai', 'deepseek', 'custom'));
