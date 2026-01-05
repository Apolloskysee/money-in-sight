// payments.js - Обработка платежей
console.log('💳 Загрузка модуля платежей...');

// Объявление функции заранее
async function updateSubscriptionToPremium() {
    try {
        const user = window.Auth.getCurrentUser();
        if (!user) {
            console.error('❌ Пользователь не найден при обновлении подписки');
            return;
        }
        
        const { db } = window.firebaseApp.getFirebaseServices();
        if (!db) {
            throw new Error('База данных не инициализирована');
        }
        
        // Проверяем, инициализирован ли Firebase
        if (!window.firebase || !window.firebase.firestore) {
            throw new Error('Firebase Firestore не инициализирован');
        }
        
        await db.collection('users').doc(user.uid).update({
            subscription: 'premium',
            subscriptionActive: true,
            trialEndDate: null,
            lastPaymentDate: new Date().toISOString(),
            premiumSince: window.firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Подписка обновлена до премиум');
        
        // Обновляем UI
        if (window.Auth && window.Auth.updateUserProfile) {
            window.Auth.updateUserProfile(user);
        }
        
        if (window.UI && window.UI.showNotification) {
            window.UI.showNotification('Премиум подписка активирована!', 'success');
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('❌ Ошибка обновления подписки:', error);
        
        if (window.UI && window.UI.showNotification) {
            window.UI.showNotification('Ошибка обновления подписки: ' + error.message, 'error');
        }
        
        throw error;
    }
}

// Инициализация платежной системы
async function initializePayments() {
    console.log('🔧 Инициализация платежной системы...');
    
    // Проверяем наличие необходимых элементов
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.removeEventListener('submit', handlePaymentSubmit);
        paymentForm.addEventListener('submit', handlePaymentSubmit);
        console.log('✅ Форма оплаты инициализирована');
    }
    
    // Устанавливаем только YooMoney
    const selectedMethod = document.getElementById('selectedPaymentMethod');
    if (selectedMethod) {
        selectedMethod.value = 'yoomoney';
    }
}

// Выбор метода оплаты (скрыто, используется только YooMoney)
function selectPaymentMethod(method) {
    console.log('💳 Выбранный метод оплаты:', method);
    
    const hiddenInput = document.getElementById('selectedPaymentMethod');
    if (hiddenInput) {
        hiddenInput.value = method;
    }
}

// Открытие модального окна оплаты
function openPaymentModal() {
    console.log('💳 Открытие модального окна оплаты');
    
    const user = window.Auth?.getCurrentUser?.();
    if (!user) {
        console.warn('❌ Пользователь не авторизован');
        if (window.UI?.showNotification) {
            window.UI.showNotification('Для оформления подписки необходимо войти в систему', 'error');
        }
        if (window.UI?.openModal) {
            window.UI.openModal('loginModal');
        }
        return;
    }
    
    // Заполняем email пользователя
    const paymentEmail = document.getElementById('paymentEmail');
    if (paymentEmail && user.email) {
        paymentEmail.value = user.email;
    }
    
    if (window.UI?.openModal) {
        window.UI.openModal('paymentModal');
    }
}

// Обработка оплаты
async function handlePaymentSubmit(e) {
    console.log('💳 Начало обработки оплаты');
    
    if (e && e.preventDefault) {
        e.preventDefault();
    }
    
    const user = window.Auth?.getCurrentUser?.();
    if (!user) {
        console.error('❌ Пользователь не авторизован');
        if (window.UI?.showNotification) {
            window.UI.showNotification('Необходимо войти в систему', 'error');
        }
        return false;
    }
    
    const paymentEmailInput = document.getElementById('paymentEmail');
    const paymentMethodInput = document.getElementById('selectedPaymentMethod');
    const agreeTermsInput = document.getElementById('paymentAgree');
    
    if (!paymentEmailInput || !paymentMethodInput || !agreeTermsInput) {
        console.error('❌ Не найдены элементы формы оплаты');
        return false;
    }
    
    const paymentEmail = paymentEmailInput.value.trim();
        const paymentMethod = 'yoomoney'; // Только YooMoney
    
    if (!paymentEmail) {
        console.error('❌ Не указан email');
        if (window.UI?.showNotification) {
            window.UI.showNotification('Введите email для чека', 'error');
        }
        return false;
    }
    
    if (!agreeTerms) {
        console.error('❌ Не приняты условия');
        if (window.UI?.showNotification) {
            window.UI.showNotification('Необходимо согласие с условиями', 'error');
        }
        return false;
    }
    
    // Закрываем текущее модальное окно и открываем окно обработки
    if (window.UI?.closeModal) {
        window.UI.closeModal('paymentModal');
    }
    if (window.UI?.openModal) {
        window.UI.openModal('paymentProcessingModal');
    }
    
    try {
        // Проверка на локальную разработку
        const isLocal = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.protocol === 'file:' ||
                       !window.location.hostname;
        
        console.log('🌍 Режим разработки:', isLocal ? 'локальный' : 'продакшен');
        
        if (isLocal) {
            // Локальная разработка - эмуляция
            console.log('💳 Локальная разработка - эмулируем платеж');
            
            const demoTimeout = setTimeout(async () => {
                try {
                    if (window.UI?.closeModal) {
                        window.UI.closeModal('paymentProcessingModal');
                    }
                    if (window.UI?.openModal) {
                        window.UI.openModal('paymentSuccessModal');
                    }
                    
                    await updateSubscriptionToPremium();
                    
                    console.log('✅ Демо-платеж успешно обработан');
                    
                } catch (error) {
                    console.error('❌ Ошибка в демо-режиме:', error);
                    if (window.UI?.closeModal) {
                        window.UI.closeModal('paymentProcessingModal');
                    }
                    if (window.UI?.showNotification) {
                        window.UI.showNotification('Ошибка: ' + error.message, 'error');
                    }
                    if (window.UI?.openModal) {
                        window.UI.openModal('paymentModal');
                    }
                }
            }, 2000);
            
            // Сохраняем таймаут для возможности очистки
            window.demoPaymentTimeout = demoTimeout;
            
            return true;
        }
        
        // Продакшен - реальный запрос
        console.log('💳 Отправка запроса на создание платежа');
        
        const response = await fetch('/.netlify/functions/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email: paymentEmail,
                userId: user.uid,
                paymentMethod: paymentMethod,
                amount: 199,
                description: 'Премиум подписка Money in Sight - 1 месяц'
            })
        });
        
        console.log('📡 Ответ сервера:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Ошибка сервера:', errorText);
            throw new Error(`Ошибка сервера: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📦 Результат создания платежа:', result);
        
        if (!result.success) {
            throw new Error(result.error || result.message || 'Неизвестная ошибка при создании платежа');
        }
        
        if (result.confirmationUrl) {
            // Открываем страницу оплаты в новом окне
            console.log('🔗 Открываем страницу оплаты:', result.confirmationUrl);
            
            const paymentWindow = window.open(
                result.confirmationUrl, 
                '_blank', 
                'width=800,height=600,scrollbars=yes,resizable=yes'
            );
            
            if (!paymentWindow) {
                throw new Error('Браузер заблокировал всплывающее окно. Разрешите всплывающие окна для этого сайта или используйте встроенную форму оплаты.');
            }
            
            // Проверяем статус платежа каждые 3 секунды
            let checkInterval = null;
            let timeoutId = null;
            
            checkInterval = setInterval(async () => {
                try {
                    console.log('🔄 Проверка статуса платежа:', result.paymentId);
                    
                    const statusResponse = await fetch(`/.netlify/functions/check-payment?paymentId=${result.paymentId}`);
                    
                    if (!statusResponse.ok) {
                        console.log('Статус не готов, продолжаем проверку...');
                        return;
                    }
                    
                    const statusResult = await statusResponse.json();
                    console.log('📊 Статус платежа:', statusResult);
                    
                    if (statusResult.paid || statusResult.status === 'succeeded') {
                        console.log('✅ Платеж успешен!');
                        // Правильно очищаем интервал и таймаут
                        if (checkInterval) clearInterval(checkInterval);
                        if (timeoutId) clearTimeout(timeoutId);
                        
                        if (window.UI?.closeModal) {
                            window.UI.closeModal('paymentProcessingModal');
                        }
                        if (window.UI?.openModal) {
                            window.UI.openModal('paymentSuccessModal');
                        }
                        
                        await updateSubscriptionToPremium();
                        
                        // Закрываем окно оплаты
                        try {
                            paymentWindow.close();
                        } catch (e) {
                            console.log('Окно оплаты уже закрыто');
                        }
                    }
                } catch (error) {
                    console.error('Ошибка проверки платежа:', error);
                }
            }, 3000);
            
            // Останавливаем проверку через 5 минут
            timeoutId = setTimeout(() => {
                if (checkInterval) clearInterval(checkInterval);
                console.log('⏰ Проверка статуса платежа остановлена (таймаут)');
            }, 300000);
            
        } else {
            // Если нет ссылки для подтверждения, считаем платеж успешным
            console.log('✅ Платеж создан без подтверждения, активируем подписку');
            
            if (window.UI?.closeModal) {
                window.UI.closeModal('paymentProcessingModal');
            }
            if (window.UI?.openModal) {
                window.UI.openModal('paymentSuccessModal');
            }
            
            await updateSubscriptionToPremium();
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка оплаты:', error);
        
        if (window.UI?.closeModal) {
            window.UI.closeModal('paymentProcessingModal');
        }
        if (window.UI?.showNotification) {
            window.UI.showNotification(error.message || 'Ошибка оплаты. Попробуйте еще раз.', 'error');
        }
        if (window.UI?.openModal) {
            window.UI.openModal('paymentModal');
        }
        
        return false;
    }
}

// Экспорт функций
window.Payments = {
    initializePayments,
    selectPaymentMethod,
    openPaymentModal,
    handlePaymentSubmit,
    updateSubscriptionToPremium // Экспортируем для отладки
};

console.log('✅ Модуль платежей загружен');