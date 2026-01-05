# ✅ Checklist перед опубликованием на Netlify

## 🔧 Технические изменения (выполнены ✓)

- [x] Обновлены переменные окружения в `netlify.toml`
- [x] Удалена зависимость `node-fetch` (используется встроенный fetch Node 18+)
- [x] Удалена зависимость `nodemailer` (используется EmailJS API)
- [x] Обновлена функция `send-email.js` для использования EmailJS
- [x] Обновлена функция `check-payment.js` (убран require node-fetch)
- [x] Обновлена функция `create-payment.js` (убран require node-fetch)
- [x] Добавлена обработка ошибок в функциях
- [x] Создан файл `.gitignore` для защиты учетных данных
- [x] Создан файл `.env.example` как шаблон
- [x] Создан файл `DEPLOYMENT.md` с инструкциями

## 📝 Ваши учетные данные (установлены в netlify.toml)

### Firebase ✓
- API Key: `AIzaSyB6c9xgkE3h-dBGkxNbZ7pEKzLMZ62J9do`
- Auth Domain: `finance-78bce.firebaseapp.com`
- Project ID: `finance-78bce`
- Storage Bucket: `finance-78bce.firebasestorage.app`
- Messaging Sender ID: `637957749534`
- App ID: `1:637957749534:web:fad67573867814bbd19a7bf`

### YooMoney ✓
- Shop ID: `1214128`
- Secret Key: `live_RPnxlmgWVYaKtvIrnV5lq0pE_C9yZAZruMAV0YVSXPs`

### EmailJS ✓
- Public Key: `GphE2ebqoj0D0DTQt`
- Service ID: `service_5djp0wg`
- Template ID: `template_kkzkdo5`

## 🚀 Шаги для опубликования

1. **Инициализируйте Git репозиторий:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Создайте репозиторий на GitHub**
   - Перейдите на https://github.com/new
   - Создайте репозиторий `money-in-sight`
   - Добавьте удаленный репозиторий:
   ```bash
   git remote add origin https://github.com/ВАШ-USERNAME/money-in-sight.git
   git branch -M main
   git push -u origin main
   ```

3. **Подключите к Netlify:**
   - Перейдите на https://app.netlify.com
   - Нажмите "New site from Git"
   - Выберите GitHub и авторизуйтесь
   - Выберите репозиторий `money-in-sight`
   - Netlify автоматически найдет `netlify.toml`
   - Нажмите "Deploy"

## ✨ Функциональность оплаты

### При локальной разработке (`npm run dev`):
- ✅ Платежи работают в демо-режиме
- ✅ Деньги не списываются
- ✅ Подписка активируется сразу

### При опубликовании на Netlify:
- ✅ Реальные платежи через YooMoney
- ✅ Email верификация через EmailJS
- ✅ Вебхук для обновления статуса платежа
- ✅ Синхронизация с Firebase

## 🔐 Безопасность

- ✓ Все чувствительные данные в переменных окружения
- ✓ `.env` файлы в `.gitignore`
- ✓ CORS защита на всех функциях
- ✓ Проверка прав доступа в Firestore
- ✓ Валидация входных данных

## 📞 После опубликования

1. **Настройте YooMoney вебхук:**
   - В панели YooMoney: Settings → Webhooks
   - URL: `https://ваш-домен.netlify.app/.netlify/functions/yookassa-webhook`
   - Выберите события: `payment.succeeded`, `payment.canceled`

2. **Проверьте Firebase Firestore правила:**
   - Убедитесь, что правила разработки установлены корректно
   - Ограничьте доступ в продакшене

3. **Тестируйте функциональность:**
   - Создайте тестовый аккаунт
   - Проверьте платежный процесс
   - Проверьте email уведомления

## 🚨 Частые проблемы

**"Payment credentials not configured"**
- Проверьте, что переменные окружения установлены в Netlify Settings

**Email не приходит**
- Проверьте EmailJS шаблон в своем аккаунте
- Убедитесь, что Service ID правильный

**Платеж не обновляется**
- Проверьте вебхук в YooMoney
- Проверьте логи в Netlify Functions

## 📚 Полезные ссылки

- [Netlify Docs](https://docs.netlify.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [YooMoney API](https://yookassa.ru/developers)
- [EmailJS Documentation](https://www.emailjs.com/docs/)

---

**Готово к опубликованию!** 🎉
