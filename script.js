// ============================
// DOM ELEMENTS
// ============================
const taskInput = document.getElementById('taskInput');
const prioritySelect = document.getElementById('prioritySelect');
const dueDateInput = document.getElementById('dueDateInput');
const addBtn = document.getElementById('addBtn');
const tasksList = document.getElementById('tasksList');
const emptyState = document.getElementById('emptyState');
const clearBtn = document.getElementById('clearBtn');
const deleteAllBtn = document.getElementById('deleteAllBtn');
const searchInput = document.getElementById('searchInput');
const filterRadios = document.querySelectorAll('input[name="filter"]');
const totalTasksSpan = document.getElementById('totalTasks');
const completedTasksSpan = document.getElementById('completedTasks');
const remainingTasksSpan = document.getElementById('remainingTasks');
const overdueTasksSpan = document.getElementById('overdueTasks');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const darkModeToggle = document.getElementById('darkModeToggle');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastIcon = document.getElementById('toastIcon');

// ============================
// STATE MANAGEMENT
// ============================
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all';
let currentSearch = '';

// ============================
// INITIALIZATION
// ============================
function init() {
    loadDarkMode();
    renderTasks();
    updateStats();
    attachEventListeners();
}

function attachEventListeners() {
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    clearBtn.addEventListener('click', clearCompleted);
    deleteAllBtn.addEventListener('click', deleteAll);
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase();
        renderTasks();
    });
    filterRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            renderTasks();
        });
    });
    darkModeToggle.addEventListener('click', toggleDarkMode);
}

// ============================
// TASK MANAGEMENT
// ============================
function addTask() {
    const taskText = taskInput.value.trim();

    if (taskText === '') {
        showToast('Please enter a task!', 'warning');
        taskInput.focus();
        return;
    }

    const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        priority: prioritySelect.value,
        dueDate: dueDateInput.value || null,
        createdAt: new Date().toISOString()
    };

    tasks.push(task);
    saveTasks();
    renderTasks();
    updateStats();
    resetInputs();
    showToast('Task added successfully! 🎉', 'success');
    taskInput.focus();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        updateStats();
        showToast(task.completed ? 'Task completed! ✓' : 'Task unmarked', 'success');
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    updateStats();
    showToast('Task deleted!', 'danger');
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        taskInput.value = task.text;
        prioritySelect.value = task.priority;
        dueDateInput.value = task.dueDate || '';
        deleteTask(id);
        taskInput.focus();
        showToast('Task ready for editing', 'info');
    }
}

function clearCompleted() {
    const completedCount = tasks.filter(t => t.completed).length;
    if (completedCount === 0) {
        showToast('No completed tasks to clear!', 'warning');
        return;
    }
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    renderTasks();
    updateStats();
    showToast(`Cleared ${completedCount} completed task(s)!`, 'success');
}

function deleteAll() {
    if (tasks.length === 0) {
        showToast('No tasks to delete!', 'warning');
        return;
    }
    if (confirm('Are you sure you want to delete ALL tasks? This cannot be undone!')) {
        const count = tasks.length;
        tasks = [];
        saveTasks();
        renderTasks();
        updateStats();
        showToast(`Deleted ${count} task(s)!`, 'danger');
    }
}

// ============================
// RENDERING
// ============================
function renderTasks() {
    tasksList.innerHTML = '';
    let filteredTasks = getFilteredTasks();

    if (filteredTasks.length === 0) {
        emptyState.classList.add('active');
        return;
    }

    emptyState.classList.remove('active');

    filteredTasks.forEach((task) => {
        const li = document.createElement('li');
        li.className = `list-group-item priority-${task.priority}`;
        
        const isOverdue = isTaskOverdue(task);
        const dueDateFormatted = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : null;

        li.innerHTML = `
            <input 
                type="checkbox" 
                class="form-check-input" 
                ${task.completed ? 'checked' : ''}
                onchange="toggleTask(${task.id})"
            >
            <div class="task-content">
                <p class="task-text ${task.completed ? 'completed' : ''}">${escapeHtml(task.text)}</p>
                <div class="task-meta">
                    <span class="priority-badge ${task.priority}">
                        <i class="fas fa-flag"></i> ${capitalize(task.priority)}
                    </span>
                    ${dueDateFormatted ? `
                        <span class="task-date ${isOverdue && !task.completed ? 'overdue' : ''}">
                            <i class="fas fa-calendar"></i> ${dueDateFormatted}
                        </span>
                    ` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-icon edit" onclick="editTask(${task.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteTask(${task.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        tasksList.appendChild(li);
    });
}

function getFilteredTasks() {
    let filtered = tasks;

    // Apply filter
    if (currentFilter === 'active') {
        filtered = filtered.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(t => t.completed);
    }

    // Apply search
    if (currentSearch) {
        filtered = filtered.filter(t => t.text.toLowerCase().includes(currentSearch));
    }

    // Sort by priority and due date
    filtered.sort((a, b) => {
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        return a.dueDate ? -1 : 1;
    });

    return filtered;
}

// ============================
// STATISTICS & PROGRESS
// ============================
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const remaining = total - completed;
    const overdue = tasks.filter(t => isTaskOverdue(t) && !t.completed).length;

    totalTasksSpan.textContent = total;
    completedTasksSpan.textContent = completed;
    remainingTasksSpan.textContent = remaining;
    overdueTasksSpan.textContent = overdue;

    // Update progress bar
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    progressBar.style.width = progress + '%';
    progressPercent.textContent = progress;
}

function isTaskOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    return new Date(task.dueDate) < new Date();
}

// ============================
// DARK MODE
// ============================
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    darkModeToggle.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function loadDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// ============================
// UTILITIES
// ============================
function resetInputs() {
    taskInput.value = '';
    prioritySelect.value = 'medium';
    dueDateInput.value = '';
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showToast(message, type = 'info') {
    toastMessage.textContent = message;
    
    const iconMap = {
        success: '<i class="fas fa-check-circle text-success"></i>',
        danger: '<i class="fas fa-trash text-danger"></i>',
        warning: '<i class="fas fa-exclamation-circle text-warning"></i>',
        info: '<i class="fas fa-info-circle text-info"></i>'
    };
    
    toastIcon.innerHTML = iconMap[type] || iconMap.info;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================
// INITIALIZATION
// ============================
document.addEventListener('DOMContentLoaded', init);
