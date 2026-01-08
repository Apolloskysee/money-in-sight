// ui.js - Управление пользовательским интерфейсом
console.log('🎨 Загрузка модуля UI...');

// Инициализация UI
function initializeUI() {
    console.log('🔧 Инициализация UI...');
    
    // Настройка навигации
    setupNavigation();
    
    // Настройка модальных окон
    setupModals();
    
    // Настройка форм
    setupForms();
    
    // Настройка даты
    updateDate();
    
    console.log('✅ UI инициализирован');
}

// Настройка навигации
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            showPage(pageId);
        });
    });
}

// Показать страницу
function showPage(pageId) {
    console.log('📄 Переход на страницу:', pageId);
    
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Убираем активный класс у всех ссылок
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Показываем выбранную страницу
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Делаем ссылку активной
        const activeLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Загружаем данные страницы
        loadPageData(pageId);
    }
}

// Загрузка данных страницы
async function loadPageData(pageId) {
    try {
        switch (pageId) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'transactions':
                await loadTransactionsData();
                break;
            case 'analytics':
                await loadAnalyticsData();
                break;
            case 'goals':
                await loadGoalsData();
                break;
            case 'tasks':
                await loadTasksData();
                break;
            case 'profile':
                await loadProfileData();
                break;
        }
    } catch (error) {
        console.error(`❌ Ошибка загрузки данных для страницы ${pageId}:`, error);
    }
}

// Загрузка данных дашборда
async function loadDashboardData() {
    try {
        // Загружаем транзакции
        const transactions = await window.Data.getTransactions(10);
        displayTransactions(transactions);
        
        // Загружаем аналитику
        const analytics = await window.Data.getAnalytics('month');
        updateDashboardStats(analytics);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки дашборда:', error);
        showNotification('Не удалось загрузить данные дашборда', 'error');
    }
}

