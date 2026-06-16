# 📦 Гайд по публикации на npm

Пошаговая инструкция, как выложить `telegram-fragment-api` в реестр [npmjs.com](https://www.npmjs.com/) и обновлять её дальше.

---

## 0. Что уже готово

В проекте уже настроено всё для публикации:

| Файл | Зачем |
|---|---|
| `package.json` | имя, версия, `exports`, `files`, скрипты `build`, `test` и `prepublishOnly` |
| `tsup.config.ts` | сборка в `dist/` сразу в ESM + CommonJS + `.d.ts` |
| `tsconfig.json` | строгий TypeScript |
| `vitest.config.ts` | мок-тесты и порог покрытия |
| `.npmignore` + `files` | в пакет попадёт **только** `dist/`, `README*`, `LICENSE` |

> `prepublishOnly` настроен как `typecheck && test && build` — npm **не даст опубликовать**, если типы не сходятся или тесты падают.

Ключевые поля `package.json`, на которые смотрит npm:

```jsonc
{
  "name": "telegram-fragment-api",   // имя в реестре (должно быть уникальным)
  "version": "0.1.0",                // версия по SemVer
  "main": "./dist/index.cjs",        // точка входа для CommonJS (require)
  "module": "./dist/index.js",       // точка входа для ESM (import)
  "types": "./dist/index.d.ts",      // типы TypeScript
  "files": ["dist", "README.md", "README.ru.md", "LICENSE"],
  "prepublishOnly": "npm run build"  // npm сам соберёт проект перед публикацией
}
```

---

## 1. Регистрация и вход

1. Создайте аккаунт на **https://www.npmjs.com/signup** (если ещё нет).
2. **Включите 2FA** (Account → Two-Factor Authentication) — для публикации это уже почти обязательно.
3. Войдите в CLI:

```bash
npm login
```

Проверьте, что вошли:

```bash
npm whoami        # должно вывести ваш ник
```

> Альтернатива для CI/CD — **Automation Token**: npm → Access Tokens → Generate New Token → *Automation*. Затем в пайплайне:
> `npm config set //registry.npmjs.org/:_authToken=$NPM_TOKEN`

---

## 2. Проверка имени

```bash
npm view telegram-fragment-api
```

- `404 Not Found` → имя свободно, можно публиковать. ✅
- Если имя занято — переименуйте пакет (поле `name`) либо используйте **scoped-имя**: `@dremindev/telegram-fragment-api`. Для scoped-пакета первая публикация требует флага доступа (см. шаг 5).

---

## 3. Финальная подготовка

```bash
# 1. Установить зависимости (если ещё не)
npm install

# 2. Проверить типы
npm run typecheck

# 3. Прогнать мок-тесты
npm test

# 4. Собрать проект
npm run build
```

После сборки в `dist/` должны появиться:

```
dist/index.js      dist/index.cjs      ← рантайм (ESM + CJS)
dist/index.d.ts    dist/index.d.cts    ← типы
dist/*.map                              ← sourcemaps
```

---

## 4. Проверка содержимого пакета (важно!)

Перед публикацией посмотрите, **что именно** попадёт в архив — чтобы случайно не залить лишнее (исходники, секреты, node_modules):

```bash
npm pack --dry-run
```

Команда покажет список файлов и итоговый размер. Ожидаемо там должны быть только `dist/`, `README.md`, `README.ru.md`, `LICENSE`, `package.json`.

Хотите подержать готовый `.tgz` в руках:

```bash
npm pack
# создаст telegram-fragment-api-0.1.0.tgz — его можно поставить локально:
# npm install ./telegram-fragment-api-0.1.0.tgz
```

---

## 5. Публикация

Для **публичного** пакета:

```bash
npm publish --access public
```

> Для обычного (не scoped) имени `--access public` не обязателен, но с ним надёжнее. Для **scoped**-имени (`@dremindev/...`) флаг обязателен на первой публикации, иначе npm попытается сделать пакет приватным (платно).

`prepublishOnly` автоматически пересоберёт проект перед отправкой. После успеха проверьте:

👉 **https://www.npmjs.com/package/telegram-fragment-api**

---

## 6. Обновление версии

npm **не даёт** опубликовать одну и ту же версию дважды. Перед каждой публикацией поднимайте версию по [SemVer](https://semver.org/lang/ru/):

| Команда | Было → стало | Когда |
|---|---|---|
| `npm version patch` | 0.1.0 → 0.1.1 | багфиксы, без изменения API |
| `npm version minor` | 0.1.0 → 0.2.0 | новые возможности, обратно совместимо |
| `npm version major` | 0.1.0 → 1.0.0 | ломающие изменения API |

`npm version` сам обновит `package.json`, сделает git-коммит и тег. Дальше:

```bash
npm publish --access public
git push --follow-tags
```

> Хотите выложить бету, не трогая `latest`:
> `npm version prerelease --preid=beta` → `npm publish --tag beta`

---

## 7. Частые ошибки

| Ошибка | Причина и решение |
|---|---|
| `403 Forbidden` | имя занято / нет прав / не сделали `--access public` для scoped |
| `You cannot publish over the previously published versions` | забыли поднять версию (`npm version patch`) |
| `npm ERR! need auth` | не вошли — `npm login` |
| В пакет попали исходники | проверьте `files` в `package.json` и `.npmignore` через `npm pack --dry-run` |
| ` E402 Payment Required` | scoped-пакет публикуется как приватный — добавьте `--access public` |
| Типы не подхватываются у пользователя | проверьте, что `dist/index.d.ts` существует и указан в `types`/`exports` |

---

## 8. (Опционально) Автопубликация через GitHub Actions

Чтобы пакет публиковался автоматически при создании git-тега `v*`:

```yaml
# .github/workflows/publish.yml
name: Publish to npm
on:
  push:
    tags: ["v*"]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write   # для npm provenance
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: "https://registry.npmjs.org"
      - run: npm ci
      - run: npm run build
      - run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Добавьте `NPM_TOKEN` (Automation Token) в **Settings → Secrets → Actions** репозитория. Флаг `--provenance` добавит проверяемую метку происхождения пакета — npm покажет «зелёную галочку» о том, что пакет собран из этого репозитория.

---

## TL;DR

```bash
npm login
npm test                # мок-тесты должны пройти
npm run build
npm pack --dry-run      # проверить содержимое
npm publish --access public
# для обновлений:
npm version patch && npm publish --access public && git push --follow-tags
```
