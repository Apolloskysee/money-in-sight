// js/modal-manager.js
window.ModalManager = {
    // Открыть модальное окно
    openModal: function(modalId) {
        this.closeAllModals();
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },
    
    // Закрыть модальное окно
    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        document.body.style.overflow = 'auto';
    },
    
    // Закрыть все модальные окна
    closeAllModals: function() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('active');
        });
        document.body.style.overflow = 'auto';
    },
    
    // Показать уведомление
    showNotification: function(message, type = 'info', duration = 4000) {
        // Удаляем старое уведомление
        const oldNotification = document.querySelector('.notification');
        if (oldNotification) oldNotification.remove();
        
        // Создаем новое
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            ${message}
            <button class="close-notification" onclick="this.parentElement.remove()">&times;</button>
        `;
        document.body.appendChild(notification);
        
        // Показываем с анимацией
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Автоматическое скрытие
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.remove('show');
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            }, duration);
        }
        
        return notification;
    }
};

// Глобальные функции для совместимости со старым кодом
window.openModal = function(modalId) {
    ModalManager.openModal(modalId);
};

window.closeModal = function(modalId) {
    ModalManager.closeModal(modalId);
};

// Закрытие по клику вне модального окна
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            ModalManager.closeAllModals();
        }
    });
};

// Закрытие по Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        ModalManager.closeAllModals();
    }
});

console.log('✅ ModalManager загружен');