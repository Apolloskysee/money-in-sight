// auth.js - Аутентификация пользователей
console.log('🔐 Загрузка модуля аутентификации...');

let currentUser = null;

// Инициализация аутентификации
async function initializeAuth() {
    try {
        const services = await window.firebaseApp.initializeFirebase();
        if (!services) throw new Error('Firebase не инициализирован');
        
        const { auth } = services;
        
        // Слушатель изменения состояния аутентификации
        auth.onAuthStateChanged(async (user) => {
            currentUser = user;
            
            if (user) {
                console.log('👤 Пользователь вошел:', user.email);
                await updateUserProfile(user);
                showApp();
            } else {
                console.log('🚪 Пользователь вышел');
                showWelcome();
            }
        });
        
        console.log('✅ Аутентификация инициализирована');
        return auth;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации аутентификации:', error);
        throw error;
    }
}

// Регистрация нового пользователя
async function registerUser(name, email, password) {
    try {
        const { auth, db } = window.firebaseApp.getFirebaseServices();
        
        console.log('✨ Регистрация пользователя:', email);
        
        // Создаем пользователя в Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Обновляем имя пользователя
        await user.updateProfile({
            displayName: name
        });
        
        // Создаем запись в Firestore
        if (!window.firebase || !window.firebase.firestore) {
            throw new Error('Firebase Firestore не инициализирован');
        }
        
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            name: name,
            email: email,
            emailVerified: false,
            subscription: 'free',
            subscriptionActive: false,
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Отправляем email для верификации
        await user.sendEmailVerification();
        
        console.log('✅ Пользователь зарегистрирован:', user.uid);
        return { success: true, user };
        
    } catch (error) {
        console.error('❌ Ошибка регистрации:', error);
        throw handleAuthError(error);
    }
}

// Вход пользователя
async function loginUser(email, password) {
    try {
        const { auth, db } = window.firebaseApp.getFirebaseServices();
        
        console.log('🔐 Вход пользователя:', email);
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Обновляем время последнего входа
        if (!window.firebase || !window.firebase.firestore) {
            throw new Error('Firebase Firestore не инициализирован');
        }
        
        await db.collection('users').doc(user.uid).update({
            lastLogin: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Пользователь вошел:', user.uid);
        return { success: true, user };
        
    } catch (error) {
        console.error('❌ Ошибка входа:', error);
        throw handleAuthError(error);
    }
}

// Выход пользователя
async function logoutUser() {
    try {
        const { auth } = window.firebaseApp.getFirebaseServices();
        await auth.signOut();
        console.log('✅ Пользователь вышел');
        return { success: true };
    } catch (error) {
        console.error('❌ Ошибка выхода:', error);
        throw error;
    }
}

// Обновление профиля пользователя
async function updateUserProfile(user) {
    try {
        const { db } = window.firebaseApp.getFirebaseServices();
        
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            window.currentUserData = userData;
            
            // Обновляем интерфейс
            updateUIWithUserData(user, userData);
        } else {
            console.warn('⚠️ Профиль пользователя не найден в Firestore');
        }
    } catch (error) {
        console.error('❌ Ошибка обновления профиля:', error);
    }
}

// Обновление UI с данными пользователя
function updateUIWithUserData(user, userData) {
    // Обновляем хедер
    const userMenu = document.getElementById('userMenu');
    const headerActions = document.getElementById('headerActions');
    
    if (userMenu && headerActions) {
        userMenu.style.display = 'flex';
        headerActions.style.display = 'none';
        
        document.getElementById('userName').textContent = user.displayName || userData.name || 'Пользователь';
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('userAvatar').textContent = (user.displayName || user.email).charAt(0).toUpperCase();
    }
    
    // Обновляем профиль
    document.getElementById('profileName').textContent = user.displayName || userData.name || '-';
    document.getElementById('profileEmail').textContent = user.email || '-';
    document.getElementById('profileCreatedAt').textContent = userData.createdAt ? 
        new Date(userData.createdAt.toDate ? userData.createdAt.toDate() : userData.createdAt).toLocaleDateString('ru-RU') : 
        '-';
    
    // Обновляем статус подписки
    updateSubscriptionStatus(userData);
}

// Обновление статуса подписки
function updateSubscriptionStatus(userData) {
    const subscriptionStatus = document.getElementById('profileSubscriptionStatus');
    const subscriptionStatusMain = document.getElementById('subscriptionStatus');
    
    if (!userData.subscription) return;
    
    const statusHtml = `
        <div class="subscription-info">
            <h4>Текущий план: <span class="subscription-badge ${userData.subscription}">
                ${userData.subscription === 'premium' ? 'Премиум' : 'Бесплатный'}
            </span></h4>
            ${userData.subscription === 'trial' ? 
                `<p>Пробный период до: ${new Date(userData.trialEndDate).toLocaleDateString('ru-RU')}</p>` : 
                ''}
            ${userData.subscription === 'premium' ? 
                `<p>Премиум подписка активна</p>` : 
                ''}
        </div>
    `;
    
    if (subscriptionStatus) subscriptionStatus.innerHTML = statusHtml;
    if (subscriptionStatusMain) subscriptionStatusMain.innerHTML = statusHtml;
}

// Обработка ошибок аутентификации
function handleAuthError(error) {
    let message = 'Произошла ошибка';
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'Пользователь с таким email уже зарегистрирован';
            break;
        case 'auth/invalid-email':
            message = 'Неверный формат email';
            break;
        case 'auth/weak-password':
            message = 'Пароль должен содержать минимум 6 символов';
            break;
        case 'auth/user-not-found':
            message = 'Пользователь не найден';
            break;
        case 'auth/wrong-password':
            message = 'Неверный пароль';
            break;
        case 'auth/network-request-failed':
            message = 'Ошибка сети. Проверьте подключение к интернету';
            break;
        case 'auth/too-many-requests':
            message = 'Слишком много попыток. Попробуйте позже';
            break;
        default:
            message = error.message || 'Произошла неизвестная ошибка';
    }
    
    return new Error(message);
}

// Показать приложение (после входа)
function showApp() {
    document.getElementById('welcomePage').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
}

// Показать стартовую страницу (до входа)
function showWelcome() {
    document.getElementById('welcomePage').style.display = 'block';
    document.getElementById('appContainer').style.display = 'none';
    
    const userMenu = document.getElementById('userMenu');
    const headerActions = document.getElementById('headerActions');
    
    if (userMenu && headerActions) {
        userMenu.style.display = 'none';
        headerActions.style.display = 'flex';
    }
}

// Экспорт функций
window.Auth = {
    initializeAuth,
    registerUser,
    loginUser,
    logoutUser,
    updateUserProfile,
    getCurrentUser: () => currentUser
};