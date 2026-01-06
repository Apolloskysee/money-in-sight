# Firestore Security Rules

## 📋 Правила для Money in Sight

Скопируйте эти правила в Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Позволить чтение и запись только авторизованным пользователям для своих данных
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    match /transactions/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }

    match /goals/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }

    match /tasks/{document=**} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }

    match /verificationCodes/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Deny access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 📝 Инструкции по установке:

1. Откройте [Firebase Console](https://console.firebase.google.com)
2. Перейдите в ваш проект
3. Выберите Firestore Database
4. Нажмите на вкладку "Rules"
5. Замените содержимое этими правилами
6. Нажмите "Publish"

## ⚠️ Важно:

- Эти правила позволяют каждому пользователю:
  - Читать и писать только свои данные
  - Создавать новые документы с собственным userId
  - Удалять свои документы

- При удалении аккаунта используется серверная функция `delete-user.js`, которая использует Admin SDK и имеет полный доступ
