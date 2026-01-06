# Firestore Security Rules

## ⚠️ КРИТИЧНО: Эти правила ОБЯЗАТЕЛЬНО нужно установить!

Скопируйте эти правила в Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== USERS =====
    // Каждый пользователь может читать/писать только свой документ
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // ===== TRANSACTIONS =====
    // Чтение и запись только своих транзакций
    match /transactions/{document=**} {
      allow read: if request.auth.uid == resource.data.userId;
      allow write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }

    // ===== GOALS =====
    // Чтение и запись только своих целей
    match /goals/{document=**} {
      allow read: if request.auth.uid == resource.data.userId;
      allow write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }

    // ===== TASKS =====
    // Чтение и запись только своих задач
    match /tasks/{document=**} {
      allow read: if request.auth.uid == resource.data.userId;
      allow write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }

    // ===== VERIFICATION CODES =====
    // ВАЖНО: ID документа = userId пользователя!
    // Пользователь может писать/читать только свой код
    match /verificationCodes/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
      allow create: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId;
      allow delete: if request.auth.uid == userId;
    }

    // ===== DEFAULT DENY =====
    // Закрываем доступ по умолчанию
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 📝 Пошаговая инструкция по установке:

### 1️⃣ Откройте Firebase Console
- Перейдите на https://console.firebase.google.com
- Выберите ваш проект "finance-78bce"

### 2️⃣ Перейдите в Firestore Database
- В левом меню найдите "Build" → "Firestore Database"
- Если Firestore еще не создан, создайте его:
  - Нажмите "Create database"
  - Выберите регион (например, "us-central1")
  - Выберите режим: **"Start in production mode"**

### 3️⃣ Отредактируйте правила
- В Firestore кликните на вкладку **"Rules"**
- Удалите весь существующий текст
- **Скопируйте весь код сверху** (начиная с `rules_version = '2';`)
- **Вставьте в редактор правил**

### 4️⃣ Опубликуйте правила
- В правом верхнем углу нажмите синюю кнопку **"Publish"**
- Подождите 30 секунд, пока правила применятся
- Вы должны увидеть сообщение "Rules published successfully"

### 5️⃣ Проверьте
- В браузере перезагрузите приложение (Ctrl+F5)
- Попробуйте зарегистрироваться заново
- В консоли не должно быть ошибки "Missing or insufficient permissions"

## ⚠️ Что делают эти правила:

✅ **Позволяют пользователю:**
- Читать и писать свой документ в коллекции `users`
- Создавать, читать и писать свои транзакции, цели, задачи
- Создавать и читать свой код верификации

❌ **Запрещают:**
- Читать документы других пользователей
- Писать документы других пользователей  
- Получать доступ к коллекциям без авторизации

## 🔒 Безопасность

- Код верификации может писать только пользователь, который его создает (ID документа = userId)
- Все остальные коллекции защищены полем `userId`
- Admin SDK (серверные функции) всегда имеют полный доступ

## ✅ После установки правил

Приложение должно работать без ошибок:
- ✅ Регистрация → создание профиля в Firestore
- ✅ Сохранение кода верификации  
- ✅ Верификация email
- ✅ Вход в приложение
- ✅ Удаление аккаунта
