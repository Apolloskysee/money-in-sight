# Настройка и тестирование системы верификации email

## 🚀 Быстрый старт

### 1. Переменные окружения (.env файл)

Создайте файл `.env` в корне проекта:

```env
# Firebase Admin SDK (для backend функций)
FIREBASE_ADMIN_CREDENTIALS={"type":"service_account","project_id":"your-project-id",...}
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project-id",...}
FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com

# EmailJS Configuration
EMAILJS_SERVICE_ID=service_xxxxxxxxxxxxx
EMAILJS_TEMPLATE_ID=template_xxxxxxxxxxxxx
EMAILJS_PUBLIC_KEY=public_key_xxxxxxxxxxxxxxx

# Node Environment
NODE_ENV=development
```

### 2. Получение Firebase Credentials

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. Перейдите в **Project Settings** (⚙️ -> Project Settings)
4. Вкладка **Service Accounts**
5. Нажмите **Generate New Private Key**
6. Скопируйте JSON и поместите в `FIREBASE_ADMIN_CREDENTIALS`

### 3. Настройка EmailJS

#### Способ 1: Онлайн сервис EmailJS

1. Откройте [emailjs.com](https://www.emailjs.com/)
2. Создайте аккаунт (бесплатно)
3. **Добавьте Email Service:**
   - Нажмите **Add Service**
   - Выберите **Gmail** или **SMTP**
   - Авторизуйтесь и подтвердите
   - Скопируйте **Service ID**

4. **Создайте Email Template:**
   - Нажмите **Create Email Template**
   - Шаблон может выглядеть так:

```html
Здравствуйте, {{user_name}}!

Ваш код подтверждения для {{email_type}}:

    {{verification_code}}

Код действует 10 минут.

---
Money in Sight Team
```

5. **Получите ключи:**
   - Dashboard → **Keys** (показывает `EMAILJS_PUBLIC_KEY`)
   - Template → (показывает `EMAILJS_TEMPLATE_ID`)

#### Способ 2: Локальная разработка (без EmailJS)

Для локальной разработки достаточно установить `NODE_ENV=development`, и коды будут выводиться в консоль.

## 🧪 Тестирование

### Тест 1: Базовая регистрация с верификацией

```javascript
// В консоли браузера выполните:
const testEmail = 'test' + Date.now() + '@example.com';
const testPassword = 'Test123456';
const testName = 'Test User';

// Откройте форму регистрации
document.getElementById('registerBtn').click();

// Заполните форму программно
document.getElementById('registerName').value = testName;
document.getElementById('registerEmail').value = testEmail;
document.getElementById('registerPassword').value = testPassword;
document.getElementById('agreeTerms').checked = true;

// Отправьте форму
document.getElementById('registerForm').dispatchEvent(new Event('submit'));

// Код должен появиться в консоли (dev mode) или на почте (production)
```

### Тест 2: Проверка сохранения кода в Firestore

```javascript
// В консоли браузера:
const { db } = window.firebaseApp.getFirebaseServices();
const userId = window.registrationUserId; // Получится после регистрации

db.collection('verificationCodes').doc(userId).get().then(doc => {
    if (doc.exists) {
        console.log('✅ Код сохранен в Firestore:', doc.data());
    } else {
        console.log('❌ Код не найден');
    }
});
```

### Тест 3: Неверный код

1. Запустите регистрацию
2. В модали верификации введите неверный код (например, `000000`)
3. Должна появиться ошибка: "Неверный код. Попыток осталось: 2"
4. После 3 неправильных попыток: "Превышено максимальное число попыток"

### Тест 4: Истекший код

1. Запустите регистрацию
2. Откройте браузер в режиме разработчика (DevTools)
3. Перейдите на Firestore Console
4. Измените `expiresAt` на время в прошлом
5. Попробуйте ввести правильный код
6. Должна появиться ошибка: "Код подтверждения истёк"

### Тест 5: Повторная отправка кода

1. Запустите регистрацию и получите код
2. Дождитесь истечения 60 секунд (или откройте DevTools и нажмите кнопку)
3. Нажмите "Отправить код повторно"
4. Должен быть отправлен новый код

## 📊 Мониторинг и отладка

### Просмотр логов браузера

Откройте DevTools → Console и ищите:

```
✅ - Успешные операции
❌ - Ошибки
⚠️ - Предупреждения
📧 - Email операции
🔐 - Аутентификация
📝 - Регистрация
```

### Просмотр логов сервера

Если вы деплоируете на Netlify:

1. Откройте [Netlify Dashboard](https://app.netlify.com/)
2. Выберите сайт
3. Перейдите в **Functions** → **Logs**
4. Выберите функцию `send-email`

### Проверка Firestore базы данных

1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите проект
3. **Firestore Database** → Collections
4. Посмотрите коллекцию `verificationCodes`
5. Там должны быть документы с кодами верификации

## 🔧 Отладка проблем

### Проблема: Email не приходит

**Решение:**
1. Проверьте спам-папку
2. Убедитесь, что `NODE_ENV=production`
3. Проверьте EmailJS ключи в `.env`
4. Проверьте логи Netlify функции
5. Убедитесь, что email сервис авторизован в EmailJS

### Проблема: Ошибка "Email service not configured"

**Решение:**
1. Проверьте все три переменные окружения:
   - `EMAILJS_SERVICE_ID`
   - `EMAILJS_TEMPLATE_ID`
   - `EMAILJS_PUBLIC_KEY`
2. В Netlify установите эти переменные в **Site settings** → **Build & deploy** → **Environment**

### Проблема: "Код верификации не найден"

**Решение:**
1. Убедитесь, что код был сохранен в Firestore
2. Проверьте, что `FIREBASE_SERVICE_ACCOUNT_JSON` установлена
3. Очистите localStorage: `localStorage.clear()`
4. Перезагрузите страницу и повторите регистрацию

### Проблема: Модаль верификации не открывается

**Решение:**
1. Откройте DevTools → Console
2. Проверьте, загружен ли файл `auth-verification.js`
3. Убедитесь, что функция `openEmailVerificationModal` определена
4. Выполните в консоли: `console.log(typeof openEmailVerificationModal)`

## 📈 Мониторинг в production

### Метрики для отслеживания:

```javascript
// В Google Analytics или другом сервисе отслеживания:

// Событие: Пользователь начал регистрацию
gtag('event', 'registration_start', {
    timestamp: new Date()
});

// Событие: Пользователь получил код верификации
gtag('event', 'verification_code_sent', {
    email: userEmail,
    timestamp: new Date()
});

// Событие: Пользователь успешно верифицировал email
gtag('event', 'email_verified', {
    email: userEmail,
    attempts: attemptCount,
    timestamp: new Date()
});

// Событие: Ошибка верификации
gtag('event', 'verification_error', {
    error_type: 'expired_code' | 'invalid_code' | 'too_many_attempts',
    timestamp: new Date()
});
```

## 🔒 Безопасность - Чеклист

- [ ] Все переменные окружения установлены в production
- [ ] EmailJS сервис авторизован и работает
- [ ] Firebase правила безопасности ограничивают доступ к `verificationCodes`
- [ ] CORS правила корректны
- [ ] Rate limiting установлен на backend функции
- [ ] Логирование включено для всех операций
- [ ] Коды не показываются в production логах
- [ ] SSL сертификат установлен на доменом

## 🚀 Production Deploy Checklist

### Перед деплоем на production:

```bash
# 1. Убедитесь, что все переменные окружения установлены
echo "EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY установлены?"

# 2. Установите NODE_ENV
echo "NODE_ENV=production"

# 3. Протестируйте локально
npm run dev

# 4. Проверьте логи в production
# Netlify → Functions → Logs → send-email

# 5. Проверьте Firestore правила безопасности
firestore rules check

# 6. Установите rate limiting (опционально)
# На уровне API Gateway или Netlify функций
```

### Firestore правила безопасности

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Коды верификации - могут читать и писать только пользователи с правильным UID
    match /verificationCodes/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth.uid == userId && (resource.data.userId == userId || request.auth.uid == userId);
    }
    
    // Пользователи - могут читать и писать только свой профиль
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

## 📚 Полезные ссылки

- [Firebase Documentation](https://firebase.google.com/docs)
- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)

---

**Версия:** 1.0  
**Последнее обновление:** 5 января 2026
