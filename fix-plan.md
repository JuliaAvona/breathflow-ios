# План исправлений: App Store Rejection + Sentry WatchdogTermination

## Проблема 1: App Store Rejection — Guideline 3.1.2(c)

**Причина отказа:** Приложение предлагает авто-возобновляемые подписки (Weekly, Annual), но не содержит всю обязательную информацию.

### Что требует Apple для подписок в приложении:
- [x] Название подписки (WEEKLY, ANNUAL) — есть
- [x] Длительность подписки (per week, per year) — есть
- [x] Цена подписки — есть
- [x] Ссылки на Privacy Policy и Terms of Use — есть
- [ ] **Дисклеймер об автопродлении** — НЕТ

### Что требует Apple в App Store Connect:
- [ ] Ссылка на Terms of Use (EULA) в поле EULA или в описании приложения
- [ ] Ссылка на Privacy Policy в поле Privacy Policy

### Исправления в коде:

#### 1. `app/paywall.tsx` — добавить дисклеймер автопродления
Добавить под CTA-кнопкой текст:
> "Payment will be charged to your Apple ID account at confirmation of purchase. 
> Subscription automatically renews unless canceled at least 24 hours before the 
> end of the current period. You can manage and cancel subscriptions in App Store 
> account settings."

#### 2. App Store Connect (вручную):
- Добавить ссылку на EULA в поле «EULA» или в описание приложения
- Проверить, что Privacy Policy URL заполнен

---

## Проблема 2: Sentry WatchdogTermination — утечки памяти

**Причина:** iOS убивает приложение за чрезмерное использование RAM. Найдено 6 утечек памяти в анимационных компонентах.

### CRITICAL: `src/components/PulseRings.tsx`
**Проблема:** `new Animated.Value(0.35)` создаётся при каждом рендере внутри `Animated.multiply()`.
**Исправление:** Вынести значение в `useRef` и создать `Animated.multiply` один раз.

### HIGH: `src/components/BreathingBurst.tsx`
**Проблема:** 8 точек × 2 интерполяции = 16 объектов пересоздаются при каждом рендере без мемоизации.
**Исправление:** Обернуть массив `dots` в `useMemo` с зависимостью от `burstAnim`.

### HIGH: `src/components/BreathingMandala.tsx`
**Проблема:** Множественные `Animated.loop` накапливаются при смене фаз + 16 интерполяций пересоздаются каждый рендер в `.map()`.
**Исправление:** 
- Гарантировать `stop()` перед каждым новым `loop`
- Мемоизировать интерполяции в `useMemo`
- Добавить cleanup в useEffect return

### HIGH: `app/session.tsx`
**Проблема:** `setInterval` для хаптиков может накапливаться при быстрой смене фаз дыхания.
**Исправление:** Всегда очищать предыдущий интервал перед созданием нового через `clearInterval(hapticIntervalRef.current)`.

### MEDIUM: `src/components/ConfettiOverlay.tsx`
**Проблема:** 40 частиц × 4 интерполяции = 160 объектов создаются при каждом рендере.
**Исправление:** Мемоизировать интерполяции через `useMemo`.

### MEDIUM: `app/(tabs)/index.tsx` — домашний экран
**Проблема:** 10+ анимаций фигур (shape previews) работают одновременно.
**Исправление:** Ленивая загрузка — анимировать только видимые карточки или использовать статичные превью.
