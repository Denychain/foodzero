# FoodZero — Hero Starter

Мінімальний шаблон для виконання кроку 1 (структура, базовий HTML, підключення шрифтів/ресурсів).

## Структура
```
foodzero-hero-starter/
├─ index.html
├─ styles.css
├─ scripts.js
└─ assets/
   ├─ img/
   │  └─ hero-1.jpg        ← замінити на експорт із Figma
   └─ icons/
      └─ favicon.svg
```

## Локальний старт
Відкрий `index.html` у браузері. Нічого збирати не потрібно.

## Git + GitHub Pages
```bash
git init
git add .
git commit -m "Init: FoodZero hero starter"
git branch -M main
# Створи репозиторій на GitHub і додай як origin:
git remote add origin https://github.com/<твій_нік>/foodzero-hero-starter.git
git push -u origin main

# У налаштуваннях репозиторію: Settings → Pages → Build and deployment
# Source: Deploy from a branch, Branch: main /(root)
```

## Далі
1) Експортуй зображення з Figma в `assets/img` (webp/avif якщо можна).
2) На кроці 3 доопрацюй HTML хедера і hero згідно макету.
3) На кроці 4 — мобільні стилі; далі — брейкпойнти.
