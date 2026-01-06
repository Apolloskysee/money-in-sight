# ⚡ Быстрая справка по системе верификации email

## 🎯 За 30 секунд

Система отправляет **6-значный код** на email пользователя при регистрации. Пользователь вводит код, и если он верный, получает доступ к приложению.

```
Регистрация → Генерация кода → Email отправлена → Ввод кода → Проверка → ✅ Доступ
```

## 📋 Быстрая установка

### 1. Установить EmailJS

```bash
# На emailjs.com создать:
# 1. Service (Gmail/SMTP)
# 2. Template
# 3. Скопировать ключи
```

### 2. Установить переменные окружения

```env
EMAILJS_SERVICE_ID=service_xxxxx
EMAILJS_TEMPLATE_ID=template_xxxxx
EMAILJS_PUBLIC_KEY=public_key_xxxxx
NODE_ENV=production
```

### 3. На Netlify установить переменные

```
Site settings → Build & deploy → Environment
Добавить 3 переменные выше
```

### 4. Протестировать

```bash
npm run dev
# Перейти на http://localhost:8888
# Заполнить форму регистрации
# Проверить консоль на код
```

## 📁 Файлы для быстрого просмотра

```
public/js/auth.js                    ← Регистрация
public/js/auth-verification.js       ← Проверка кода
public/js/ui.js                      ← Обработчик формы
netlify/functions/send-email.js      ← Отправка email
```

## 🔧 Как это работает

### 1. User заполняет форму
```html
<form id="registerForm">
  <input id="registerName">
  <input id="registerEmail">
  <input id="registerPassword">
</form>
```

### 2. Генерируется код
```javascript
const code = Math.floor(100000 + Math.random() * 900000).toString();
// Пример: "423857"
```

### 3. Код сохраняется в Firestore
```javascript
await db.collection('verificationCodes').doc(userId).set({
  code: "423857",
  email: "user@example.com",
  expiresAt: "2026-01-05T14:10:00",  // 10 минут
  attempts: 0
});
```

### 4. Email отправляется
```javascript
await fetch('/.netlify/functions/send-email', {
  method: 'POST',
  body: JSON.stringify({
    to_email: "user@example.com",
    verification_code: "423857"
  })
});
```

### 5. User вводит код
```html
<input id="verificationCode" placeholder="123456" maxlength="6">
```

### 6. Код проверяется
```javascript
const enteredCode = "423857";
const savedCode = codeData.code;

if (enteredCode === savedCode) {
  // ✅ Правильно!
  await db.collection('users').doc(userId).update({
    emailVerified: true
  });
} else {
  // ❌ Неверно!
  throw new Error('Неверный код');
}
```

## 🎨 UI/UX

### Форма регистрации
```
┌─────────────────────────────────┐
│     Money in Sight              │
├─────────────────────────────────┤
│ Имя:        [____________]      │
│ Email:      [____________]      │
│ Пароль:     [____________]      │
│ ☑ Согласен с условиями          │
├─────────────────────────────────┤
│  [ Начать 14 дней бесплатно ]   │
└─────────────────────────────────┘
```

### Модаль верификации
```
┌─────────────────────────────────┐
│  Подтверждение email            │
├─────────────────────────────────┤
│  Код отправлен на:              │
│  user@example.com               │
│                                 │
│  [______]  (6 символов)         │
│                                 │
│  Отправить код повторно         │
│  (недоступно 60 сек)            │
│                                 │
│  [ Подтвердить и создать ]      │
│                                 │
│  [ ← Назад к регистрации ]      │
└─────────────────────────────────┘
```

## ⚙️ Конфигурация

| Параметр | Значение | Описание |
|----------|----------|---------|
| Длина кода | 6 цифр | Баланс между безопасностью и удобством |
| Срок действия | 10 минут | Время для ввода кода |
| Max попыток | 3 | Защита от brute-force |
| Отсчет | 60 сек | Время ожидания для повторной отправки |
| Storage | Firestore | Безопасное хранилище кодов |

## 🐛 Отладка

### Код не приходит?

1. **Проверьте спам**
2. **DevTools → Console** → ищите ошибки
3. **Netlify → Functions → Logs** → проверьте логи сервера
4. **Firestore Console** → посмотрите коллекцию `verificationCodes`

### Нужен код для тестирования?

```bash
# В консоли браузера (dev mode):
db.collection('verificationCodes').doc(userId).get().then(doc => {
  console.log(doc.data().code);  // Выведет код
});
```

### Email отправляется, но не видно?

```bash
# Проверьте переменные окружения в Netlify:
# Functions → Environment variables
# Должны быть: EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY
```

## 📊 Мониторинг

### Что смотреть в консоли браузера (F12):

```javascript
✅ = успех
❌ = ошибка
⚠️ = предупреждение
📧 = email операции
🔐 = аутентификация
```

### Что смотреть в логах сервера:

```
Netlify Dashboard → Functions → Logs → send-email
Ищите строки с:
- "Попытка отправки"
- "Email успешно отправлен"
- "Ошибка"
```

## 🔒 Безопасность

### Что защищено:

- ✅ Коды хранятся в защищенной БД (Firestore)
- ✅ Коды истекают автоматически
- ✅ Неправильные коды удаляют документ после 3 попыток
- ✅ Используемые коды удаляются
- ✅ CORS правильно настроены

### Что НЕ защищено (улучшения):

- ⚠️ Нет rate limiting на отправку email (добавить в production)
- ⚠️ Нет двухфакторной аутентификации
- ⚠️ Нет SMS верификации

## 🚀 Production deploy

```bash
# 1. Убедитесь, что NODE_ENV=production в Netlify

# 2. Установите все EmailJS переменные

# 3. Протестируйте на staging
# (используйте test email аккаунт)

# 4. Проверьте Firestore правила безопасности

# 5. Мониторьте логи 24 часа

# 6. Готово!
```

## 📚 Документация

| Файл | Что там |
|------|---------|
| [VERIFICATION_SUMMARY.md](VERIFICATION_SUMMARY.md) | ⭐ НАЧНИТЕ ОТСЮДА |
| [VERIFICATION_IMPROVEMENTS.md](VERIFICATION_IMPROVEMENTS.md) | Подробные улучшения |
| [SETUP_AND_TESTING.md](SETUP_AND_TESTING.md) | Инструкции по настройке |
| [INDEX_OF_CHANGES.md](INDEX_OF_CHANGES.md) | Полный индекс изменений |

## 🆘 Нужна помощь?

1. **Прочитайте документацию** выше
2. **Проверьте консоль браузера** (F12 → Console)
3. **Проверьте логи Netlify** (Functions → Logs)
4. **Проверьте Firestore** (посмотрите коллекции)
5. **Перезагрузите страницу** (Ctrl+F5)
6. **Очистите кеш** (DevTools → Clear Storage)

## 💡 Советы

- 💡 Используйте тестовый email при разработке
- 💡 В dev режиме код выводится в консоль
- 💡 Коды хранятся 10 минут, потом автоматически удаляются
- 💡 Каждая регистрация создает новый документ с кодом
- 💡 После верификации код удаляется
- 💡 Используйте Firestore Console для просмотра кодов

## 🎓 Что изучить дальше

- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [EmailJS Templates](https://www.emailjs.com/docs/user-guide/create-email-template/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Email Best Practices](https://www.smashingmagazine.com/2018/09/sso-smashing-guide/)

---

**Версия:** 1.0  
**Последнее обновление:** 5 января 2026  
**Статус:** ✅ Готово к использованию
