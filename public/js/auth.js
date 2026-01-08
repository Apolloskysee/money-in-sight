// auth.js - Аутентификация пользователей
console.log('🔐 Загрузка модуля аутентификации...');

let currentUser = null;

// Инициализация аутентификации
async function initializeAuth() {
    try {
        const services = await window.firebaseApp.initializeFirebase();
        if (!services) throw new Error('Firebase не инициализирован');
        
        const { auth, db } = services;
        
        // Слушатель изменения состояния аутентификации
        auth.onAuthStateChanged(async (user) => {
            currentUser = user;

            if (user) {
                console.log('👤 Пользователь в системе:', user.email);

                try {
                    // Получаем данные пользователя из Firestore
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        
                        // Проверяем: требуется ли верификация email?
                        if (userData.emailVerified === false && !window._registrationState?.skipVerificationCheck) {
                            console.log('📧 Email требует верификации - показываем модаль верификации');
                            // Пользователь зарегистрирован, но email не верифицирован
                            // Показываем страницу приветствия, не приложение
                            showWelcome();
                            // Показываем модаль верификации
                            setTimeout(() => {
                                if (typeof openEmailVerificationModal === 'function') {
                                    openEmailVerificationModal(user.email);
                                }
                            }, 500);
                            return;
                        }
                        
                        // Email верифицирован или это не новая регистрация - показываем приложение
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
                        // Профиль не найден в Firestore - показываем приветствие
                        console.warn('⚠️ Профиль пользователя не найден в Firestore');
                        showWelcome();
                    }
                } catch (error) {
                    console.error('Ошибка проверки профиля:', error);
                    showWelcome();
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
// auth.js - Исправленная функция регистрации
async function registerUser(name, email, password) {
    const MAX_RETRIES = 3;
    let retryCount = 0;

    async function attemptRegistration() {
        try {
            const { auth, db } = window.firebaseApp.getFirebaseServices();
            
            console.log('✨ Регистрация пользователя:', email);
            
            // Создаем пользователя в Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('✅ Пользователь создан в Auth:', user.uid);
            
            // Обновляем имя пользователя
            await user.updateProfile({
                displayName: name
            });
            
            // Отправляем email verification от Firebase
            await user.sendEmailVerification();
            
            // Создаем запись в Firestore
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 14);

            await db.collection('users').doc(user.uid).set({
                uid: user.uid,
                name: name,
                email: email,
                emailVerified: false,
                subscription: 'trial',
                trialEndDate: trialEnd.toISOString(),
                subscriptionActive: true,
                profileComplete: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastLogin: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Генерируем наш код для письма
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const codeExpiresAt = new Date();
            codeExpiresAt.setMinutes(codeExpiresAt.getMinutes() + 10);

            // Сохраняем код в Firestore
            await db.collection('verificationCodes').doc(user.uid).set({
                code: verificationCode,
                email: email,
                userId: user.uid,
                expiresAt: codeExpiresAt.toISOString(),
                attempts: 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Отправляем код на email
            const emailResponse = await fetch('/.netlify/functions/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to_email: email,
                    user_name: name,
                    verification_code: verificationCode,
                    user_id: user.uid,
                    expires_at: codeExpiresAt.toISOString(),
                    type: 'registration'
                })
            });

            if (!emailResponse.ok) {
                console.error('⚠️ Ошибка отправки письма');
            }
            
            // Сохраняем состояние для верификации
            window._registrationState = {
                userId: user.uid,
                email: email,
                user: user
            };
            
            return { 
                success: true, 
                user,
                requiresVerification: true 
            };

        } catch (error) {
            console.error('❌ Ошибка регистрации:', error);
            throw handleAuthError(error);
        }
    }
    
    return attemptRegistration();
}

// Вход пользователя
async function loginUser(email, password) {
    try {
        const { auth, db } = window.firebaseApp.getFirebaseServices();
        
        console.log('🔐 Попытка входа:', email);
        
        // Проверяем регистрацию в процессе
        if (window._registrationState && window._registrationState.inProgress) {
            throw new Error('Регистрация в процессе, попробуйте позже');
        }
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Обновляем время последнего входа
        if (!window.firebase || !window.firebase.firestore) {
            throw new Error('Firebase Firestore не инициализирован');
        }
        
        const firebase = window.firebase;
        // Use set with merge to avoid "No document to update" when user doc doesn't exist
        await db.collection('users').doc(user.uid).set({
            lastLogin: window.firebase && window.firebase.firestore
                ? window.firebase.firestore.FieldValue.serverTimestamp()
                : null
        }, { merge: true });
        
        console.log('✅ Пользователь вошел:', user.uid);
        
        // ВАЖНО: Дождаться загрузки данных и инициализации UI перед возвратом
        // Это предотвращает показ пустого приложения
        try {
            // Даем время Firebase слушателю на обработку состояния
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Дождаемся загрузки данных если функции доступны
            if (window.UI && typeof window.UI.loadDashboardData === 'function') {
                await window.UI.loadDashboardData();
            }
            if (window.UI && typeof window.UI.loadProfileData === 'function') {
                await window.UI.loadProfileData();
            }
            
            console.log('✅ Данные пользователя загружены');
        } catch (dataLoadErr) {
            console.warn('⚠️ Предупреждение при загрузке данных (некритичное):', dataLoadErr);
            // Продолжаем даже если загрузка данных не удалась
        }
        
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
                        db.collection('users').doc(user.uid).update({
                            subscription: 'free',
                            subscriptionActive: false,
                            trialEndDate: null,
                            updatedAt: window.firebase && window.firebase.firestore
                                ? window.firebase.firestore.FieldValue.serverTimestamp()
                                : null
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
                            db.collection('users').doc(user.uid).update({
                                subscription: 'free',
                                subscriptionActive: false,
                                trialEndDate: null,
                                updatedAt: window.firebase && window.firebase.firestore
                                    ? window.firebase.firestore.FieldValue.serverTimestamp()
                                    : null
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


async function handleRegistrationWithUI(name, email, password) {
    try {
        console.log('🚀 Начало регистрации с UI:', email);
        
        // Валидация
        if (!name || !email || !password) {
            throw new Error('Заполните все поля');
        }
        
        if (password.length < 6) {
            throw new Error('Пароль должен содержать минимум 6 символов');
        }
        
        // Кнопка загрузки
        const submitBtn = document.querySelector('#registerForm button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : 'Начать 14 дней бесплатно';
        
        if (submitBtn) {
            submitBtn.innerHTML = '<div class="spinner"></div> Регистрация...';
            submitBtn.disabled = true;
        }
        
        const result = await registerUser(name, email, password);
        
        if (result.success && result.requiresVerification) {
            // Закрываем окно регистрации
            ModalManager.closeModal('registerModal');
            
            // Показываем окно верификации
            setTimeout(() => {
                if (typeof openEmailVerificationModal === 'function') {
                    openEmailVerificationModal(email);
                }
                ModalManager.showNotification('Код подтверждения отправлен на ваш email', 'success');
            }, 500);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка регистрации с UI:', error);
        ModalManager.showNotification(error.message, 'error');
        throw error;
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = document.querySelector('#registerForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Начать 14 дней бесплатно';
            submitBtn.disabled = false;
        }
    }
}


// Функция для очистки неподтвержденных пользователей
async function cleanupUnverifiedUsers() {
    try {
        const { auth, db } = window.firebaseApp.getFirebaseServices();
        const admin = require('firebase-admin');
        
        console.log('🧹 Начинаем очистку неподтвержденных пользователей...');
        
        // 1. Получаем текущего пользователя (если есть)
        const currentUser = auth.currentUser;
        
        // 2. Получаем всех пользователей из Firestore
        const usersSnapshot = await db.collection('users').get();
        
        let deletedCount = 0;
        let keptCount = 0;
        
        // 3. Проверяем каждого пользователя
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;
            
            // Если email не подтвержден и прошло более 24 часов
            if (userData.emailVerified === false) {
                const createdAt = userData.createdAt;
                const now = new Date();
                const hoursDiff = createdAt ? 
                    (now - (createdAt.toDate ? createdAt.toDate() : new Date(createdAt))) / (1000 * 60 * 60) 
                    : 999; // Если нет даты создания, считаем старым
                
                if (hoursDiff > 24) {
                    try {
                        // Удаляем из Firestore
                        await db.collection('users').doc(userId).delete();
                        
                        // Удаляем код верификации
                        await db.collection('verificationCodes').doc(userId).delete()
                            .catch(() => console.log('Код верификации не найден'));
                        
                        // Удаляем из Firebase Auth (только для старых записей)
                        if (hoursDiff > 24 * 7) { // Старше недели
                            try {
                                await admin.auth().deleteUser(userId);
                                console.log(`🗑️ Удален пользователь ${userId} из Auth`);
                            } catch (authError) {
                                console.log(`⚠️ Не удалось удалить из Auth: ${userId}`);
                            }
                        }
                        
                        deletedCount++;
                        console.log(`🗑️ Удален неподтвержденный пользователь: ${userData.email} (${hoursDiff.toFixed(1)} часов)`);
                        
                    } catch (deleteError) {
                        console.error(`❌ Ошибка удаления пользователя ${userId}:`, deleteError);
                    }
                } else {
                    keptCount++;
                    console.log(`⏳ Оставляем пользователя ${userData.email} (${hoursDiff.toFixed(1)} часов)`);
                }
            } else {
                keptCount++;
            }
        }
        
        console.log(`✅ Очистка завершена. Удалено: ${deletedCount}, Оставлено: ${keptCount}`);
        
        return { deleted: deletedCount, kept: keptCount };
        
    } catch (error) {
        console.error('❌ Ошибка при очистке пользователей:', error);
        throw error;
    }
}

// Функция для массового удаления старых неподтвержденных пользователей
async function batchDeleteUnverifiedUsers() {
    try {
        const { db, auth } = window.firebaseApp.getFirebaseServices();
        const firebase = window.firebase;
        
        console.log('🚨 Начинаем массовое удаление старых неподтвержденных пользователей...');
        
        // Получаем всех пользователей с emailVerified = false
        const usersSnapshot = await db.collection('users')
            .where('emailVerified', '==', false)
            .get();
        
        console.log(`📊 Найдено ${usersSnapshot.size} неподтвержденных пользователей`);
        
        const batch = db.batch();
        let count = 0;
        
        usersSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            count++;
        });
        
        // Удаляем коды верификации для этих пользователей
        const codesSnapshot = await db.collection('verificationCodes').get();
        codesSnapshot.docs.forEach(doc => {
            const userId = doc.id;
            if (usersSnapshot.docs.find(u => u.id === userId)) {
                batch.delete(doc.ref);
            }
        });
        
        // Выполняем batch
        if (count > 0) {
            await batch.commit();
            console.log(`✅ Массово удалено ${count} неподтвержденных пользователей и их коды`);
            
            // Показываем уведомление
            if (window.UI && window.UI.showNotification) {
                window.UI.showNotification(`Удалено ${count} старых неподтвержденных пользователей`, 'info');
            }
        } else {
            console.log('✅ Неподтвержденных пользователей не найдено');
        }
        
        return { deleted: count };
        
    } catch (error) {
        console.error('❌ Ошибка массового удаления:', error);
        throw error;
    }
}


// Экспорт функций
window.Auth = {
    initializeAuth,
    registerUser,
    loginUser,
    logoutUser,
    updateUserProfile,
    getCurrentUser: () => currentUser,
    handleRegistrationWithUI
};