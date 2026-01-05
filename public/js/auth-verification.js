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
        const email = window.registrationEmail;
        if (!email) throw new Error('Email не найден');

        // Generate new code and send
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const userId = window.registrationUserId;
        
        if (!userId) throw new Error('User ID не найден');

        const { db } = window.firebaseApp.getFirebaseServices();
        
        // Update code in Firestore
        const codeExpiresAt = new Date();
        codeExpiresAt.setMinutes(codeExpiresAt.getMinutes() + 10);
        
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

        const userId = window.registrationUserId;
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
            throw new Error('Код подтверждения истёк. Запросите новый код.');
        }

        // Check if code matches
        if (codeData.code !== enteredCode) {
            // Increment failed attempts
            const newAttempts = (codeData.attempts || 0) + 1;
            if (newAttempts >= 3) {
                await db.collection('verificationCodes').doc(userId).delete();
                throw new Error('Превышено максимальное число попыток. Перейдите назад и запросите новый код.');
            }
            
            await db.collection('verificationCodes').doc(userId).update({
                attempts: newAttempts
            });
            
            throw new Error(`Неверный код. Попыток осталось: ${3 - newAttempts}`);
        }

        // Code is correct! Mark email as verified
        const firebase = window.firebase;
        await db.collection('users').doc(userId).update({
            emailVerified: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Delete the code
        await db.collection('verificationCodes').doc(userId).delete();

        // Close modal
        closeEmailVerificationModal();
        
        if (window.UI && window.UI.showNotification) {
            window.UI.showNotification('Email успешно подтвержден! Приложение загружается...', 'success');
        }

        // Sign in the user and open app
        const { auth } = window.firebaseApp.getFirebaseServices();
        const user = auth.currentUser;
        if (user && window.Auth) {
            await window.Auth.updateUserProfile(user);
            if (typeof showApp === 'function') showApp();
            
            // Load app data
            if (window.UI && typeof window.UI.loadDashboardData === 'function') {
                try { await window.UI.loadDashboardData(); } catch (e) { console.error('Ошибка загрузки дашборда', e); }
            }
            if (window.UI && typeof window.UI.loadProfileData === 'function') {
                try { await window.UI.loadProfileData(); } catch (e) { console.error('Ошибка загрузки профиля', e); }
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
