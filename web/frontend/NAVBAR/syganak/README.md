# Клуб «Сыганак»

Prime Premium, Астана, ул. Сыганак, 22/1. В клубе 18 залов и 96 игровых мест.
Страница собрана по образцу остальных клубов Prime Game Hub: карта, характеристики,
код клуба и переключатель в общих страницах уже заполнены.

## Основные данные

| Что | Где | Значение |
| --- | --- | --- |
| Название в переключателе | `NAVBAR/map.html`, `NAVBAR/chars.html`, `NAVBAR/codes.html` | «Сыганак» |
| Телефон для брони | `NAVBAR/syganak/syganak.html`, секция `.booking-contacts` | `+7 778 774 42 22` |
| `office_id` | `NAVBAR/syganak/syganak.html` (`OFFICE_ID`), `syganakapp.js` (`OFFICE_ID`) | `1` (из админ-URL `/map/1/...`) |
| Домен API | `web/backend/server.js`, объект `CLUBS.syganak` | `syganak.app.enes.tech` (админка — `syganak.admin-v2.enes.tech`) |
| Авторизация API | `.env` backend | `LOG` / `PAS` (как у остальных клубов) |
| Код клуба | `NAVBAR/codes.html`, объект `codes` | `CDZOR` |
| Характеристики залов | `NAVBAR/chars.html` (панель `#club-syganak`) | 18 залов, данные ниже |
| Расстановка ПК и зоны | `NAVBAR/syganak/positions.json`, зоны в `syganak.html` | 18 зон, 96 ПК |

## Залы и характеристики

| Зал | ПК | Мест | Процессор | Видеокарта | Монитор | Мышь |
| --- | --- | --- | --- | --- | --- | --- |
| Standart | 1–30 | 30 | Ryzen 7 7800X3D | RTX 5070 Gigabyte | 610 Гц | Logitech G PRO X2 SUPERSTRIKE |
| Solo | 31 | 1 | Ryzen 7 9800X3D | RTX 5080 Gigabyte | 600 Гц | Logitech G PRO X3 SUPERSTRIKE |
| Stream | 32 | 1 | Ryzen 7 9800X3D | RTX 5080 Gigabyte | 600 Гц | Logitech G PRO X3 SUPERSTRIKE |
| Squad 1 | 33–36 | 4 | Ryzen 7 9800X3D | RTX 5070 Ti Aero | 610 Гц | Logitech G PRO X2 SUPERSTRIKE |
| VIP 1 | 37–41 | 5 | Ryzen 7 9800X3D | RTX 5070 Gigabyte | 610 Гц | Logitech G PRO X2 SUPERSTRIKE |
| Duo 1 | 42–43 | 2 | Ryzen 7 9800X3D | RTX 5080 Gigabyte | 610 Гц | Logitech G PRO X3 SUPERSTRIKE |
| Duo 2 | 44–45 | 2 | Ryzen 7 9800X3D | RTX 5080 Gigabyte | 610 Гц | Logitech G PRO X3 SUPERSTRIKE |
| Duo 3 | 46–47 | 2 | Ryzen 7 9800X3D | RTX 5080 Gigabyte | 600 Гц | Logitech G PRO X3 SUPERSTRIKE |
| Comfort | 48–59 | 12 | Ryzen 7 7800X3D | RTX 5070 Aero | 610 Гц | Logitech G PRO X2 SUPERSTRIKE |
| Squad 2 | 60–63 | 4 | Ryzen 7 9800X3D | RTX 5070 Ti Gigabyte | 610 Гц | Logitech G PRO X2 SUPERSTRIKE |
| Trio | 64–66 | 3 | Ryzen 7 9800X3D | RTX 5080 Gigabyte | 610 Гц | Logitech G PRO X3 SUPERSTRIKE |
| Duo 5 | 67–68 | 2 | Ryzen 7 9800X3D | RTX 5080 Gigabyte | 720 Гц | Logitech G PRO X3 SUPERSTRIKE |
| Duo 4 | 69–70 | 2 | Ryzen 7 9800X3D | RTX 5080 Gigabyte | 720 Гц | Logitech G PRO X3 SUPERSTRIKE |
| Private | 71–76 | 6 | Ryzen 7 9800X3D | RTX 5070 Aero | 610 Гц | Logitech G PRO X2 SUPERSTRIKE |
| Bootcamp 1 | 92–96 | 5 | Ryzen 7 9800X3D | RTX 5070 Ti Gigabyte | 610 Гц | Logitech G PRO X2 SUPERSTRIKE |
| Bootcamp 2 | 87–91 | 5 | Ryzen 7 9800X3D | RTX 5070 Ti Gigabyte | 610 Гц | Logitech G PRO X2 SUPERSTRIKE |
| Bootcamp 3 | 82–86 | 5 | Ryzen 7 9800X3D | RTX 5080 Gigabyte | 610 Гц | Logitech G PRO X2 SUPERSTRIKE |
| Bootcamp 4 | 77–81 | 5 | Ryzen 7 9800X3D | RTX 5080 Gigabyte | 600 Гц | Logitech G PRO X3 SUPERSTRIKE |

Объём ОЗУ, клавиатура, наушники, коврик и кресло пока указаны как «Уточняется» —
этих данных в исходном списке не было.

## Допущения и расстановка

- «Суперстрайк х2» / «Суперстрайк х3» трактуются как мыши
  Logitech G PRO X2 SUPERSTRIKE и Logitech G PRO X3 SUPERSTRIKE.
- Нумерация ПК и схема расположения залов точно соответствуют схеме клуба:
  Standart (1–30), Solo (31), Stream (32), Squad 1 (33–36), VIP 1 (37–41),
  Duo 1 (42–43), Duo 2 (44–45), Duo 3 (46–47), Comfort (48–59),
  Squad 2 (60–63), Trio (64–66), Duo 5 (67–68), Duo 4 (69–70),
  Private (71–76), Bootcamp 1 (92–96), Bootcamp 2 (87–91),
  Bootcamp 3 (82–86), Bootcamp 4 (77–81).

## Файлы клуба

- `syganak.html` — страница карты, 18 статических SVG-зон, легенда, «Скоро освободятся»,
  динамический список зон.
- `syganakapp.js` — загрузка API, маркеры ПК, бронирование, автообновление.
- `positions.json` — координаты 96 ПК в системе `viewBox 2556×1200` (18 блоков).
- `style.css` — стили страницы клуба.

## Как менять карту

1. Открыть конструктор: `NAVBAR/constructor.html?club=syganak` через backend (`node server.js`).
2. Подвинуть ПК и зоны.
3. Нажать сохранение — `positions.json` и зоны в `syganak.html` обновятся автоматически.

Важно: зоны должны оставаться статическими элементами `<rect class="zone">` в HTML.
Если генерировать их только через JS, конструктор и автообновление зон их не увидят.

## Проверка

- Карта: `NAVBAR/map.html` → выбрать «Сыганак».
- Характеристики: `NAVBAR/chars.html` → выбрать «Сыганак».
- Код: `NAVBAR/codes.html` → выбрать «Сыганак».
