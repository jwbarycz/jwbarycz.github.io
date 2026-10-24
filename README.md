# Panel

Osobisty panel zadań i produktywności.

> 🌐 **Na żywo:** [jwbarycz.github.io](https://jwbarycz.github.io/)

## Uruchomienie lokalnie

```bash
python3 -m http.server 8765
```

Potem otwórz http://localhost:8765 (moduły ES nie działają z `file://`).

## Zakładki

| Adres | Co jest |
|---|---|
| `#/` (logo) | **Panel** — podsumowanie: fokus, plan dnia, energia, co teraz czytasz/oglądasz, projekty, terminy |
| `#/zadania` | lista w stylu bloga, pogrupowana: po terminie / dziś / nadchodzące / bez terminu / zrobione |
| `#/projekty` | karty w stylu *Projects*; `#/projekty/<id>` — strona projektu z jego zadaniami |
| `#/biblioteka` | książki, filmy, seriale, kursy: kolejka / w trakcie / skończone, z oceną i jedną myślą |
| `#/dziennik` | energia 1–10, nastrój i notatka z każdego dnia + wykres |
| `#/styl` | ściąga z design systemu (link w stopce) |

## Struktura

| Plik | Co robi |
|---|---|
| `index.html` | szkielet strony, nawigacja, fonty |
| `css/style.css` | design system: tokeny kolorów, typografia, komponenty |
| `js/config.js` | **ustawienia** — nazwa, kategorie, godziny dnia, repo z danymi |
| `js/store.js` | stan i zapis danych (faza 1: localStorage, faza 2: GitHub) |
| `js/tasks.js` | parser szybkiego dodawania, filtry i sortowanie zadań |
| `js/insights.js` | wyliczenia i pomocnicze: postęp projektów, biblioteka, energia |
| `js/components.js` | zadanie (wiersz i wpis jak post), dialogi, wykres energii |
| `js/views/*.js` | widoki zakładek |

## Szybkie dodawanie

`Napisać esej !3 #kog @pt ^jutro`

- `!1`–`!3` lub `!`/`!!`/`!!!` — priorytet
- `#kat` — kategoria (wystarczy początek nazwy)
- `@dziś` `@jutro` `@pt` `@30.10` `@2026-11-02` — termin
- `+nazwa` — projekt (wystarczy początek nazwy)
- `^jutro` itd. — zaplanuj na dzień

## Biblioteka — szybkie dodawanie

`Diuna — Frank Herbert` (książka) · `Oppenheimer #film` · `Essence of Linear Algebra — 3Blue1Brown #kurs`

## Skróty

`n` nowe zadanie · `t` motyw · `g` + `p` Panel / `z` Zadania / `r` Projekty / `b` Biblioteka / `d` Dziennik / `s` Styl
