// api.js - Centralized API for backend communication

window.api = {
    // --- TASKS ---
    async getTasks() {
        if (!window.djazair) return [];
        const raw = await window.djazair.invoke('getTasks');
        return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    },
    async addTask(title, desc, category, priority, dueDate, repeatType, reminderTime) {
        if (window.djazair) await window.djazair.invoke('addTask', [title, desc, category, priority, dueDate, repeatType, reminderTime]);
    },
    async updateTaskStatus(id, status) {
        if (window.djazair) await window.djazair.invoke('updateTaskStatus', [id, status]);
    },
    async updateTask(id, title, desc, category, priority, dueDate, repeatType, reminderTime) {
        if (window.djazair) await window.djazair.invoke('updateTask', [id, title, desc, category, priority, dueDate, repeatType, reminderTime]);
    },
    async updateTaskCategory(id, category) {
        if (window.djazair) await window.djazair.invoke('updateTaskCategory', [id, category]);
    },
    async updateTaskOrder(id, orderIndex) {
        if (window.djazair) await window.djazair.invoke('updateTaskOrder', [id, orderIndex]);
    },
    async deleteTask(id) {
        if (window.djazair) await window.djazair.invoke('deleteTask', [id]);
    },

    // --- LISTS ---
    async getLists() {
        if (!window.djazair) return [];
        const raw = await window.djazair.invoke('getLists');
        return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    },
    async addList(name, color, bg) {
        if (window.djazair) await window.djazair.invoke('addList', [name, color, bg]);
    },
    async updateListTheme(id, color, bg) {
        if (window.djazair) await window.djazair.invoke('updateListTheme', [id, color, bg]);
    },
    async deleteList(id, name) {
        if (window.djazair) await window.djazair.invoke('deleteList', [id, name]);
    },
    async renameList(id, name) {
        if (window.djazair) await window.djazair.invoke('renameList', [id, name]);
    },

    // --- STEPS ---
    async getSteps(taskId) {
        if (!window.djazair) return [];
        const raw = await window.djazair.invoke('getSteps', [taskId]);
        return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    },
    async addStep(taskId, title) {
        if (window.djazair) await window.djazair.invoke('addStep', [taskId, title]);
    },
    async updateStepStatus(id, status) {
        if (window.djazair) await window.djazair.invoke('updateStepStatus', [id, status]);
    },
    async deleteStep(id) {
        if (window.djazair) await window.djazair.invoke('deleteStep', [id]);
    },

    // --- DATA ---
    async exportData() {
        if (window.djazair) await window.djazair.invoke('exportData');
    },
    async importData() {
        if (window.djazair) return await window.djazair.invoke('importData');
        return false;
    },

    // --- NOTIFICATIONS ---
    async notify(title, msg) {
        if (window.djazair) await window.djazair.invoke('notify', [title, msg]);
    }
};
