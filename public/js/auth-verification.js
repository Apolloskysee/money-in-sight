// auth-verification.js - Registration code verification helpers

let verificationCountdownInterval = null;
let verificationCountdown = 60;

function openEmailVerificationModal(email) {
    const modal = document.getElementById('emailVerificationModal');
    if (!modal) return;

    const emailEl = document.getElementById('verificationEmail');
    if (emailEl) emailEl.textContent = email || '';

    // show modal
    modal.style.display = 'block';

    // Clear code input
    const codeInput = document.getElementById('verificationCode');
    if (codeInput) codeInput.value = '';

    // disable resend button and start countdown
    const resendBtn = document.getElementById('resendCodeBtn');
    const countdownEl = document.getElementById('countdown');
    if (resendBtn) resendBtn.disabled = true;
    verificationCountdown = 60;
    if (countdownEl) countdownEl.textContent = verificationCountdown;

    if (verificationCountdownInterval) clearInterval(verificationCountdownInterval);
    verificationCountdownInterval = setInterval(() => {
        verificationCountdown -= 1;
        if (countdownEl) countdownEl.textContent = verificationCountdown;
        if (verificationCountdown <= 0) {
            clearInterval(verificationCountdownInterval);
            if (resendBtn) resendBtn.disabled = false;
        }
    }, 1000);

    // Attach submit handler for verification form
    const form = document.getElementById('verificationForm');
    if (form) {
        form.removeEventListener('submit', handleVerificationSubmit);
        form.addEventListener('submit', handleVerificationSubmit);
    }
}

function closeEmailVerificationModal() {
    const modal = document.getElementById('emailVerificationModal');
    if (!modal) return;
    modal.style.display = 'none';
    if (verificationCountdownInterval) clearInterval(verificationCountdownInterval);
}

function goBackToRegistration() {
    closeEmailVerificationModal();
    // Clear registration form
    const regForm = document.getElementById('registerForm');
    if (regForm) regForm.reset();
    // Open registration modal
    if (window.UI && typeof window.UI.openModal === 'function') {
        window.UI.openModal('registerModal');
    }
}

async function resendVerificationCode() {
    try {
        const email = window._registrationState?.email;
        if (!email) throw new Error('Email не найден');

        // Generate new code and send
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const userId = window._registrationState?.userId;
        
        if (!userId) throw new Error('User ID не найден');

        const { db } = window.firebaseApp.getFirebaseServices();
        
        // Update code in Firestore
        const codeExpiresAt = new Date();
        codeExpiresAt.setMinutes(codeExpiresAt.getMinutes() + 10);
        
        // Проверяем Firebase перед использованием
        if (!window.firebase || !window.firebase.firestore) {
            throw new Error('Firebase Firestore не инициализирован');
        }
        
        await db.collection('verificationCodes').doc(userId).set({
            code: verificationCode,
            email: email,
            expiresAt: codeExpiresAt.toISOString(),
            attempts: 0,
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });

        // Send email
        const response = await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to_email: email,
                user_name: 'Пользователь',
                verification_code: verificationCode,
                type: 'registration'
            })
        });

        if (response.ok) {
            if (window.UI && window.UI.showNotification) {
                window.UI.showNotification('Код переотправлен на вашу почту', 'success');
            }
        }

        // restart countdown
        const resendBtn = document.getElementById('resendCodeBtn');
        const countdownEl = document.getElementById('countdown');
        if (resendBtn) resendBtn.disabled = true;
        verificationCountdown = 60;
        if (countdownEl) countdownEl.textContent = verificationCountdown;
        if (verificationCountdownInterval) clearInterval(verificationCountdownInterval);
        verificationCountdownInterval = setInterval(() => {
            verificationCountdown -= 1;
            if (countdownEl) countdownEl.textContent = verificationCountdown;
            if (verificationCountdown <= 0) {
                clearInterval(verificationCountdownInterval);
                if (resendBtn) resendBtn.disabled = false;
            }
        }, 1000);

    } catch (error) {
        console.error('Ошибка переотправки кода:', error);
        if (window.UI && window.UI.showNotification) {
            window.UI.showNotification('Не удалось переотправить код', 'error');
        }
    }
}

