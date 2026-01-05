// auth-verification.js - email verification helpers

let verificationCountdownInterval = null;
let verificationCountdown = 60;

function openEmailVerificationModal(email) {
    const modal = document.getElementById('emailVerificationModal');
    if (!modal) return;

    const emailEl = document.getElementById('verificationEmail');
    if (emailEl) emailEl.textContent = email || '';

    // show modal
    modal.style.display = 'block';

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

async function resendVerificationCode() {
    try {
        const services = window.firebaseApp.getFirebaseServices();
        const auth = services.auth;
        const user = auth.currentUser;
        if (!user) throw new Error('Пользователь не найден');

        await user.sendEmailVerification();
        if (window.UI && window.UI.showNotification) window.UI.showNotification('Письмо с подтверждением отправлено', 'success');

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
        console.error('Ошибка отправки письма подтверждения:', error);
        if (window.UI && window.UI.showNotification) window.UI.showNotification('Не удалось отправить письмо подтверждения', 'error');
    }
}

async function handleVerificationSubmit(e) {
    e.preventDefault();
    try {
        const services = window.firebaseApp.getFirebaseServices();
        const auth = services.auth;
        let user = auth.currentUser;
        if (!user) {
            throw new Error('Пользователь не найден');
        }

        // reload user to get latest emailVerified flag
        await user.reload();
        user = auth.currentUser;

        if (user.emailVerified) {
            // close modal, update UI and load app
            closeEmailVerificationModal();
            if (window.UI && typeof window.UI.loadDashboardData === 'function') {
                try { await window.UI.loadDashboardData(); } catch (e) { console.error('Ошибка загрузки дашборда после подтверждения', e); }
            }
            if (window.Auth && typeof window.Auth.updateUserProfile === 'function') {
                try { await window.Auth.updateUserProfile(user); } catch (e) { console.error('Ошибка обновления профиля после подтверждения', e); }
            }
            if (window.UI && window.UI.showNotification) window.UI.showNotification('Email подтверждён. Добро пожаловать!', 'success');
            if (typeof showApp === 'function') showApp();
        } else {
            if (window.UI && window.UI.showNotification) window.UI.showNotification('Email ещё не подтверждён. Проверьте письмо и нажмите ссылку.', 'error');
        }
    } catch (error) {
        console.error('Ошибка в проверке подтверждения email:', error);
        if (window.UI && window.UI.showNotification) window.UI.showNotification('Ошибка проверки подтверждения', 'error');
    }
}

// export for global usage
window.openEmailVerificationModal = openEmailVerificationModal;
window.closeEmailVerificationModal = closeEmailVerificationModal;
window.resendVerificationCode = resendVerificationCode;

console.log('✅ Email verification helpers loaded');
