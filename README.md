# Uzidoc — шаблоны протоколов

Личный сайт для хранения текстов шаблонов протоколов УЗИ (нормы и патологии,
на русском, узбекском латиницей и кириллицей). Интерфейс скопирован с раздела
«Шаблоны → Системные шаблоны» админ-панели uzimed.uz.

Сайт: https://visualdoctor.github.io/uzidoc-templates/

## Как устроено

- React 18 + TypeScript + Vite + Tailwind, `HashRouter` (у GitHub Pages нет SPA-fallback).
- Данные: таблица `public.uzidoc_templates` в Supabase-проекте `cqlkhsaewbhqjuyeyunj`.
  Схема и политики RLS: [`supabase/schema.sql`](supabase/schema.sql).
- Доступ: читать и менять шаблоны может только аккаунт, записанный в
  `public.uzidoc_owners`. Это проверяет база (RLS), а не интерфейс.
- URL проекта и publishable key лежат в [`src/lib/supabase.ts`](src/lib/supabase.ts):
  они публичные по замыслу Supabase. Secret / service role key в репозиторий не кладётся.
- Деплой: каждый push в `main` собирается и публикуется workflow
  [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Команды

```bash
bun install      # зависимости
bun run dev      # http://localhost:8080
bun run build    # проверка типов + сборка в dist/
```

После изменения `package.json` запустите `bun install`, чтобы обновился
`bun.lock`: CI ставит зависимости с `--frozen-lockfile`.

## Доступ для ещё одного аккаунта

1. Supabase → Authentication → Users → Add user (email + пароль).
2. SQL Editor: `insert into public.uzidoc_owners (user_id) values ('<id пользователя>');`