async function handleVerificationSubmit(e) {
    e.preventDefault();
    
    const codeInput = document.getElementById('verificationCode');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (!codeInput) return;
    
    const enteredCode = codeInput.value.trim();
    
    // Валидация кода
    if (!enteredCode || enteredCode.length !== 6 || !/^\d+$/.test(enteredCode)) {
        // Используем window.ModalManager вместо ModalManager
        if (window.ModalManager) {
            window.ModalManager.showNotification('Введите корректный 6-значный код', 'error');
        } else if (window.UI) {
            window.UI.showNotification('Введите корректный 6-значный код', 'error');
        }
        return;
    }
    
    // Сохраняем оригинальный текст кнопки
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="spinner"></div> Проверка...';
    submitBtn.disabled = true;
    
    try {
        const userId = window._registrationState?.userId;
        if (!userId) {
            throw new Error('Сессия истекла. Пожалуйста, зарегистрируйтесь снова.');
        }
        
        const { db, auth } = window.firebaseApp.getFirebaseServices();
        
        // Проверяем, что Firebase Firestore доступен
        if (!window.firebase || !window.firebase.firestore) {
            throw new Error('Firebase Firestore не инициализирован');
        }
        
        const firestore = window.firebase.firestore;
        
        // Получаем сохраненный код
        const codeDoc = await db.collection('verificationCodes').doc(userId).get();
        
        if (!codeDoc.exists) {
            throw new Error('Код не найден. Запросите новый код.');
        }
        
        const codeData = codeDoc.data();
        
        // Проверка срока действия
        if (new Date(codeData.expiresAt) < new Date()) {
            await codeDoc.ref.delete();
            throw new Error('Срок действия кода истек. Запросите новый код.');
        }
        
        // Проверка совпадения кода
        if (codeData.code !== enteredCode) {
            const newAttempts = (codeData.attempts || 0) + 1;
            
            if (newAttempts >= 5) {
                await codeDoc.ref.delete();
                throw new Error('Превышено максимальное количество попыток. Зарегистрируйтесь снова.');
            }
            
            await codeDoc.ref.update({ attempts: newAttempts });
            
            const attemptsLeft = 5 - newAttempts;
            throw new Error(`Неверный код. Осталось попыток: ${attemptsLeft}`);
        }
        
        // Код верный!
        // 1. Обновляем emailVerified в Firestore
        await db.collection('users').doc(userId).update({
            emailVerified: true,
            verifiedAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp()
        });
        
        // 2. Удаляем использованный код
        await codeDoc.ref.delete();
        
        // 3. Обновляем статус в Firebase Auth
        const user = auth.currentUser || window._registrationState?.user;
        if (user) {
            await user.reload();
        }
        
        // 4. Закрываем модальное окно
        closeEmailVerificationModal();
        
        // 5. Показываем успешное сообщение
        if (window.ModalManager) {
            window.ModalManager.showNotification('Email успешно подтвержден! Добро пожаловать!', 'success');
        } else if (window.UI) {
            window.UI.showNotification('Email успешно подтвержден! Добро пожаловать!', 'success');
        }
        
        // 6. Входим в систему автоматически
        if (window._registrationState?.email && window._registrationState?.password) {
            try {
                await auth.signInWithEmailAndPassword(
                    window._registrationState.email,
                    window._registrationState.password
                );
                console.log('✅ Автоматический вход выполнен');
            } catch (loginError) {
                console.log('⚠️ Автовход не удался:', loginError.message);
                // Не прерываем процесс, пользователь может войти вручную
            }
        }
        
        // 7. Показываем приложение
        setTimeout(() => {
            if (typeof showApp === 'function') showApp();
            
            // Загружаем данные пользователя
            if (window.UI && window.UI.loadDashboardData) {
                window.UI.loadDashboardData();
            }
            
            // Перенаправляем в дашборд
            window.location.hash = '#dashboard';
        }, 1000);
        
    } catch (error) {
        console.error('Ошибка верификации:', error);
        
        // Показываем ошибку
        if (window.ModalManager) {
            window.ModalManager.showNotification(error.message, 'error');
        } else if (window.UI) {
            window.UI.showNotification(error.message, 'error');
        }
        
        // Очищаем поле ввода при ошибке
        codeInput.value = '';
        codeInput.focus();
        
    } finally {
        // Восстанавливаем кнопку
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// export for global usage
window.openEmailVerificationModal = openEmailVerificationModal;
window.closeEmailVerificationModal = closeEmailVerificationModal;
window.resendVerificationCode = resendVerificationCode;
window.goBackToRegistration = goBackToRegistration;
window.handleVerificationSubmit = handleVerificationSubmit;

console.log('✅ Email verification helpers loaded');