// Отображение транзакций
function displayTransactions(transactions) {
    const tbody = document.getElementById('allTransactions');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        const date = transaction.createdAt?.toDate 
            ? transaction.createdAt.toDate() 
            : new Date(transaction.createdAt);
        
        const amount = parseFloat(transaction.amount).toFixed(2);
        const isIncome = transaction.type === 'income';
        
        row.innerHTML = `
            <td>${date.toLocaleDateString('ru-RU')}</td>
            <td><span class="badge ${isIncome ? 'badge-success' : 'badge-danger'}">
                ${isIncome ? 'Доход' : 'Расход'}
            </span></td>
            <td>${transaction.description || '-'}</td>
            <td>${transaction.category || '-'}</td>
            <td class="${isIncome ? 'text-success' : 'text-danger'}">
                ${isIncome ? '+' : '-'}${amount} ₽
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editTransaction('${transaction.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline btn-danger" onclick="deleteTransaction('${transaction.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Обновление статистики дашборда
function updateDashboardStats(analytics) {
    document.getElementById('totalIncome').textContent = `${analytics.totalIncome.toFixed(2)} ₽`;
    document.getElementById('totalExpense').textContent = `${analytics.totalExpense.toFixed(2)} ₽`;
    document.getElementById('totalBalance').textContent = `${analytics.balance.toFixed(2)} ₽`;
}

// Загрузка данных транзакций
async function loadTransactionsData() {
    try {
        const transactions = await window.Data.getTransactions(100);
        displayAllTransactions(transactions);
    } catch (error) {
        console.error('❌ Ошибка загрузки транзакций:', error);
        showNotification('Не удалось загрузить транзакции', 'error');
    }
}

// Отображение всех транзакций
function displayAllTransactions(transactions) {
    const tbody = document.getElementById('transactionsTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        const date = transaction.createdAt?.toDate 
            ? transaction.createdAt.toDate() 
            : new Date(transaction.createdAt);
        
        const amount = parseFloat(transaction.amount).toFixed(2);
        const isIncome = transaction.type === 'income';
        
        row.innerHTML = `
            <td>${date.toLocaleDateString('ru-RU')}</td>
            <td><span class="badge ${isIncome ? 'badge-success' : 'badge-danger'}">
                ${isIncome ? 'Доход' : 'Расход'}
            </span></td>
            <td>${transaction.description || '-'}</td>
            <td>${transaction.category || '-'}</td>
            <td class="${isIncome ? 'text-success' : 'text-danger'}">
                ${isIncome ? '+' : '-'}${amount} ₽
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editTransaction('${transaction.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline btn-danger" onclick="deleteTransaction('${transaction.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Загрузка данных аналитики
async function loadAnalyticsData() {
    try {
        const analytics = await window.Data.getAnalytics('month');
        displayAnalytics(analytics);
    } catch (error) {
        console.error('❌ Ошибка загрузки аналитики:', error);
        showNotification('Не удалось загрузить аналитику', 'error');
    }
}

// Отображение аналитики
function displayAnalytics(analytics) {
    document.getElementById('totalExpensesAnalytics').textContent = `${analytics.totalExpense.toFixed(2)} ₽`;
    document.getElementById('totalIncomeAnalytics').textContent = `${analytics.totalIncome.toFixed(2)} ₽`;
    
    // Создаем диаграмму категорий
    createCategoryChart(analytics.categories);
}

// Создание диаграммы категорий
function createCategoryChart(categories) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    // ПРОВЕРЯЕМ, существует ли chart, и ТОЛЬКО ТОГДА вызываем destroy
    if (window.categoryChart && typeof window.categoryChart.destroy === 'function') {
        window.categoryChart.destroy();
    }
    
    const labels = categories.map(c => c.category);
    const data = categories.map(c => c.amount);
    const colors = [
        '#f56565', '#ed8936', '#ed64a6', '#48bb78', '#4299e1',
        '#9f7aea', '#a0aec0', '#718096', '#805ad5', '#d69e2e'
    ];
    
    window.categoryChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value.toFixed(2)} ₽ (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Загрузка данных целей
async function loadGoalsData() {
    try {
        const goals = await window.Data.getGoals();
        displayGoals(goals);
    } catch (error) {
        console.error('❌ Ошибка загрузки целей:', error);
        showNotification('Не удалось загрузить цели', 'error');
    }
}

// Отображение целей
function displayGoals(goals) {
    const tbody = document.getElementById('goalsTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    goals.forEach(goal => {
        const row = document.createElement('tr');
        
        const progress = Math.min(100, (goal.current / goal.target) * 100);
        const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
        
        row.innerHTML = `
            <td>${goal.title}</td>
            <td>${parseFloat(goal.target).toFixed(2)} ₽</td>
            <td>${parseFloat(goal.current).toFixed(2)} ₽</td>
            <td>
                <div class="progress">
                    <div class="progress-bar" style="width: ${progress}%">
                        ${Math.round(progress)}%
                    </div>
                </div>
            </td>
            <td>${targetDate ? targetDate.toLocaleDateString('ru-RU') : '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editGoal('${goal.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline btn-danger" onclick="deleteGoal('${goal.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Обновляем статистику целей
    document.getElementById('totalGoals').textContent = goals.length;
    document.getElementById('completedGoals').textContent = goals.filter(g => g.progress >= 100).length;
    document.getElementById('activeGoals').textContent = goals.filter(g => g.progress < 100).length;
}

// Загрузка данных задач
async function loadTasksData() {
    try {
        const tasks = await window.Data.getTasks();
        displayTasks(tasks);
    } catch (error) {
        console.error('❌ Ошибка загрузки задач:', error);
        showNotification('Не удалось загрузить задачи', 'error');
    }
}

// Отображение задач
function displayTasks(tasks) {
    const tbody = document.getElementById('tasksTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    tasks.forEach(task => {
        const row = document.createElement('tr');
        
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const priorityColors = {
            low: 'success',
            medium: 'warning',
            high: 'danger'
        };
        
        row.innerHTML = `
            <td>${task.title}</td>
            <td>${task.description || '-'}</td>
            <td><span class="badge badge-${priorityColors[task.priority || 'medium']}">
                ${task.priority === 'high' ? 'Высокий' : task.priority === 'low' ? 'Низкий' : 'Средний'}
            </span></td>
            <td>${dueDate ? dueDate.toLocaleDateString('ru-RU') : '-'}</td>
            <td><span class="badge ${task.completed ? 'badge-success' : 'badge-warning'}">
                ${task.completed ? 'Выполнено' : 'В процессе'}
            </span></td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="toggleTask('${task.id}', ${!task.completed})">
                    <i class="fas ${task.completed ? 'fa-redo' : 'fa-check'}"></i>
                </button>
                <button class="btn btn-sm btn-outline btn-danger" onclick="deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Загрузка данных профиля
async function loadProfileData() {
    // Данные профиля: перезагрузка статистики и транзакций
    console.log('📋 Загрузка данных профиля');
    try {
        // Перезапрашиваем дашборд-данные (баланс, транзакции, аналитика)
        await loadDashboardData();
    } catch (error) {
        console.error('❌ Ошибка загрузки данных профиля:', error);
    }
}

// Настройка модальных окон
function setupModals() {
    // Закрытие по клику на крестик
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal.id);
        });
    });
    
    // Закрытие по клику вне окна
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
}

