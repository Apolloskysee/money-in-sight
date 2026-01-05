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

                // Продолжаем сразу, без проверки emailVerified
                await updateUserProfile(user);
                showApp();

                // После входа загружаем данные приложения (дашборд, профиль и т.д.)
                if (window.UI && typeof window.UI.loadDashboardData === 'function') {
                    try { await window.UI.loadDashboardData(); } catch (e) { console.error('Ошибка загрузки дашборда после входа', e); }
                }
                if (window.UI && typeof window.UI.loadProfileData === 'function') {
                    try { await window.UI.loadProfileData(); } catch (e) { console.error('Ошибка загрузки профиля после входа', e); }
                }
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
        
        // Устанавливаем пробную подписку на 14 дней при регистрации
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);
        const firebase = window.firebase;

        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            name: name,
            email: email,
            emailVerified: false,
            subscription: 'trial',
            trialEndDate: trialEnd.toISOString(),
            subscriptionActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Генерируем код подтверждения (6 цифр)
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Сохраняем код в Firestore с временем истечения (10 минут)
        const codeExpiresAt = new Date();
        codeExpiresAt.setMinutes(codeExpiresAt.getMinutes() + 10);
        
        await db.collection('verificationCodes').doc(user.uid).set({
            code: verificationCode,
            email: email,
            userId: user.uid,
            expiresAt: codeExpiresAt.toISOString(),
            attempts: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Код подтверждения сгенерирован');
        
        // Отправляем код на почту через EmailJS
        try {
            const response = await fetch('/.netlify/functions/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to_email: email,
                    user_name: name,
                    verification_code: verificationCode,
                    type: 'registration'
                })
            });
            
            if (response.ok) {
                console.log('✅ Код отправлен на почту');
            } else {
                console.warn('⚠️ Ошибка отправки кода:', response.status);
            }
        } catch (emailError) {
            console.error('⚠️ Ошибка при отправке email:', emailError);
        }
        
        console.log('✅ Пользователь зарегистрирован:', user.uid);
        
        // Сохраняем userId для проверки кода позже
        window.registrationUserId = user.uid;
        window.registrationEmail = email;
        
        return { success: true, user, requiresVerification: true };
        
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
        
        const firebase = window.firebase;
        // Use set with merge to avoid "No document to update" when user doc doesn't exist
        await db.collection('users').doc(user.uid).set({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
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
        const firebase = window.firebase;

        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            window.currentUserData = userData;
            // Обновляем интерфейс
            updateUIWithUserData(user, userData);
        } else {
            console.warn('⚠️ Профиль пользователя не найден в Firestore — создаём запись');
            const newUserData = {
                uid: user.uid,
                name: user.displayName || '',
                email: user.email || '',
                emailVerified: !!user.emailVerified,
                subscription: 'free',
                subscriptionActive: false,
                createdAt: firebase && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
                lastLogin: firebase && firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
            };

            try {
                await userRef.set(newUserData, { merge: true });
                window.currentUserData = newUserData;
                updateUIWithUserData(user, newUserData);
            } catch (createErr) {
                console.error('❌ Не удалось создать профиль пользователя в Firestore:', createErr);
            }
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

    // Если был триал и он истек — переводим на free локально и пытаемся обновить Firestore
    if (userData.subscription === 'trial' && userData.trialEndDate) {
        try {
            const now = new Date();
            const end = new Date(userData.trialEndDate);
            if (end < now) {
                // Обновляем локально
                userData.subscription = 'free';
                userData.subscriptionActive = false;

                // Пытаемся обновить в Firestore, если есть доступ
                if (window.firebase && window.firebase.firestore && window.Auth && window.Auth.getCurrentUser) {
                    const user = window.Auth.getCurrentUser();
                    if (user) {
                        const { db } = window.firebaseApp.getFirebaseServices();
                        const firebase = window.firebase;
                        db.collection('users').doc(user.uid).update({
                            subscription: 'free',
                            subscriptionActive: false,
                            trialEndDate: null,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }).catch(err => console.warn('Не удалось обновить статус подписки в Firestore:', err));
                    }
                }
            }
        } catch (e) {
            console.warn('Ошибка при проверке окончания триала:', e);
        }
    }

    const statusHtml = `
        <div class="subscription-info">
            <h4>Текущий план: <span class="subscription-badge ${userData.subscription}">
                ${userData.subscription === 'premium' ? 'Премиум' : userData.subscription === 'trial' ? 'Пробный Премиум' : 'Бесплатный'}
            </span></h4>
            ${userData.subscription === 'trial' && userData.trialEndDate ? 
                `<p>Пробный период до: ${new Date(userData.trialEndDate).toLocaleDateString('ru-RU')}</p>` : 
                ''}
            ${userData.subscription === 'premium' ? 
                `<p>Премиум подписка активна</p>` : 
                ''}
        </div>
    `;

    if (subscriptionStatus) subscriptionStatus.innerHTML = statusHtml;
    if (subscriptionStatusMain) subscriptionStatusMain.innerHTML = statusHtml;

    // Обновляем кнопки на странице подписок
    try {
        const premiumBtn = document.querySelector('#subscription .plan-card.featured .btn-primary');
        const freeBtn = document.querySelector('#subscription .plan-card:not(.featured) .btn-outline');

        const isPremiumLike = userData.subscription === 'premium' || userData.subscription === 'trial';

        if (premiumBtn) {
            if (isPremiumLike) {
                premiumBtn.textContent = 'Текущий план';
                premiumBtn.disabled = true;
                premiumBtn.classList.remove('btn-primary');
                premiumBtn.classList.add('btn-outline');
                premiumBtn.onclick = null;
            } else {
                premiumBtn.textContent = 'Выбрать тариф';
                premiumBtn.disabled = false;
                premiumBtn.classList.remove('btn-outline');
                premiumBtn.classList.add('btn-primary');
                premiumBtn.onclick = window.Payments ? window.Payments.openPaymentModal : null;
            }
        }

        if (freeBtn) {
            if (!isPremiumLike) {
                freeBtn.textContent = 'Текущий план';
                freeBtn.disabled = true;
            } else {
                freeBtn.textContent = 'Перейти на бесплатный';
                freeBtn.disabled = false;
                freeBtn.onclick = () => {
                    // Переключение на free локально
                    if (window.Auth && window.Auth.getCurrentUser) {
                        const user = window.Auth.getCurrentUser();
                        if (user && window.firebase && window.firebase.firestore) {
                            const { db } = window.firebaseApp.getFirebaseServices();
                            const firebase = window.firebase;
                            db.collection('users').doc(user.uid).update({
                                subscription: 'free',
                                subscriptionActive: false,
                                trialEndDate: null,
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                            }).then(() => window.Auth.updateUserProfile(user)).catch(err => console.error(err));
                        }
                    }
                };
            }
        }
    } catch (e) {
        console.warn('Ошибка при обновлении кнопок подписок:', e);
    }
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