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
    const MAX_RETRIES = 3;
    let retryCount = 0;

    async function attemptRegistration() {
        try {
            const { auth, db } = window.firebaseApp.getFirebaseServices();
            
            console.log('✨ Регистрация пользователя:', email, `(попытка ${retryCount + 1}/${MAX_RETRIES})`);
            
            // Проверяем, существует ли пользователь с таким email
            try {
                await auth.fetchSignInMethodsForEmail(email);
            } catch (err) {
                if (err.code === 'auth/invalid-email') {
                    throw new Error('Некорректный формат email');
                }
            }
            
            // Создаем пользователя в Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('✅ Пользователь создан в Auth:', user.uid);
            
            // Обновляем имя пользователя
            try {
                await user.updateProfile({
                    displayName: name
                });
            } catch (profileErr) {
                console.warn('⚠️ Ошибка обновления профиля (некритичная):', profileErr);
            }
            
            // Создаем запись в Firestore
            if (!window.firebase || !window.firebase.firestore) {
                throw new Error('Firebase Firestore не инициализирован');
            }
            
            // Устанавливаем пробную подписку на 14 дней при регистрации
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 14);

            // Сохраняем профиль пользователя с retry logic
            let profileSaveRetries = 0;
            while (profileSaveRetries < 3) {
                try {
                    await db.collection('users').doc(user.uid).set({
                        uid: user.uid,
                        name: name,
                        email: email,
                        emailVerified: false,
                        subscription: 'trial',
                        trialEndDate: trialEnd.toISOString(),
                        subscriptionActive: true,
                        profileComplete: true,
                        createdAt: window.firebase && window.firebase.firestore
                            ? window.firebase.firestore.FieldValue.serverTimestamp()
                            : new Date().toISOString(),
                        lastLogin: window.firebase && window.firebase.firestore
                            ? window.firebase.firestore.FieldValue.serverTimestamp()
                            : new Date().toISOString()
                    });
                    console.log('✅ Профиль пользователя сохранен в Firestore');
                    break;
                } catch (firestoreError) {
                    profileSaveRetries++;
                    if (profileSaveRetries >= 3) {
                        throw new Error('Не удалось сохранить профиль пользователя: ' + firestoreError.message);
                    }
                    console.warn(`⚠️ Попытка ${profileSaveRetries} сохранения профиля не удалась, повторяем...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // Генерируем код подтверждения (6 цифр)
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Сохраняем код истечения на клиенте и отправляем запрос серверу для отправки email
            const codeExpiresAt = new Date();
            codeExpiresAt.setMinutes(codeExpiresAt.getMinutes() + 10);

            console.log('✅ Код подтверждения сгенерирован:', verificationCode);

            // Сохраняем код в Firestore
            try {
                await db.collection('verificationCodes').doc(user.uid).set({
                    code: verificationCode,
                    email: email,
                    userId: user.uid,
                    expiresAt: codeExpiresAt.toISOString(),
                    attempts: 0,
                    createdAt: window.firebase && window.firebase.firestore
                        ? window.firebase.firestore.FieldValue.serverTimestamp()
                        : new Date().toISOString()
                });
                console.log('✅ Код верификации сохранен в Firestore');
            } catch (firestoreError) {
                console.error('⚠️ Ошибка сохранения кода в Firestore:', firestoreError);
                throw new Error('Не удалось сохранить код верификации');
            }

            // Отправляем код и информацию на серверную функцию для отправки письма
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
                const errorText = await emailResponse.text();
                console.error('⚠️ Ошибка отправки кода на почту:', emailResponse.status, errorText);
                // Email отправка некритична - продолжаем процесс
            } else {
                console.log('✅ Код отправлен на почту');
            }
            
            console.log('✅ Пользователь успешно зарегистрирован:', user.uid);
            
            // Сохраняем userId с пространством имен для избежания конфликтов
            if (!window._registrationState) {
                window._registrationState = {};
            }
            window._registrationState.userId = user.uid;
            window._registrationState.email = email;
            
            return { success: true, user, requiresVerification: true };

        } catch (error) {
            console.error('❌ Ошибка регистрации (попытка ' + (retryCount + 1) + '):', error);
            
            // Retry logic для определенных типов ошибок
            if ((error.code === 'network-error' || error.code === 'auth/network-request-failed') && retryCount < MAX_RETRIES - 1) {
                retryCount++;
                console.log(`🔄 Повторная попытка регистрации через 2 сек...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return attemptRegistration();
            }
            
            throw handleAuthError(error);
        }
    }
    
    return attemptRegistration();
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
            lastLogin: window.firebase && window.firebase.firestore
                ? window.firebase.firestore.FieldValue.serverTimestamp()
                : null
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

// Экспорт функций
window.Auth = {
    initializeAuth,
    registerUser,
    loginUser,
    logoutUser,
    updateUserProfile,
    getCurrentUser: () => currentUser
};