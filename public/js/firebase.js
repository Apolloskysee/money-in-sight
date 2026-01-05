// firebase.js - Инициализация Firebase
console.log('🚀 Загрузка Firebase...');

let firebaseInitialized = false;
let auth = null;
let db = null;

// Конфигурация Firebase для локальной разработки
const LOCAL_FIREBASE_CONFIG = {
    apiKey: "AIzaSyB6c9xgkE3h-dBGkxNbZ7pEKzLMZ62J9do",
    authDomain: "finance-78bce.firebaseapp.com",
    projectId: "finance-78bce",
    storageBucket: "finance-78bce.firebasestorage.app",
    messagingSenderId: "637957749534",
    appId: "1:637957749534:web:fad67573867814bbd19a7bf"
};

// Проверка локального окружения
const IS_LOCAL = window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1' ||
                 window.location.protocol === 'file:';

// Инициализация Firebase
async function initializeFirebase() {
    if (firebaseInitialized) {
        console.log('✅ Firebase уже инициализирован');
        return { auth, db };
    }

    try {
        let firebaseConfig;
        
        // Для локальной разработки используем локальную конфигурацию
        if (IS_LOCAL) {
            console.log('🔧 Локальная разработка - используем локальный Firebase конфиг');
            firebaseConfig = LOCAL_FIREBASE_CONFIG;
        } else {
            // Для продакшена загружаем с Netlify функции
            console.log('🌐 Продакшен - загружаем Firebase конфиг');
            const response = await fetch('/.netlify/functions/firebase-config');
            if (!response.ok) {
                throw new Error('Не удалось загрузить конфигурацию Firebase');
            }
            firebaseConfig = await response.json();
        }

        // Проверка конфигурации
        if (!firebaseConfig.apiKey) {
            throw new Error('Некорректная конфигурация Firebase');
        }

        // Инициализация Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase App инициализирован');
        }

        // Получаем сервисы
        auth = firebase.auth();
        db = firebase.firestore();

        // Настройка для локальной разработки
        if (IS_LOCAL) {
            console.log('⚠️ Локальная разработка - данные будут сохранены в реальном Firebase');
            // Для локальной разработки можно использовать эмуляторы
            // Раскомментируйте при необходимости:
            // auth.useEmulator("http://localhost:9099");
            // db.useEmulator("localhost", 8080);
            // db.settings({ host: "localhost:8080", ssl: false });
        }

        firebaseInitialized = true;
        console.log('✅ Firebase успешно инициализирован');

        return { auth, db };

    } catch (error) {
        console.error('❌ Критическая ошибка инициализации Firebase:', error);
        
        // Показываем пользователю ошибку
        showError('Не удалось подключиться к системе. Пожалуйста, проверьте подключение к интернету и обновите страницу.');
        
        throw error;
    }
}

// Получение сервисов Firebase
function getFirebaseServices() {
    if (!firebaseInitialized) {
        throw new Error('Firebase не инициализирован');
    }
    return { auth, db };
}

// Показ ошибки
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #f56565;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 500px;
        text-align: center;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// Экспорт функций
window.firebaseApp = {
    initializeFirebase,
    getFirebaseServices,
    IS_LOCAL
};

// Автоматическая инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, инициализируем Firebase...');
    initializeFirebase().catch(error => {
        console.error('Не удалось инициализировать Firebase:', error);
    });
});