# Money in Sight - Умный контроль финансов

Полнофункциональное веб-приложение для управления личными финансами с поддержкой премиум подписки.

## 🚀 Развертывание на Netlify

### Шаг 1: Подготовка репозитория

```bash
# Инициализируем Git (если еще не сделано)
git init

# Добавляем файлы
git add .

# Коммитим
git commit -m "Initial commit"
```

### Шаг 2: Создание репозитория на GitHub

1. Создайте новый репозиторий на [GitHub](https://github.com/new)
2. Следуйте инструкциям для добавления удаленного репозитория:

```bash
git remote add origin https://github.com/ваш-username/money-in-sight.git
git branch -M main
git push -u origin main
```

### Шаг 3: Развертывание на Netlify

1. Перейдите на [Netlify](https://app.netlify.com)
2. Нажмите "New site from Git"
3. Выберите GitHub и авторизуйтесь
4. Выберите репозиторий `money-in-sight`
5. Netlify автоматически обнаружит `netlify.toml`
6. **Важно**: Перейдите в Settings → Build & Deploy → Environment variables
7. Все переменные окружения уже установлены в `netlify.toml`
8. Нажмите "Deploy"

## 🔑 Требуемые ключи и их получение

### Firebase
1. Перейдите на [Firebase Console](https://console.firebase.google.com)
2. Создайте новый проект или используйте существующий
3. В Settings → Project Settings найдите ваши ключи
4. Скопируйте значения в `netlify.toml`

### YooMoney (ЮKassa)
1. Создайте аккаунт на [YooMoney](https://yookassa.ru)
2. Добавьте магазин
3. В Settings найдите:
   - Shop ID (Идентификатор магазина)
   - Secret Key (Секретный ключ)
4. Скопируйте значения в `netlify.toml`

### EmailJS
1. Создайте аккаунт на [EmailJS](https://www.emailjs.com)
2. Создайте Email Service (Gmail, Outlook и т.д.)
3. Создайте Email Template
4. В Dashboard найдите:
   - Public Key
   - Service ID
   - Template ID
5. Скопируйте значения в `netlify.toml`

## 📋 Структура проекта

```
money-in-sight/
├── public/
│   ├── index.html          # Главная страница
│   ├── css/
│   │   └── style.css       # Стили
│   └── js/
│       ├── app.js          # Инициализация приложения
│       ├── auth.js         # Аутентификация
│       ├── data.js         # Работа с данными
│       ├── payments.js     # Система платежей
│       ├── firebase.js     # Конфигурация Firebase
│       └── ui.js           # Управление интерфейсом
├── netlify/
│   └── functions/
│       ├── create-payment.js      # Создание платежа
│       ├── check-payment.js       # Проверка статуса платежа
│       ├── send-email.js          # Отправка email
│       ├── register.js            # Регистрация (серверная часть)
│       ├── firebase-config.js     # Конфигурация Firebase
│       └── yookassa-webhook.js    # Вебхук YooMoney
├── netlify.toml            # Конфигурация Netlify
├── package.json            # Зависимости Node.js
└── README.md              # Этот файл
```

## 🔐 Безопасность

- ✅ Все чувствительные данные хранятся в переменных окружения
- ✅ Серверные функции используют Netlify Functions
- ✅ Используется Firebase Authentication для безопасности
- ✅ Все API запросы имеют CORS заголовки

## 🛠️ Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск dev сервера с Netlify Functions
npm run dev

# Приложение будет доступно на http://localhost:8888
```

## 📱 Функциональность

- ✅ Регистрация и вход пользователей
- ✅ Управление транзакциями
- ✅ Финансовые цели
- ✅ Аналитика расходов
- ✅ Управление долгами
- ✅ Система задач
- ✅ Премиум подписка с платежами
- ✅ Email верификация

## 🚨 Важные замечания

1. **Демо-режим**: Если переменные окружения не установлены, приложение работает в демо-режиме
2. **Вебхуки**: Убедитесь, что YooMoney настроен на отправку вебхуков на:
   ```
   https://ваш-домен.netlify.app/.netlify/functions/yookassa-webhook
   ```
3. **CORS**: Все функции настроены на работу с фронтенд-приложением

## 📞 Поддержка

Если возникают проблемы:
1. Проверьте логи в Netlify Dashboard
2. Убедитесь, что все переменные окружения установлены
3. Проверьте консоль браузера (F12) на наличие ошибок

## 📄 Лицензия

MIT License
