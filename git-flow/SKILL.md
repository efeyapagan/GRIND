---
name: git-flow
description: Use when starting, continuing or shipping any GRIND work item — picking up a GitHub issue, opening a branch, opening PRs to dev or master, merging, or back-merging master into dev ("issue'yu üstüme al", "branch aç", "PR aç", "dev'e al", "master'a al", "geri-merge").
---

# GRIND git akışı

Her iş bir issue ile başlar, `master`'dan açılan tek bir branch'le yürür, önce `dev`'e sonra
`master`'a merge edilir ve `master` `dev`'e geri-merge edilerek biter. Gerekçeler CONTRIBUTING.md'de;
bu skill uygulanacak adımlardır.

Kullanıcı bu akışın git adımlarını **sormadan** uygulamanı istiyor; yalnızca aşağıdaki
"Dur ve bildir" durumlarında ve 2. adımdaki test onayında durursun.

## 1. Issue'yu üstüne al ve branch aç

Issue yoksa önce aç (`gh issue create --title ... --body-file ...`), numarayı al. Sonra:

```bash
git fetch origin
gh issue edit <no> --add-assignee @me
gh issue develop <no> --base master --name feature/<no>-kisa-ad --checkout
```

- `gh issue develop` branch'i issue'nun **Development** bölümüne bağlar — `git checkout -b` bunu yapmaz, kullanma.
- Branch adı: `feature/<no>-kisa-ad` (kebab-case, Türkçe karaktersiz). Salt doküman işi: `docs/<no>-kisa-ad`.
- Birden fazla issue'yu birlikte çözüyorsan: `feature/<no1>-<no2>-kisa-ad`, `develop`'u ilk issue'da çalıştır.
- Issue başkasına atanmışsa (`gh issue view <no> --json assignees`) üstüne alma, kullanıcıya sor.

## 2. Önce testler, onay, sonra kod

- Küçük/orta issue: yalnızca gerekli testleri yaz (her test tek bir davranışı sabitler, mevcut
  testlerin kapsadığını tekrar etmez), her testin neyi doğruladığını kullanıcıya **sun ve onay bekle**,
  sonra testleri geçiren kodu yaz.
- Büyük iş (faz/dilim): superpowers:brainstorming → spec → plan → superpowers:subagent-driven-development.
- Testleri yalnızca ilgili kapsamda koştur. Yeni entity/tablo eklendiyse filtreye
  `FullyQualifiedName~Grind.Tests.Data`'yı da kat. Frontend: `npx vitest run <yol>`, `npm run typecheck`
  (`tsc -b`, `--noEmit` değil).

## 3. Commit

Mesajı **Write aracıyla** scratchpad'e yaz, `git commit -F <dosya>` kullan (PowerShell here-string ve
`Set-Content` BOM/tırnak bozuyor). Son satır oturumun verdiği `Co-Authored-By` trailer'ı;
`git log -1 --format=%B` ile doğrula. Alt ajan commit'lerinde de trailer'ı kontrol et.

## 4. dev'e PR

```bash
git push -u origin <branch>
gh pr create --base dev --head <branch> --title "feat: <kısa özet> (#<no>)" --body-file <dosya>
gh pr view <pr> --json mergeable      # CONFLICTING ise dur
gh pr checks <pr> --watch             # kırmızıysa dur
gh pr merge <pr> --merge
```

- Başlık öneki: `feat:` / `fix:` / `docs:` / `refactor:`, sonunda `(#<no>)`.
- Gövde (Write ile, BOM'suz): `## Özet` maddeleri, `## Test planı` (koşulan komutlar ve **komutla
  sayılmış** sonuç sayıları, checkbox'lı), `Refs #<no>`, son satır PR imzası.
- Kullanıcı dev'de denemek istediğini söylediyse master adımından önce onayını bekle.

## 5. master'a PR — aynı branch'ten

```bash
gh pr create --base master --head <branch> --title "<dev PR'ıyla aynı>" --body-file <dosya>
gh pr view <pr> --json mergeable
gh pr checks <pr> --watch
gh pr merge <pr> --merge
```

- Gövdenin ilk satırı: `Master PR. dev tarafı #<devPR> ile merge edildi; bu PR aynı branch'ten.`
  Ardından aynı Özet/Test planı, **`Closes #<no>`**, imza.
- master'da bu arada başka merge'ler olduysa ve PR `CONFLICTING` ise: branch'e
  `git merge --no-ff origin/master -m "Merge master into <branch> (<dosya> çakışması)"`, çakışmayı
  dev'deki çözümle aynı şekilde çöz, push et ve gövdeye bir `Not:` satırıyla yaz.

## 6. master'ı dev'e geri-merge et — atlanamaz

```bash
git fetch origin
git checkout dev
git pull --ff-only origin dev
git merge --no-ff origin/master -m "Merge master into dev (#<pr> geri-merge)"
git push origin dev
git fetch origin && git merge-base --is-ancestor origin/master origin/dev && echo OK
```

`OK` görmeden bitti deme. Birden fazla PR birlikte terfi ettiyse mesaj: `(#108, #109 geri-merge)`.
Sonra kullanıcıya kısa bir bildirim: issue, iki PR numarası, geri-merge commit'i.

## Dur ve bildir

- CI kırmızı ya da PR'da hiç check yok (→ `gh pr view <pr> --json mergeable`, CONFLICTING ise topoloji sorunu)
- PR `CONFLICTING` ve çözüm dev'deki çözümden türetilemiyor
- Push reddedildi (non-fast-forward) — uzak branch'i `--no-ff` merge et, force push değil

## Asla

- `--squash` / `--rebase` merge, `--force` push, `--delete-branch` ya da feature branch silmek
- Branch'i `dev`'den açmak
- Geri-merge'i "sonra yaparım" diye bırakmak — atlanırsa sonraki PR'larda CI sessizce hiç çalışmaz
- Geri-merge'i PowerShell'de `if ($?)` zinciriyle yapmak — git stderr'e yazınca merge sessizce atlanır; Bash kullan
