$(document).ready(() => {
    // Current date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    $('#mainDate').text(new Date().toLocaleDateString('en-US', options));

    let allTasks = [];
    let customLists = [];
    let currentFilter = 'Tasks';
    let selectedTaskId = null;
    let searchQuery = '';

    async function init() {
        if (!window.djazair) {
            console.error("Djazair WebView not detected! Running in offline/browser mode without backend.");
        }
        await loadData();
        // Start the robust notification service
        if (window.NotificationService) {
            window.NotificationService.start(() => allTasks);
        }
    }

    async function loadData() {
        $('#loadingState').removeClass('hidden');
        try {
            allTasks = await window.api.getTasks();
            customLists = await window.api.getLists();
        } catch(e) { 
            console.error(e); 
            alert("Error loading data: " + (e.message || e));
        } 
        finally { $('#loadingState').addClass('hidden'); }
        
        renderLists();
        renderTasks();
        applyCurrentTheme();
        if (selectedTaskId) openDetail(selectedTaskId, true);
    }

    // --- SEARCH LOGIC ---
    $('#sidebarSearchBtn').click(() => {
        $('#searchContainer').toggleClass('hidden');
        if(!$('#searchContainer').hasClass('hidden')) $('#searchInput').focus();
    });
    $('#closeSearchBtn').click(() => {
        $('#searchContainer').addClass('hidden');
        $('#searchInput').val('');
        searchQuery = '';
        renderTasks();
    });
    $('#searchInput').on('input', function() {
        searchQuery = $(this).val().toLowerCase();
        renderTasks();
    });

    // --- LISTS & THEMES LOGIC ---
    function renderLists() {
        let html = '';
        customLists.forEach(l => {
            html += `
                <a href="#" class="nav-item custom-list-item flex items-center gap-4 px-3 py-2.5 rounded-md hover:bg-msitemhover text-sm dropzone ${currentFilter === l.name ? 'active' : ''}" data-filter="${l.name}" data-id="${l.id}" oncontextmenu="showListContextMenu(event, ${l.id}, '${escapeHTML(l.name)}')">
                    <i class="fa-solid fa-list-ul w-5 text-center" style="color: ${l.theme_color || '#5C90D2'}"></i>
                    <span class="truncate flex-1">${escapeHTML(l.name)}</span>
                </a>
            `;
        });
        $('#customListsContainer').html(html);
        bindNavFilters();
        bindDropzones();
    }

    function applyCurrentTheme() {
        let list = customLists.find(l => l.name === currentFilter);
        let color = '#5C90D2';
        let bg = 'var(--msbg)';
        
        if (list) {
            if (list.theme_color) color = list.theme_color;
            if (list.theme_bg) bg = list.theme_bg;
        } else {
            // Default built-in themes
            if (currentFilter === 'My Day') { color = '#5C90D2'; bg = 'var(--msbg)'; }
            if (currentFilter === 'Important') { color = '#E33E5A'; bg = 'var(--msbg)'; }
            if (currentFilter === 'Planned') { color = '#00B294'; bg = 'var(--msbg)'; }
        }

        document.documentElement.style.setProperty('--msblue', color);
        if (bg.includes('gradient') || bg.includes('url')) {
            $('body').css('background', bg);
        } else {
            $('body').css('background', 'var(--msbg)');
        }
    }

    function bindNavFilters() {
        $('.nav-item').off('click').on('click', function(e) {
            e.preventDefault();
            $('.nav-item').removeClass('active');
            $(this).addClass('active');
            currentFilter = $(this).data('filter');
            $('#mainTitle').text(currentFilter);
            applyCurrentTheme();
            closeRightPanel();
            renderTasks();
        });
    }

    // Add List Modal Logic
    $('#btnNewList').click(() => {
        $('#newListName').val('');
        $('.new-list-theme').removeClass('active').first().addClass('active');
        $('#addListModal').removeClass('hidden');
        setTimeout(() => $('#newListName').focus(), 100);
    });

    $('#closeAddListBtn').click(() => {
        $('#addListModal').addClass('hidden');
    });

    $('.new-list-theme').click(function() {
        $('.new-list-theme').removeClass('active');
        $(this).addClass('active');
    });

    $('#btnCreateList').click(async () => {
        const name = $('#newListName').val().trim();
        if (name) {
            const color = $('.new-list-theme.active').data('color') || '#5C90D2';
            await window.api.addList(name, color, '');
            $('#addListModal').addClass('hidden');
            await loadData();
        }
    });

    $('#newListName').keypress((e) => {
        if (e.which == 13) $('#btnCreateList').click();
    });

    // Theme Toggle Picker
    $('#btnThemeToggle').click((e) => {
        e.stopPropagation();
        $('#themeDropdown').toggleClass('hidden');
    });

    $('.theme-preview').click(async function(e) {
        e.stopPropagation();
        let color = $(this).data('color');
        let list = customLists.find(l => l.name === currentFilter);
        if (list) {
            await window.api.updateListTheme(list.id, color, list.theme_bg || '');
            await loadData();
        }
    });

    $('#bgSelect').change(async function(e) {
        let bg = $(this).val();
        let list = customLists.find(l => l.name === currentFilter);
        if (list) {
            await window.api.updateListTheme(list.id, list.theme_color || '#5C90D2', bg);
            await loadData();
        }
    });

    let ctxListId = null, ctxListName = '';
    window.showListContextMenu = (e, id, name) => {
        e.preventDefault();
        ctxListId = id; ctxListName = name;
        const menu = $('#listContextMenu');
        menu.removeClass('hidden');
        let x = e.clientX, y = e.clientY;
        if (x + menu.outerWidth() > window.innerWidth) x = window.innerWidth - menu.outerWidth() - 10;
        if (y + menu.outerHeight() > window.innerHeight) y = window.innerHeight - menu.outerHeight() - 10;
        menu.css({ left: x, top: y });
    };

    let ctxTaskId = null;
    window.showContextMenu = (e, id) => {
        e.preventDefault();
        ctxTaskId = id;
        
        const task = allTasks.find(t => t.id == id);
        if (task) {
            if (task.status === 1) {
                $('#ctxToggleStatus span').text('Mark as not completed');
                $('#ctxToggleStatus i').removeClass('fa-regular fa-circle-check').addClass('fa-solid fa-circle-xmark');
            } else {
                $('#ctxToggleStatus span').text('Mark as completed');
                $('#ctxToggleStatus i').removeClass('fa-solid fa-circle-xmark').addClass('fa-regular fa-circle-check');
            }
            
            if (task.priority === 'High') {
                $('#ctxToggleImportant span').text('Remove importance');
                $('#ctxToggleImportant i').removeClass('fa-regular').addClass('fa-solid text-rose-400');
            } else {
                $('#ctxToggleImportant span').text('Mark as important');
                $('#ctxToggleImportant i').removeClass('fa-solid text-rose-400').addClass('fa-regular');
            }
        }

        const menu = $('#contextMenu');
        menu.removeClass('hidden');
        let x = e.clientX, y = e.clientY;
        if (x + menu.outerWidth() > window.innerWidth) x = window.innerWidth - menu.outerWidth() - 10;
        if (y + menu.outerHeight() > window.innerHeight) y = window.innerHeight - menu.outerHeight() - 10;
        menu.css({ left: x, top: y });
    };

    $('#ctxToggleStatus').click(async () => {
        $('#contextMenu').addClass('hidden');
        if (ctxTaskId) toggleTaskStatus(ctxTaskId, {stopPropagation:()=>{}});
    });

    $('#ctxToggleImportant').click(async () => {
        $('#contextMenu').addClass('hidden');
        if (ctxTaskId) toggleImportant(ctxTaskId, {stopPropagation:()=>{}});
    });

    $('#ctxMyDay').click(async () => {
        $('#contextMenu').addClass('hidden');
        if (ctxTaskId && window.djazair) {
            await window.api.updateTaskCategory(ctxTaskId, 'My Day');
            await loadData();
        }
    });

    $('#ctxDelete').click(async () => {
        $('#contextMenu').addClass('hidden');
        if (ctxTaskId && confirm("Delete this task permanently?")) {
            await window.api.deleteTask(ctxTaskId);
            if (selectedTaskId == ctxTaskId) closeRightPanel();
            await loadData();
        }
    });

    $('#ctxRenameList').click(async () => {
        $('#listContextMenu').addClass('hidden');
        if (ctxListId) {
            const newName = prompt("Rename list:", ctxListName);
            if (newName && newName.trim() && newName.trim() !== ctxListName) {
                if (window.djazair) {
                    await window.api.renameList(ctxListId, newName.trim());
                    if (currentFilter === ctxListName) {
                        currentFilter = newName.trim();
                        $('#mainTitle').text(currentFilter);
                    }
                    for (let t of allTasks) {
                        if (t.category === ctxListName) await window.api.updateTaskCategory(t.id, newName.trim());
                    }
                    await loadData();
                }
            }
        }
    });

    $('#ctxDeleteList').click(async () => {
        $('#listContextMenu').addClass('hidden');
        if (ctxListId) {
            if (confirm(`Delete list "${ctxListName}" and all its tasks?`)) {
                if (window.djazair) {
                    await window.api.deleteList(ctxListId, ctxListName);
                    if (currentFilter === ctxListName) {
                        currentFilter = 'Tasks';
                        $('#mainTitle').text('Tasks');
                    }
                    await loadData();
                }
            }
        }
    });

    // --- SETTINGS (BACKUP / RESTORE) ---
    $('#btnSettings').click(() => { $('#settingsModal').removeClass('hidden'); });
    $('#closeSettingsBtn').click(() => { $('#settingsModal').addClass('hidden'); });

    $('#btnExport').click(async () => {
        if (window.djazair) {
            await window.api.exportData();
            $('#settingsModal').addClass('hidden');
        }
    });

    $('#btnImport').click(async () => {
        if (window.djazair) {
            let res = await window.api.importData();
            if (res) {
                $('#settingsModal').addClass('hidden');
                await loadData();
            }
        }
    });

    // --- DRAG & DROP LOGIC ---
    let draggedTaskId = null;

    window.handleDragStart = (e, id) => {
        draggedTaskId = id;
        e.originalEvent.dataTransfer.effectAllowed = 'move';
        $(e.target).addClass('opacity-50');
    };

    window.handleDragEnd = (e) => {
        $(e.target).removeClass('opacity-50');
        $('.dropzone').removeClass('ring-2 ring-msblue bg-msitemhover');
        $('.task-item').removeClass('border-t-2 border-t-msblue');
    };

    function bindDropzones() {
        $('.dropzone').on('dragover', (e) => { e.preventDefault(); $(e.currentTarget).addClass('ring-2 ring-msblue bg-msitemhover'); })
                      .on('dragleave', (e) => { $(e.currentTarget).removeClass('ring-2 ring-msblue bg-msitemhover'); })
                      .on('drop', async (e) => {
            e.preventDefault();
            $(e.currentTarget).removeClass('ring-2 ring-msblue bg-msitemhover');
            if (draggedTaskId) {
                const targetCat = $(e.currentTarget).data('filter');
                if (targetCat === 'Important') {
                    await window.api.updateTask(draggedTaskId, ...getTaskArgs(draggedTaskId, {priority: 'High'}));
                } else if (targetCat !== 'Planned') {
                    await window.api.updateTaskCategory(draggedTaskId, targetCat);
                }
                await loadData();
            }
        });

        $('.task-item').on('dragover', (e) => { e.preventDefault(); $(e.currentTarget).addClass('border-t-2 border-t-msblue'); })
                       .on('dragleave', (e) => { $(e.currentTarget).removeClass('border-t-2 border-t-msblue'); })
                       .on('drop', async (e) => {
            e.preventDefault();
            $(e.currentTarget).removeClass('border-t-2 border-t-msblue');
            const targetTaskId = $(e.currentTarget).data('id');
            if (draggedTaskId && targetTaskId && draggedTaskId != targetTaskId) {
                const tasksInView = getFilteredTasks();
                let draggedTask = tasksInView.find(t => t.id == draggedTaskId);
                let targetTask = tasksInView.find(t => t.id == targetTaskId);
                if (draggedTask && targetTask && window.djazair) {
                    await window.api.updateTaskOrder(draggedTaskId, targetTask.order_index - 1);
                    await loadData();
                }
            }
        });
    }

    function getTaskArgs(id, overrides = {}) {
        let t = allTasks.find(x => x.id == id);
        return [
            overrides.title || t.title,
            overrides.description !== undefined ? overrides.description : (t.description || ''),
            overrides.category !== undefined ? overrides.category : (t.category || ''),
            overrides.priority || t.priority || 'Medium',
            overrides.due_date !== undefined ? overrides.due_date : (t.due_date || ''),
            overrides.repeat_type !== undefined ? overrides.repeat_type : (t.repeat_type || ''),
            overrides.reminder_time !== undefined ? overrides.reminder_time : (t.reminder_time || '')
        ];
    }

    // --- TASK RENDERING ---
    function getFilteredTasks() {
        let filtered = allTasks;
        if (searchQuery) {
            filtered = filtered.filter(t => t.title.toLowerCase().includes(searchQuery) || (t.description && t.description.toLowerCase().includes(searchQuery)));
        } else {
            if (currentFilter === 'Important') filtered = filtered.filter(t => t.priority === 'High');
            else if (currentFilter === 'Planned') filtered = filtered.filter(t => t.due_date);
            else if (currentFilter !== 'My Day' && currentFilter !== 'Tasks') filtered = filtered.filter(t => t.category === currentFilter);
        }
        return filtered;
    }

    function renderTasks() {
        let activeHTML = '', completedHTML = '', completedCount = 0;
        let filtered = getFilteredTasks();
        
        filtered.forEach(task => {
            const isCompleted = task.status === 1;
            const isImportant = task.priority === 'High';
            
            const itemHTML = `
                <div class="task-item ${isCompleted ? 'completed' : ''} ${selectedTaskId == task.id ? 'active' : ''}" 
                     draggable="true" ondragstart="handleDragStart(event, ${task.id})" ondragend="handleDragEnd(event)" 
                     onclick="openDetail(${task.id})" oncontextmenu="showContextMenu(event, ${task.id})" data-id="${task.id}">
                    <div class="task-check" onclick="toggleTaskStatus(${task.id}, event)"><i class="fa-solid fa-check"></i></div>
                    <div class="flex-1 min-w-0 flex flex-col justify-center">
                        <span class="task-title text-[15px] truncate block ${isCompleted ? 'text-msmuted line-through' : 'text-mstext'}">${escapeHTML(task.title)}</span>
                        ${(!isCompleted && (task.category || task.due_date || task.description || task.reminder_time || task.repeat_type)) ? `
                            <div class="text-[11px] text-msmuted flex gap-2 mt-0.5 items-center">
                                ${task.category ? `<span>${task.category}</span>` : ''}
                                ${task.due_date ? `<span><i class="fa-regular fa-calendar ml-1"></i> ${task.due_date}</span>` : ''}
                                ${task.reminder_time ? `<span><i class="fa-regular fa-bell ml-1"></i> ${task.reminder_time}</span>` : ''}
                                ${task.repeat_type ? `<span><i class="fa-solid fa-rotate-right ml-1"></i></span>` : ''}
                                ${task.description ? `<span><i class="fa-regular fa-sticky-note ml-1"></i></span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="task-star ${isImportant ? 'important' : ''}" onclick="toggleImportant(${task.id}, event)">
                        <i class="${isImportant ? 'fa-solid' : 'fa-regular'} fa-star"></i>
                    </div>
                </div>
            `;
            if (isCompleted) { completedHTML += itemHTML; completedCount++; } else { activeHTML += itemHTML; }
        });

        $('#tasksList').html(activeHTML);
        if (completedCount > 0) {
            $('#completedSection').removeClass('hidden');
            $('#completedTasksList').html(completedHTML);
            $('#completedCount').text(completedCount);
        } else {
            $('#completedSection').addClass('hidden');
        }
        bindDropzones();
    }

    // Inline Task Add
    let pendingDueDate = '';
    let pendingReminderTime = '';

    $('#inlineCalendarBtn').click((e) => {
        e.stopPropagation();
        $('#calendarDropdown').toggleClass('hidden');
        $('#reminderDropdown').addClass('hidden');
    });

    $('#inlineReminderBtn').click((e) => {
        e.stopPropagation();
        $('#reminderDropdown').toggleClass('hidden');
        $('#calendarDropdown').addClass('hidden');
    });

    $('.date-opt').click(function(e) {
        e.preventDefault();
        const date = new Date();
        date.setDate(date.getDate() + parseInt($(this).data('days')));
        pendingDueDate = date.toISOString().split('T')[0];
        $('#calendarDropdown').addClass('hidden');
        $('#inlineCalendarBtn').addClass('text-msblue').removeClass('text-msmuted');
    });
    $('#inlineDueDate').change(function() { 
        pendingDueDate = $(this).val(); 
        $('#calendarDropdown').addClass('hidden'); 
        $('#inlineCalendarBtn').addClass('text-msblue').removeClass('text-msmuted');
    });

    $('.rem-opt').click(function(e) {
        e.preventDefault();
        pendingReminderTime = $(this).data('time');
        $('#reminderDropdown').addClass('hidden');
        $('#inlineReminderBtn').addClass('text-msblue').removeClass('text-msmuted');
    });
    $('#inlineReminderTime').change(function() { 
        pendingReminderTime = $(this).val(); 
        $('#reminderDropdown').addClass('hidden'); 
        $('#inlineReminderBtn').addClass('text-msblue').removeClass('text-msmuted');
    });

    async function submitInlineTask() {
        const title = $('#inlineTaskInput').val().trim();
        if (!title) return;
        const priority = currentFilter === 'Important' ? 'High' : 'Medium';
        const category = ['Important', 'My Day', 'Planned'].includes(currentFilter) ? 'Tasks' : currentFilter;

        if (window.djazair) {
            await window.api.addTask(title, '', category, priority, pendingDueDate, '', pendingReminderTime);
            await loadData();
        }
        $('#inlineTaskInput').val('');
        pendingDueDate = '';
        pendingReminderTime = '';
        $('#inlineCalendarBtn, #inlineReminderBtn').removeClass('text-msblue').addClass('text-msmuted');
    }

    $('#inlineTaskInput').keypress((e) => {
        if (e.which == 13) submitInlineTask();
    });
    
    $('#inlineAddBtn').click(() => {
        submitInlineTask();
    });

    window.toggleTaskStatus = async (id, e) => {
        e.stopPropagation();
        const task = allTasks.find(t => t.id == id);
        if (task && window.djazair) {
            await window.api.updateTaskStatus(id, task.status === 1 ? 0 : 1);
            await loadData();
        }
    };

    window.toggleImportant = async (id, e) => {
        e.stopPropagation();
        const task = allTasks.find(t => t.id == id);
        if (task && window.djazair) {
            await window.api.updateTask(id, ...getTaskArgs(id, {priority: task.priority === 'High' ? 'Medium' : 'High'}));
            await loadData();
        }
    };

    // --- DETAIL PANEL ---
    window.openDetail = async (id, refreshOnly = false) => {
        const task = allTasks.find(t => t.id == id);
        if (!task) return;
        selectedTaskId = id;
        
        if (task.status === 1) {
            $('#detailToggleCheck').removeClass('border-msmuted text-transparent').addClass('bg-msblue border-msblue text-white');
        } else {
            $('#detailToggleCheck').addClass('border-msmuted text-transparent').removeClass('bg-msblue border-msblue text-white');
        }

        if (!refreshOnly) {
            $('#detailTitle').val(task.title);
            $('#detailNotes').val(task.description || '');
            $('#detailDueDate').val(task.due_date || '');
            
            const repVal = task.repeat_type || '';
            $('#detailRepeatVal').val(repVal);
            $('#repeatSelectedText').text(repVal ? repVal : 'Never repeat');

            $('#detailReminderTime').val(task.reminder_time || '');
            $('#detailCategory').val(task.category || 'Tasks');
            
            $('#detailToggleImportant i').attr('class', task.priority === 'High' ? 'fa-solid fa-star text-rose-400' : 'fa-regular fa-star');
            $('#rightPanel').addClass('panel-open');
            renderTasks();
        }

        if (window.djazair) {
            const stepsRaw = await window.api.getSteps(id);
            const steps = stepsRaw ? (typeof stepsRaw === 'string' ? JSON.parse(stepsRaw) : stepsRaw) : [];
            let stepsHTML = '';
            steps.forEach(s => {
                const isComp = s.status === 1;
                stepsHTML += `
                    <div class="flex items-center gap-3 px-2 py-1.5 hover:bg-msitemhover rounded group">
                        <button class="w-4 h-4 rounded-full border border-msmuted flex items-center justify-center text-[10px] ${isComp ? 'bg-msblue border-msblue text-white' : 'text-transparent hover:border-msblue'}" onclick="toggleStep(${s.id}, ${isComp ? 0 : 1})"><i class="fa-solid fa-check"></i></button>
                        <span class="flex-1 text-[13px] ${isComp ? 'line-through text-msmuted' : 'text-mstext'}">${escapeHTML(s.title)}</span>
                        <button class="text-msmuted hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity" onclick="deleteStep(${s.id})"><i class="fa-regular fa-trash-can text-xs"></i></button>
                    </div>`;
            });
            $('#detailStepsContainer').html(stepsHTML);
        }
    };

    window.toggleStep = async (id, status) => { { await window.api.updateStepStatus(id, status); if (selectedTaskId) openDetail(selectedTaskId, true); } };
    window.deleteStep = async (id) => { { await window.api.deleteStep(id); if (selectedTaskId) openDetail(selectedTaskId, true); } };
    
    $('#addStepInput').keypress(async (e) => {
        if (e.which == 13 && selectedTaskId) {
            const title = $(e.target).val().trim();
            if (title && window.djazair) {
                await window.api.addStep(selectedTaskId, title);
                $(e.target).val('');
                openDetail(selectedTaskId, true);
            }
        }
    });

    function closeRightPanel() { $('#rightPanel').removeClass('panel-open'); selectedTaskId = null; renderTasks(); }
    $('#closePanelBtn, #closePanelHeaderBtn').click(closeRightPanel);
    $('main').on('click', function(e) {
        if (!$(e.target).closest('.task-item').length && !$(e.target).closest('.bg-msitem').length && $('#rightPanel').hasClass('panel-open')) closeRightPanel();
    });

    async function saveDetailChanges() {
        if (!selectedTaskId) return;
        const task = allTasks.find(t => t.id == selectedTaskId);
        if (!task) return;
        if (window.djazair) {
            await window.api.updateTask(
                task.id,
                $('#detailTitle').val().trim(),
                $('#detailNotes').val(),
                $('#detailCategory').val(),
                task.priority,
                $('#detailDueDate').val(),
                $('#detailRepeatVal').val(),
                $('#detailReminderTime').val()
            );
            await loadData();
        }
    }

    $('#detailTitle, #detailNotes').on('blur', saveDetailChanges);
    $('#detailDueDate, #detailRepeat, #detailReminder').on('change', saveDetailChanges);
    $('#detailTitle').keypress((e) => { if(e.which == 13) { e.preventDefault(); $('#detailTitle').blur(); } });
    $('#detailToggleCheck').click((e) => { if (selectedTaskId) toggleTaskStatus(selectedTaskId, e); });
    $('#detailToggleImportant').click((e) => { if (selectedTaskId) toggleImportant(selectedTaskId, e); });
    $('#deleteTaskBtn').click(async () => {
        if (selectedTaskId && confirm("Delete this task permanently?")) {
            await window.api.deleteTask(selectedTaskId);
            closeRightPanel();
            await loadData();
        }
    });

    // Globals
    $(document).click((e) => {
        if (!$(e.target).closest('#calendarDropdown').length && !$(e.target).closest('#inlineCalendarBtn').length) $('#calendarDropdown').addClass('hidden');
        if (!$(e.target).closest('#reminderDropdown').length && !$(e.target).closest('#inlineReminderBtn').length) $('#reminderDropdown').addClass('hidden');
        if (!$(e.target).closest('#contextMenu').length) $('#contextMenu').addClass('hidden');
        if (!$(e.target).closest('#listContextMenu').length) $('#listContextMenu').addClass('hidden');
        if (!$(e.target).closest('#themeDropdown').length && !$(e.target).closest('#btnThemeToggle').length) $('#themeDropdown').addClass('hidden');
        if (!$(e.target).closest('#repeatDropdown').length && !$(e.target).closest('#repeatContainerBtn').length) $('#repeatDropdown').addClass('hidden');
    });

    // Custom Repeat Dropdown Logic
    $('#repeatContainerBtn').click(function(e) {
        if ($(e.target).closest('#repeatDropdown').length) return; // Prevent closing when clicking inside
        e.stopPropagation();
        $('#repeatDropdown').toggleClass('hidden');
    });

    $('.rep-opt').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        const val = $(this).data('val');
        const text = $(this).text().trim();
        $('#detailRepeatVal').val(val);
        $('#repeatSelectedText').text(text);
        $('#repeatDropdown').addClass('hidden');
        saveDetailChanges();
    });

    $('#toggleCompletedBtn').click(() => { $('#completedTasksList').slideToggle(200); $('#completedIcon').toggleClass('-rotate-90'); });

    function escapeHTML(str) { return (str || '').toString().replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)); }

    init();
});