// Открытие модального окна
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Инициализация форм в модальном окне
        initializeModalForms(modalId);
    }
}

// Закрытие модального окна
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Очистка форм
        resetModalForms(modalId);
    }
}

// Инициализация форм в модальном окне
function initializeModalForms(modalId) {
    switch (modalId) {
        case 'addTransactionModal':
            initializeTransactionForm();
            break;
        case 'addGoalModal':
            initializeGoalForm();
            break;
        case 'addTaskModal':
            initializeTaskForm();
            break;
    }
}

// Сброс форм модального окна
function resetModalForms(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const forms = modal.querySelectorAll('form');
        forms.forEach(form => form.reset());
    }
}

// Настройка форм


// Инициализация формы транзакции
function initializeTransactionForm() {
    const categorySelect = document.getElementById('transactionCategory');
    if (!categorySelect) return;
    
    categorySelect.innerHTML = '<option value="">Выберите категорию</option>';
    
    // Добавляем категории доходов
    const incomeGroup = document.createElement('optgroup');
    incomeGroup.label = 'Доходы';
    window.Data.CATEGORIES.income.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = `${category.icon} ${category.name}`;
        incomeGroup.appendChild(option);
    });
    categorySelect.appendChild(incomeGroup);
    
    // Добавляем категории расходов
    const expenseGroup = document.createElement('optgroup');
    expenseGroup.label = 'Расходы';
    window.Data.CATEGORIES.expense.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = `${category.icon} ${category.name}`;
        expenseGroup.appendChild(option);
    });
    categorySelect.appendChild(expenseGroup);
    
    // Устанавливаем текущую дату
    document.getElementById('transactionDate').valueAsDate = new Date();
}

// Инициализация формы цели
function initializeGoalForm() {
    // Устанавливаем дату цели (через месяц)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('goalDate').valueAsDate = nextMonth;
}

// Инициализация формы задачи
function initializeTaskForm() {
    // Устанавливаем дату выполнения (через неделю)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    document.getElementById('taskDueDate').valueAsDate = nextWeek;
}

// Обработка регистрации
async function handleRegisterSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    if (!validateRegistration(name, email, password, agreeTerms)) return;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
    submitBtn.disabled = true;
    
    try {
        console.log('📝 Начало процесса регистрации для:', email);
        
        const result = await window.Auth.registerUser(name, email, password);
        
        console.log('✅ Регистрация завершена, требуется верификация:', result.requiresVerification);
        
        if (result.requiresVerification) {
            // Закрываем модаль регистрации
            closeModal('registerModal');
            
            // Показываем сообщение о том, что отправлен код
            showNotification('✅ Код подтверждения отправлен на ' + email + '. Проверьте почту.', 'success');
            
            // Открываем модаль подтверждения кода с небольшой задержкой
            setTimeout(() => {
                console.log('📧 Открытие модали подтверждения кода');
                if (typeof openEmailVerificationModal === 'function') {
                    openEmailVerificationModal(email);
                } else {
                    console.error('❌ Функция openEmailVerificationModal не найдена');
                    showNotification('Ошибка: модаль верификации не загружена', 'error');
                }
            }, 500);
        } else {
            showNotification('Регистрация успешна! Добро пожаловать!', 'success');
            closeModal('registerModal');
        }
    } catch (error) {
        console.error('❌ Ошибка при регистрации:', error);
        showNotification(error.message || 'Ошибка регистрации', 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Обработка входа
async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
    submitBtn.disabled = true;
    
    try {
        // Дождаемся полной инициализации входа (включая загрузку данных)
        await window.Auth.loginUser(email, password);
        
        // Даем время Firebase слушателю обработать изменения и показать приложение
        await new Promise(resolve => setTimeout(resolve, 800));
        
        showNotification('Вход выполнен успешно', 'success');
        
        // Закрываем модаль только ПОСЛЕ того как приложение инициализировалось
        closeModal('loginModal');
        
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Обработка добавления транзакции
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('transactionType').value;
    const amount = parseFloat(document.getElementById('transactionAmount').value);
    const category = document.getElementById('transactionCategory').value;
    const description = document.getElementById('transactionDescription').value.trim();
    const date = document.getElementById('transactionDate').value;
    
    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return;
    }
    
    if (!category) {
        showNotification('Выберите категорию', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Добавление...';
    submitBtn.disabled = true;
    
    try {
        await window.Data.addTransaction({
            type,
            amount,
            category,
            description,
            date: new Date(date)
        });
        
        showNotification('Транзакция успешно добавлена', 'success');
        closeModal('addTransactionModal');
        
        // Обновляем дашборд
        if (document.getElementById('dashboard').classList.contains('active')) {
            await loadDashboardData();
        }
        
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Обработка добавления цели
async function handleGoalSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('goalTitle').value.trim();
    const target = parseFloat(document.getElementById('goalAmount').value);
    const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
    const targetDate = document.getElementById('goalDate').value;
    const category = document.getElementById('goalCategory').value;
    
    if (!title || !target || target <= 0) {
        showNotification('Заполните обязательные поля', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание...';
    submitBtn.disabled = true;
    
    try {
        await window.Data.addGoal({
            title,
            target,
            current,
            targetDate: new Date(targetDate),
            category
        });
        
        showNotification('Цель успешно создана', 'success');
        closeModal('addGoalModal');
        
        // Обновляем страницу целей
        if (document.getElementById('goals').classList.contains('active')) {
            await loadGoalsData();
        }
        
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Обработка добавления задачи
async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value;
    
    if (!title) {
        showNotification('Введите название задачи', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Добавление...';
    submitBtn.disabled = true;
    
    try {
        await window.Data.addTask({
            title,
            description,
            priority,
            dueDate: dueDate ? new Date(dueDate) : null
        });
        
        showNotification('Задача успешно добавлена', 'success');
        closeModal('addTaskModal');
        
        // Обновляем страницу задач
        if (document.getElementById('tasks').classList.contains('active')) {
            await loadTasksData();
        }
        
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Валидация регистрации
function validateRegistration(name, email, password, agreeTerms) {
    if (!name || name.length < 2) {
        showNotification('Введите имя (минимум 2 символа)', 'error');
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Введите корректный email', 'error');
        return false;
    }
    
    if (password.length < 6) {
        showNotification('Пароль должен содержать минимум 6 символов', 'error');
        return false;
    }
    
    if (!agreeTerms) {
        showNotification('Необходимо согласие с пользовательским соглашением', 'error');
        return false;
    }
    
    return true;
}

// Обновление даты
function updateDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        dateElement.textContent = now.toLocaleDateString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Показать уведомление
function showNotification(message, type = 'success') {
    // Удаляем старые уведомления
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(notification => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    });
    
    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <p>${message}</p>
        <button class="close-notification" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Показываем с анимацией
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

// Глобальные функции для вызова из HTML
window.showAddTransactionModal = () => openModal('addTransactionModal');
window.showAddGoalModal = () => openModal('addGoalModal');
window.showAddTaskModal = () => openModal('addTaskModal');
window.showPage = showPage;
window.editField = (field) => {
    if (field === 'name') {
        const currentName = document.getElementById('profileName').textContent;
        document.getElementById('newUserName').value = currentName !== '-' ? currentName : '';
        openModal('editNameModal');
    }
};

window.deleteTransaction = async (transactionId) => {
    if (!confirm('Вы уверены, что хотите удалить эту транзакцию?')) return;
    
    try {
        await window.Data.deleteTransaction(transactionId);
        showNotification('Транзакция удалена', 'success');
        
        // Обновляем дашборд
        if (document.getElementById('dashboard').classList.contains('active')) {
            await loadDashboardData();
        }
        
        // Обновляем список транзакций
        if (document.getElementById('transactions').classList.contains('active')) {
            await loadTransactionsData();
        }
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

window.handleLogout = async () => {
    try {
        await window.Auth.logoutUser();
        showNotification('Вы вышли из системы', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    
    // Обработчики для кнопок на welcome странице
    document.getElementById('loginBtn')?.addEventListener('click', () => openModal('loginModal'));
    document.getElementById('registerBtn')?.addEventListener('click', () => openModal('registerModal'));
    document.getElementById('welcomeLoginBtn')?.addEventListener('click', () => openModal('loginModal'));
    document.getElementById('welcomeRegisterBtn')?.addEventListener('click', () => openModal('registerModal'));
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    
    // Обработчики для кнопок быстрых действий
    document.querySelectorAll('.quick-action').forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes('showAddTransactionModal')) {
            btn.onclick = () => openModal('addTransactionModal');
        }
        if (btn.onclick && btn.onclick.toString().includes('showAddTaskModal')) {
            btn.onclick = () => openModal('addTaskModal');
        }
    });
});




// Управление задачами
window.toggleTask = async (taskId, completed) => {
    try {
        await window.Data.updateTask(taskId, { completed });
        showNotification('Статус задачи обновлен', 'success');
        
        if (document.getElementById('tasks').classList.contains('active')) {
            await loadTasksData();
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

window.deleteTask = async (taskId) => {
    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) return;
    
    try {
        await window.Data.deleteTask(taskId);
        showNotification('Задача удалена', 'success');
        
        if (document.getElementById('tasks').classList.contains('active')) {
            await loadTasksData();
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

// Управление целями
window.editGoal = (goalId) => {
    showNotification('Редактирование целей пока не реализовано', 'info');
};

window.deleteGoal = async (goalId) => {
    if (!confirm('Вы уверены, что хотите удалить эту цель?')) return;
    
    try {
        await window.Data.deleteGoal(goalId);
        showNotification('Цель удалена', 'success');
        
        if (document.getElementById('goals').classList.contains('active')) {
            await loadGoalsData();
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
};

window.editTransaction = (transactionId) => {
    showNotification('Редактирование транзакций пока не реализовано', 'info');
};

window.showAddDebtModal = () => openModal('addDebtModal');

// Обработчик формы долга
function handleDebtSubmit(e) {
    e.preventDefault();
    
    const type = document.getElementById('debtType').value;
    const amount = parseFloat(document.getElementById('debtAmount').value);
    const person = document.getElementById('debtPerson').value.trim();
    const description = document.getElementById('debtDescription').value.trim();
    const dueDate = document.getElementById('debtDueDate').value;
    
    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return;
    }
    
    if (!person) {
        showNotification('Введите имя человека или организацию', 'error');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Добавление...';
    submitBtn.disabled = true;
    
    try {
        // Временное решение - просто показываем уведомление
        showNotification(`Долг добавлен: ${person} - ${amount} ₽`, 'success');
        closeModal('addDebtModal');
        
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}


// Показ модали удаления аккаунта
function showDeleteAccountModal() {
    const modal = document.getElementById('deleteAccountModal');
    if (!modal) return;
    
    modal.style.display = 'block';
    
    // Setup confirmation checkbox handler
    const confirmCheckbox = document.getElementById('confirmDelete');
    const confirmEmailInput = document.getElementById('confirmEmail');
    const deleteBtn = document.getElementById('deleteAccountBtn');
    
    const updateDeleteBtn = () => {
        const emailMatch = confirmEmailInput && confirmEmailInput.value.trim() === (window.Auth?.getCurrentUser?.()?.email || '');
        const confirmed = confirmCheckbox && confirmCheckbox.checked;
        if (deleteBtn) deleteBtn.disabled = !(emailMatch && confirmed);
    };
    
    if (confirmCheckbox) confirmCheckbox.addEventListener('change', updateDeleteBtn);
    if (confirmEmailInput) confirmEmailInput.addEventListener('input', updateDeleteBtn);
}

// Удаление аккаунта
async function deleteAccount() {
    try {
        const user = window.Auth?.getCurrentUser?.();
        if (!user) throw new Error('Пользователь не авторизован');
        
        const confirmEmailInput = document.getElementById('confirmEmail');
        const enteredEmail = confirmEmailInput?.value.trim() || '';
        
        if (enteredEmail !== user.email) {
            showNotification('Email не совпадает', 'error');
            return;
        }

        showNotification('Удаление аккаунта...', 'info');
        
        // Всегда используем серверную функцию для безопасного удаления
        // это гарантирует, что все данные будут удалены правильно, 
        // даже если пользователь отлогинился или истекла сессия
        const response = await fetch('/.netlify/functions/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                uid: user.uid, 
                email: user.email 
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Ошибка удаления (${response.status}): ${text}`);
        }

        const result = await response.json();
        
        showNotification('Аккаунт успешно удален', 'success');
        closeModal('deleteAccountModal');
        
        // Logout and return to welcome
        setTimeout(() => {
            if (window.Auth?.logoutUser) {
                window.Auth.logoutUser();
            } else {
                window.location.href = '/';
            }
        }, 1000);
        
    } catch (error) {
        console.error('Ошибка удаления аккаунта:', error);
        showNotification('Ошибка удаления аккаунта: ' + error.message, 'error');
    }
}

// Функции для модальных окон с условиями обслуживания
function showTermsModal() {
    openModal('termsModal');
}

function showPrivacyModal() {
    openModal('privacyModal');
}

function showOfferModal() {
    openModal('offerModal');
}

function showRefundModal() {
    openModal('refundModal');
}

// Экспорт функций
window.UI = {
    initializeUI,
    showNotification,
    openModal,
    closeModal,
    showPage,
    loadDashboardData,
    loadTransactionsData,
    loadAnalyticsData,
    loadGoalsData,
    loadTasksData,
    loadProfileData,
    showAddTransactionModal: () => openModal('addTransactionModal'),
    showAddGoalModal: () => openModal('addGoalModal'),
    showAddTaskModal: () => openModal('addTaskModal'),
    showAddDebtModal: () => openModal('addDebtModal'),
    editField,
    toggleTask,
    deleteTask,
    editGoal,
    deleteGoal,
    editTransaction,
    handleLogout,
    showTermsModal,
    showPrivacyModal,
    showOfferModal,
    showRefundModal,
    showDeleteAccountModal,
    deleteAccount
};