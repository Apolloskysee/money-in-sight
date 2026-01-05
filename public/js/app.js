// app.js - Основное приложение
console.log('🚀 Money in Sight загружается...');

// Инициализация приложения
async function initializeApp() {
    try {
        console.log('🔧 Инициализация приложения...');
        
        // Инициализируем Firebase
        await window.firebaseApp.initializeFirebase();
        
        // Инициализируем аутентификацию
        await window.Auth.initializeAuth();
        
        // Инициализируем платежную систему
        await window.Payments.initializePayments();
        
        // Инициализируем UI
        window.UI.initializeUI();
        
        // Настраиваем глобальные обработчики
        setupGlobalHandlers();
        
        console.log('✅ Приложение успешно загружено');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки приложения:', error);
        showCriticalError('Не удалось загрузить приложение. Пожалуйста, обновите страницу.');
    }
}

// Настройка глобальных обработчиков
function setupGlobalHandlers() {
    // Обработчики для модальных окон документов
    document.querySelectorAll('a[onclick*="showTermsModal"]').forEach(link => {
        link.onclick = () => window.UI.openModal('termsModal');
    });
    
    document.querySelectorAll('a[onclick*="showPrivacyModal"]').forEach(link => {
        link.onclick = () => window.UI.openModal('privacyModal');
    });
    
    document.querySelectorAll('a[onclick*="showOfferModal"]').forEach(link => {
        link.onclick = () => window.UI.openModal('offerModal');
    });
    
    document.querySelectorAll('a[onclick*="showRefundModal"]').forEach(link => {
        link.onclick = () => window.UI.openModal('refundModal');
    });
    
    // Обработчик для выбора метода оплаты
    document.querySelectorAll('.payment-method').forEach(method => {
        const onclick = method.getAttribute('onclick');
        if (onclick && onclick.includes('selectPaymentMethod')) {
            const methodName = onclick.match(/'([^']+)'/)[1];
            method.onclick = () => window.Payments.selectPaymentMethod(methodName);
        }
    });
    
    // Обработчик для кнопки оплаты в подписке
    const payButton = document.querySelector('.btn-primary[onclick*="openPaymentModal"]');
    if (payButton) {
        payButton.onclick = window.Payments.openPaymentModal;
    }
}

// Показ критической ошибки
function showCriticalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
        text-align: center;
    `;
    
    errorDiv.innerHTML = `
        <h2 style="color: #f56565; margin-bottom: 20px;">❌ Ошибка загрузки</h2>
        <p style="margin-bottom: 30px; font-size: 18px;">${message}</p>
        <button onclick="location.reload()" 
                style="padding: 12px 24px; 
                       background: #667eea; 
                       color: white; 
                       border: none; 
                       border-radius: 8px; 
                       cursor: pointer; 
                       font-size: 16px;">
            Обновить страницу
        </button>
    `;
    
    document.body.appendChild(errorDiv);
}

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeApp);