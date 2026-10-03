# RecallPace

**Know what you'll forget.**

An offline flashcard app with a real memory model behind it. Every card
carries its own forgetting curve — how long the memory holds, and how hard
that card is for you specifically. Intervals are computed from a retention
target you choose ("I want to remember 90% of what comes back"), not from
fixed multipliers.

The part most SRS apps leave out: RecallPace grades itself. Every review
records what the model predicted before you answered, so the Stats screen can
compare the promise against reality and tell you plainly when the schedule is
spacing your cards too far apart — or when it's being too cautious.

## Особенности

- Модель памяти на карточку: stability + difficulty, степенная кривая забывания
- Интервал от целевой удерживаемости, с показом будущего интервала под каждой оценкой
- Честная калибровка: прогноз против факта, с порогом достоверности
- Прогноз нагрузки на две недели вперёд
- Stats: уровень памяти, калибровка, активность, разбивка оценок, зрелость коллекции
- Полностью офлайн

## Стек

- Expo SDK 54 + expo-router, TypeScript
- `expo-sqlite` — всё локально
- `react-native-reanimated`, `react-native-svg`
- `expo-haptics`

## Запуск

```bash
npm install
npx expo start
```

## Структура проекта

```
app/            index (сетка колод), review (сессия), deck/[id], stats, settings
src/
  theme/        палитра, типографика, анимации, цвета оценок и зрелости (dataviz.ts)
  db/           схема и миграции (decks, cards, review_logs, app_settings)
  data/         decks.ts, cards.ts, settings.ts
  components/   FlipCard, GradeButtons, CalibrationChart, ForecastRidge, CardModal, DeckModal
  lib/          memory.ts (модель), scheduler.ts, calibration.ts, deckStats.ts, dates.ts, statsMath.ts
tools/          генератор иконок, проверки, release-скрипт
```

## Данные

Все данные хранятся локально на устройстве. Регистрации нет, интернет не нужен.
