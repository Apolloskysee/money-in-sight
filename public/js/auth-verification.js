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
    try {
        const codeInput = document.getElementById('verificationCode');
        if (!codeInput) throw new Error('Поле кода не найдено');

        const enteredCode = codeInput.value.trim();
        if (!enteredCode || enteredCode.length !== 6) {
            if (window.UI && window.UI.showNotification) {
                window.UI.showNotification('Пожалуйста, введите корректный 6-значный код', 'error');
            }
            return;
        }

        const userId = window._registrationState?.userId;
        if (!userId) throw new Error('User ID не найден');

        const { db } = window.firebaseApp.getFirebaseServices();
        
        // Get the stored code from Firestore
        const codeDoc = await db.collection('verificationCodes').doc(userId).get();
        
        if (!codeDoc.exists) {
            throw new Error('Код подтверждения не найден. Попробуйте переотправить код.');
        }

        const codeData = codeDoc.data();
        
        // Check if code is expired
        if (new Date(codeData.expiresAt) < new Date()) {
            // Delete expired code
            await db.collection('verificationCodes').doc(userId).delete();
            throw new Error('Код подтверждения истёк. Запросите новый код.');
        }

        // Check if code matches
        if (codeData.code !== enteredCode) {
            // Increment failed attempts
            const newAttempts = (codeData.attempts || 0) + 1;
            if (newAttempts >= 3) {
                await db.collection('verificationCodes').doc(userId).delete();
                if (window.UI && window.UI.showNotification) {
                    window.UI.showNotification('Превышено максимальное число попыток. Перейдите назад и запросите новый код.', 'error');
                }
                throw new Error('Превышено максимальное число попыток. Перейдите назад и запросите новый код.');
            }
            
            await db.collection('verificationCodes').doc(userId).update({
                attempts: newAttempts
            });
            
            const attemptsLeft = 3 - newAttempts;
            const errorMessage = `Неверный код. Попыток осталось: ${attemptsLeft}`;
            if (window.UI && window.UI.showNotification) {
                window.UI.showNotification(errorMessage, 'error');
            }
            throw new Error(errorMessage);
        }

        // Code is correct! Mark email as verified
        const auth = window.firebaseApp.getFirebaseServices().auth;
        
        // Проверяем Firebase перед использованием
        if (!window.firebase || !window.firebase.firestore) {
            throw new Error('Firebase Firestore не инициализирован');
        }
        
        // Update user in Firestore
        await db.collection('users').doc(userId).update({
            emailVerified: true,
            verificationStatus: 'verified',
            verifiedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });

        // Delete the code
        await db.collection('verificationCodes').doc(userId).delete();

        // Close modal
        closeEmailVerificationModal();
        
        if (window.UI && window.UI.showNotification) {
            window.UI.showNotification('Email успешно подтвержден! Добро пожаловать!', 'success');
        }

        // The user should already be signed in via auth.currentUser
        // Just update the profile and show the app
        const user = auth.currentUser;
        if (user) {
            try {
                await window.Auth.updateUserProfile(user);
                if (typeof showApp === 'function') showApp();
                
                // Load app data
                if (window.UI && typeof window.UI.loadDashboardData === 'function') {
                    try { await window.UI.loadDashboardData(); } catch (e) { console.error('Ошибка загрузки дашборда', e); }
                }
                if (window.UI && typeof window.UI.loadProfileData === 'function') {
                    try { await window.UI.loadProfileData(); } catch (e) { console.error('Ошибка загрузки профиля', e); }
                }
            } catch (err) {
                console.error('Ошибка обновления профиля:', err);
            }
        }

    } catch (error) {
        console.error('Ошибка проверки кода:', error);
        if (window.UI && window.UI.showNotification) {
            window.UI.showNotification(error.message || 'Ошибка проверки кода', 'error');
        }
    }
}

// export for global usage
window.openEmailVerificationModal = openEmailVerificationModal;
window.closeEmailVerificationModal = closeEmailVerificationModal;
window.resendVerificationCode = resendVerificationCode;
window.goBackToRegistration = goBackToRegistration;
window.handleVerificationSubmit = handleVerificationSubmit;

console.log('✅ Email verification helpers loaded');
