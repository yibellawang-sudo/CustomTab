let dailyData = {};
let shortcuts = [];
let scheduleStartDate = null;
let blockNames = { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' };
let blockIsSpare = { A: false, B: false, C: false, D: false, E: false, F: false, G: false, H: false };
let currentViewDate = new Date();
let customColors = { primary: '#cc0000' };
let draggedItem = null;
let taskTemplates = [];

const blockRotation = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['C', 'D', 'A', 'B'],
    ['G', 'H', 'E', 'F'],
    ['D', 'C', 'B', 'A'],
    ['H', 'G', 'F', 'E'],
    ['B', 'A', 'D', 'C'],
    ['F', 'E', 'H', 'G']
];

const classPeriods = [
    { period: 1, start: 8.75, end: 10.083, label: '8:45-10:05' },
    { period: 2, start: 10.75, end: 12.25, label: '10:45-12:15' },
    { period: 3, start: 13, end: 14.25, label: '1:00-2:15' },
    { period: 4, start: 14.417, end: 15.75, label: '2:25-3:45' }
];

function getDateKey(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
}

function getCurrentDayData() {
    const key = getDateKey(currentViewDate);
    if (!dailyData[key]) {
        dailyData[key] = {
            todos: { academic: [], lifestyle: [] },
            schedule: [],
            completedTasks: []
        };
    }
    return dailyData[key];
}

function saveData() {
    const data = {
        dailyData,
        shortcuts,
        scheduleStartDate,
        blockNames,
        blockIsSpare,
        customColors,
        taskTemplates
    };
    
    //chrome storage API
    if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ plannerData: data }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error saving data:', chrome.runtime.lastError);
            }
        });
    } else {
        //fallback to localStorage for testing outside Chrome extension
        localStorage.setItem('plannerData', JSON.stringify(data));
    }
}

function loadData() {
    //chrome storage API
    if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['plannerData'], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error loading data:', chrome.runtime.lastError);
                initializeData();
                return;
            }
            
            if (result.plannerData) {
                const data = result.plannerData;
                dailyData = data.dailyData || {};
                shortcuts = data.shortcuts || [];
                scheduleStartDate = data.scheduleStartDate;
                blockNames = data.blockNames || { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' };
                blockIsSpare = data.blockIsSpare || { A: false, B: false, C: false, D: false, E: false, F: false, G: false, H: false };
                customColors = data.customColors || { primary: '#cc0000' };
                taskTemplates = data.taskTemplates || [];
            }
            
            applyCustomColors();
            renderAll();
            checkFirstTimeSetup();
        });
    } else {
        //fallback to localStorage for testing
        try {
            const stored = localStorage.getItem('plannerData');
            if (stored) {
                const data = JSON.parse(stored);
                dailyData = data.dailyData || {};
                shortcuts = data.shortcuts || [];
                scheduleStartDate = data.scheduleStartDate;
                blockNames = data.blockNames || { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' };
                blockIsSpare = data.blockIsSpare || { A: false, B: false, C: false, D: false, E: false, F: false, G: false, H: false };
                customColors = data.customColors || { primary: '#cc0000' };
                taskTemplates = data.taskTemplates || [];
            }
        } catch (e) {
            console.error('Error loading data:', e);
        }
        applyCustomColors();
        renderAll();
        checkFirstTimeSetup();
    }
}

function initializeData() {
    applyCustomColors();
    renderAll();
    checkFirstTimeSetup();
}

function checkFirstTimeSetup() {
    const today = getDateKey(new Date());
    if (!scheduleStartDate && (!dailyData[today] || Object.keys(dailyData).length === 0)) {
        setTimeout(() => {
            if (confirm('Welcome! Would you like to set up your class schedule now?')) {
                openBlockModal();
            }
        }, 500);
    }
}

function applyCustomColors() {
    document.documentElement.style.setProperty('--primary', customColors.primary);
    document.documentElement.style.setProperty('--primary-hover', lightenColor(customColors.primary, 20));
    document.documentElement.style.setProperty('--primary-dark', darkenColor(customColors.primary, 10));
}

function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, ((num >> 16) & 0xFF) + amt);
    const G = Math.min(255, ((num >> 8) & 0xFF) + amt);
    const B = Math.min(255, (num & 0xFF) + amt);
    return '#' + ((R << 16) | (G << 8) | B).toString(16).padStart(6, '0');
}

function darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, ((num >> 16) & 0xFF) - amt);
    const G = Math.max(0, ((num >> 8) & 0xFF) - amt);
    const B = Math.max(0, (num & 0xFF) - amt);
    return '#' + ((R << 16) | (G << 8) | B).toString(16).padStart(6, '0');
}

function renderAll() {
    updateDate();
    renderShortcuts();
    renderTodos();
    renderCompletedTasks();
    updateScheduleHeader();
    generateTimeSlots();
}

function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', options);
}

function updateScheduleHeader() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const viewDate = new Date(currentViewDate);
    viewDate.setHours(0, 0, 0, 0);
    
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    let dateText = currentViewDate.toLocaleDateString('en-US', options);
    
    if (viewDate.getTime() === today.getTime()) {
        dateText = "Today's Schedule";
    } else {
        dateText += "'s Schedule";
    }
    
    document.getElementById('scheduleDate').textContent = dateText;
    
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    
    const prevBtn = document.getElementById('prevDay');
    const nextBtn = document.getElementById('nextDay');
    
    nextBtn.disabled = viewDate.getTime() >= sevenDaysLater.getTime();
    prevBtn.disabled = viewDate.getTime() <= today.getTime();
}

function navigateDay(direction) {
    const newDate = new Date(currentViewDate);
    newDate.setDate(newDate.getDate() + direction);
    currentViewDate = newDate;
    renderAll();
}

function generateTimeSlots() {
    const container = document.getElementById('timeBlocks');
    const hours = 23 - 6 + 1;
    container.style.position = 'relative';
    container.style.height = `${hours * 60}px`;
    container.innerHTML = '';

    let todayBlocks = [];
    if (scheduleStartDate) {
        const startDate = new Date(scheduleStartDate);
        const viewDate = new Date(currentViewDate);
        viewDate.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);

        const dayOfWeek = viewDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            let weekdayCount = 0;
            let currentDate = new Date(startDate);
            while (currentDate < viewDate) {
                const day = currentDate.getDay();
                if (day !== 0 && day !== 6) weekdayCount++;
                currentDate.setDate(currentDate.getDate() + 1);
            }
            const cycleDay = weekdayCount % 8;
            todayBlocks = blockRotation[cycleDay];
        }
    }

    for (let h = 6; h <= 23; h++) {
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        slot.dataset.hour = h;
        slot.style.position = 'absolute';
        slot.style.top = `${(h - 6) * 60}px`;
        slot.style.height = '60px';
        slot.style.width = '100%';
        slot.style.borderBottom = '1px solid rgba(0,0,0,0.06)';

        const time = h % 12 === 0 ? 12 : h % 12;
        const ampm = h < 12 ? 'AM' : 'PM';

        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.style.position = 'absolute';
        timeLabel.style.left = '8px';
        timeLabel.style.top = '12px';
        timeLabel.textContent = `${time}:00 ${ampm}`;
        slot.appendChild(timeLabel);

        const content = document.createElement('div');
        content.className = 'time-slot-content';
        content.addEventListener('dragover', handleDragOver);
        content.addEventListener('drop', handleDrop);
        slot.appendChild(content);

        container.appendChild(slot);
    }

    if (todayBlocks.length > 0) {
        classPeriods.forEach((period, idx) => {
            const block = todayBlocks[idx];
            if (blockIsSpare[block]) return;

            const className = blockNames[block] || `Block ${block}`;
            const classDiv = document.createElement('div');
            classDiv.className = 'scheduled-task class-block';
            classDiv.style.top = `${(period.start - 6) * 60}px`;
            classDiv.style.height = `${(period.end - period.start) * 60}px`;
            classDiv.innerHTML = `
                <div class="scheduled-task-title">${className}</div>
                <div class="scheduled-task-time">${period.label}</div>
            `;
            container.appendChild(classDiv);
        });
    }

    renderSchedule();
}

function renderTodos() {
    const dayData = getCurrentDayData();
    const today = getDateKey(new Date());
    const isToday = getDateKey(currentViewDate) === today;
    
    ['academic', 'lifestyle'].forEach(cat => {
        const list = document.getElementById(`${cat}List`);
        list.innerHTML = '';

        //sort by priority
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const sorted = [...dayData.todos[cat]].sort((a, b) => {
            return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        });

        sorted.forEach((todo) => {
            //find original index for delete operations
            const i = dayData.todos[cat].findIndex(t => 
                t.text === todo.text && t.duration === todo.duration && t.priority === todo.priority
            );
            
            const li = document.createElement('li');
            li.className = `todo-item priority-${todo.priority || 'medium'}`;
            li.draggable = isToday;
            li.dataset.category = cat;
            li.dataset.index = i;
            
            //check if this task is a duplicate from yesterday
            const yesterday = new Date(currentViewDate);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayKey = getDateKey(yesterday);
            if (dailyData[yesterdayKey]) {
                const isDuplicate = dailyData[yesterdayKey].todos[cat]?.some(
                    t => t.text === todo.text && t.duration === todo.duration
                );
                if (isDuplicate) li.classList.add('duplicate');
            }

            const priorityLabels = {
                low: 'Low',
                medium: 'Med',
                high: 'High',
                urgent: 'Urgent'
            };

            li.innerHTML = `
                <div class="todo-item-content">
                    <div class="todo-item-title">
                        ${todo.text}
                        <span class="priority-badge ${todo.priority || 'medium'}">${priorityLabels[todo.priority || 'medium']}</span>
                    </div>
                    <div class="todo-item-duration">${todo.duration} min</div>
                </div>
                <button class="delete-btn" data-category="${cat}" data-index="${i}">×</button>
            `;

            if (isToday) {
                li.addEventListener('dragstart', handleDragStart);
                li.addEventListener('dragend', handleDragEnd);
            }
            list.appendChild(li);
        });
    });
    
    updateTaskSuggestions();
}

function renderSchedule() {
    const container = document.getElementById('timeBlocks');
    const dayData = getCurrentDayData();
    
    container.querySelectorAll('.scheduled-task[data-scheduled="true"]').forEach(el => el.remove());

    dayData.schedule.forEach((item, i) => {
        const task = document.createElement('div');
        task.className = `scheduled-task priority-${item.priority || 'medium'} ${item.completed ? 'completed' : ''}`;
        task.dataset.scheduled = "true";
        task.style.top = `${(item.hour - 6) * 60 + (item.startMinute || 0)}px`;
        task.style.height = `${item.duration}px`;

        const priorityLabels = {
            low: 'Low',
            medium: 'Med',
            high: 'High',
            urgent: 'Urgent'
        };

        task.innerHTML = `
            <div class="scheduled-task-title">
                ${item.text}
                <span class="priority-badge ${item.priority || 'medium'}">${priorityLabels[item.priority || 'medium']}</span>
            </div>
            <div class="scheduled-task-time">${item.duration} min</div>
            <div class="scheduled-controls">
                <button class="complete-btn" data-index="${i}">✓</button>
                <button class="remove-scheduled" data-index="${i}">✖</button>
            </div>
        `;

        container.appendChild(task);
    });
}

function renderCompletedTasks() {
    const dayData = getCurrentDayData();
    const container = document.getElementById('completedList');
    container.innerHTML = '';

    dayData.completedTasks.forEach((task, i) => {
        const li = document.createElement('li');
        li.className = 'completed-item';
        li.innerHTML = `
            <div class="completed-content">
                <div class="completed-title">${task.text}</div>
            </div>
            <button class="delete-completed" data-index="${i}">×</button>
        `;
        container.appendChild(li);
    });
}

function renderShortcuts() {
    const container = document.getElementById('shortcuts');
    container.innerHTML = '';

    shortcuts.forEach((shortcut, i) => {
        const a = document.createElement('a');
        a.href = shortcut.url;
        a.className = 'shortcut';
        a.target = '_blank';

        const icon = document.createElement('div');
        icon.className = 'shortcut-icon';
        
        if (shortcut.image) {
            icon.classList.add('has-image');
            const img = document.createElement('img');
            img.src = shortcut.image;
            img.alt = shortcut.name;
            icon.appendChild(img);
        } else {
            icon.style.backgroundColor = shortcut.color || '#666';
            icon.textContent = (shortcut.letter || shortcut.name?.[0] || 'X').toUpperCase();
        }

        const name = document.createElement('span');
        name.textContent = shortcut.name || '';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-shortcut';
        deleteBtn.textContent = '×';
        deleteBtn.dataset.index = i;
        deleteBtn.onclick = (e) => {
            e.preventDefault();
            shortcuts.splice(i, 1);
            saveData();
            renderShortcuts();
        };

        a.appendChild(icon);
        a.appendChild(name);
        a.appendChild(deleteBtn);
        container.appendChild(a);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'shortcut add-shortcut';
    addBtn.innerHTML = '<div class="shortcut-icon plus">+</div><span>Add Site</span>';
    addBtn.onclick = () => openShortcutModal();
    container.appendChild(addBtn);
}

function addTodo() {
    const input = document.getElementById('todoInput');
    const category = document.getElementById('categorySelect').value;
    const duration = parseInt(document.getElementById('durationInput').value) || 30;
    const priority = document.getElementById('prioritySelect').value;
    const text = input.value.trim();

    if (text) {
        const dayData = getCurrentDayData();
        dayData.todos[category].push({ text, duration, priority });
        
        //check if this could be a template
        if (text.length > 3 && !taskTemplates.find(t => t.text.toLowerCase() === text.toLowerCase())) {
            const existing = taskTemplates.filter(t => 
                t.category === category && t.duration === duration
            );
            if (existing.length < 10) {
                taskTemplates.push({ text, category, duration, priority, uses: 1 });
            }
        } else {
            //increment usage count
            const template = taskTemplates.find(t => t.text.toLowerCase() === text.toLowerCase());
            if (template) template.uses++;
        }
        
        saveData();
        renderTodos();
        input.value = '';
        input.focus(); //keep focus for quick entry
    }
}

function handleDragStart(e) {
    const dayData = getCurrentDayData();
    const cat = this.dataset.category;
    const idx = parseInt(this.dataset.index);
    const todo = dayData.todos[cat][idx];
    draggedItem = {
        category: cat,
        index: idx,
        text: todo.text,
        duration: todo.duration,
        priority: todo.priority || 'medium'
    };
    this.classList.add('dragging');
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    const parent = this.closest('.time-slot');
    if (parent) parent.classList.add('drop-zone');
}

function handleDrop(e) {
    e.preventDefault();
    const parent = this.closest('.time-slot');
    if (parent) parent.classList.remove('drop-zone');

    if (draggedItem && parent) {
        const hour = parseInt(parent.dataset.hour);
        const dayData = getCurrentDayData();

        dayData.schedule.push({
            text: draggedItem.text,
            duration: draggedItem.duration,
            priority: draggedItem.priority,
            category: draggedItem.category,
            hour,
            startMinute: 0,
            completed: false
        });

        dayData.todos[draggedItem.category].splice(draggedItem.index, 1);
        saveData();
        renderTodos();
        renderSchedule();
        draggedItem = null;
    }
}

//remove drop zone when drag leaves
document.addEventListener('dragleave', (e) => {
    if (e.target.classList && e.target.classList.contains('time-slot-content')) {
        const parent = e.target.closest('.time-slot');
        if (parent) parent.classList.remove('drop-zone');
    }
});

//also remove drop zone when drag ends anywhere
document.addEventListener('dragend', () => {
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('drop-zone');
    });
});

//modal functions
function openCustomizeModal() {
    document.getElementById('primaryColor').value = customColors.primary;
    document.getElementById('primaryPreview').style.backgroundColor = customColors.primary;
    
    const list = document.getElementById('shortcutList');
    list.innerHTML = '';
    shortcuts.forEach((s, i) => {
        const item = document.createElement('div');
        item.className = 'shortcut-item';
        
        let iconHTML = '';
        if (s.image) {
            iconHTML = `<div class="shortcut-item-icon"><img src="${s.image}" alt="${s.name}"></div>`;
        } else {
            iconHTML = `<div class="shortcut-item-icon" style="background: ${s.color}">${s.letter}</div>`;
        }
        
        item.innerHTML = `
            ${iconHTML}
            <div class="shortcut-item-info">
                <div class="shortcut-item-name">${s.name}</div>
                <div class="shortcut-item-url">${s.url}</div>
            </div>
            <button class="delete-btn" onclick="deleteShortcutFromCustomize(${i})">×</button>
        `;
        list.appendChild(item);
    });
    
    document.getElementById('customizeModal').classList.add('active');
}

function closeCustomizeModal() {
    document.getElementById('customizeModal').classList.remove('active');
}

function saveCustomization() {
    customColors.primary = document.getElementById('primaryColor').value;
    saveData();
    applyCustomColors();
    renderShortcuts();
    closeCustomizeModal();
}

function openShortcutModal() {
    document.getElementById('shortcutName').value = '';
    document.getElementById('shortcutUrl').value = '';
    document.getElementById('shortcutLetter').value = '';
    document.getElementById('shortcutColor').value = '#666666';
    document.getElementById('shortcutImage').value = '';
    document.getElementById('iconType').value = 'letter';
    document.getElementById('imagePreview').style.display = 'none';
    toggleIconType();
    document.getElementById('shortcutModal').classList.add('active');
}

function toggleIconType() {
    const iconType = document.getElementById('iconType').value;
    const letterRow = document.getElementById('letterIconRow');
    const colorRow = document.getElementById('colorIconRow');
    const imageRow = document.getElementById('imageIconRow');
    
    if (iconType === 'image') {
        letterRow.style.display = 'none';
        colorRow.style.display = 'none';
        imageRow.style.display = 'flex';
    } else {
        letterRow.style.display = 'flex';
        colorRow.style.display = 'flex';
        imageRow.style.display = 'none';
    }
}

function closeShortcutModal() {
    document.getElementById('shortcutModal').classList.remove('active');
}

function saveShortcut() {
    const name = document.getElementById('shortcutName').value.trim();
    const url = document.getElementById('shortcutUrl').value.trim();
    const iconType = document.getElementById('iconType').value;
    
    if (!name || !url) {
        alert('Please enter both name and URL');
        return;
    }

    if (iconType === 'image') {
        const imageFile = document.getElementById('shortcutImage').files[0];
        if (!imageFile) {
            alert('Please select an image');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            shortcuts.push({ 
                name, 
                url, 
                image: e.target.result 
            });
            saveData();
            renderShortcuts();
            closeShortcutModal();
            if (document.getElementById('customizeModal').classList.contains('active')) {
                openCustomizeModal();
            }
        };
        reader.readAsDataURL(imageFile);
    } else {
        const letter = document.getElementById('shortcutLetter').value.trim() || name[0] || 'X';
        const color = document.getElementById('shortcutColor').value;
        
        shortcuts.push({ 
            name, 
            url, 
            letter: letter.toUpperCase(), 
            color 
        });
        saveData();
        renderShortcuts();
        closeShortcutModal();
        if (document.getElementById('customizeModal').classList.contains('active')) {
            openCustomizeModal();
        }
    }
}

function deleteShortcutFromCustomize(i) {
    shortcuts.splice(i, 1);
    saveData();
    openCustomizeModal();
}

//quick add and task suggestions
function updateTaskSuggestions() {
    const datalist = document.getElementById('taskSuggestions');
    if (!datalist) return;
    
    datalist.innerHTML = '';
    
    //sort templates by usage
    const sortedTemplates = [...taskTemplates]
        .sort((a, b) => (b.uses || 0) - (a.uses || 0))
        .slice(0, 10);
    
    sortedTemplates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.text;
        datalist.appendChild(option);
    });
}

function openQuickAddModal() {
    const modal = document.getElementById('quickAddModal');
    const list = document.getElementById('quickAddList');
    
    list.innerHTML = '';
    
    if (taskTemplates.length === 0) {
        list.innerHTML = '<p style="color: #888; text-align: center;">No common tasks yet. Add tasks normally and they\'ll appear here!</p>';
    } else {
        const sortedTemplates = [...taskTemplates]
            .sort((a, b) => (b.uses || 0) - (a.uses || 0))
            .slice(0, 15);
        
        const priorityLabels = {
            low: 'Low',
            medium: 'Med',
            high: 'High',
            urgent: 'Urgent'
        };
        
        sortedTemplates.forEach(template => {
            const task = document.createElement('div');
            task.className = 'quick-add-task';
            task.innerHTML = `
                <div class="quick-add-task-info">
                    <div class="quick-add-task-name">
                        ${template.text}
                        <span class="priority-badge ${template.priority || 'medium'}">${priorityLabels[template.priority || 'medium']}</span>
                    </div>
                    <div class="quick-add-task-meta">${template.category} · ${template.duration} min · Used ${template.uses || 1}x</div>
                </div>
            `;
            task.onclick = () => {
                const dayData = getCurrentDayData();
                dayData.todos[template.category].push({ 
                    text: template.text, 
                    duration: template.duration,
                    priority: template.priority || 'medium'
                });
                template.uses = (template.uses || 1) + 1;
                saveData();
                renderTodos();
                closeQuickAddModal();
                
                //show quick feedback
                const btn = document.getElementById('quickAddBtn');
                const original = btn.textContent;
                btn.textContent = '✓';
                setTimeout(() => btn.textContent = original, 1000);
            };
            list.appendChild(task);
        });
    }
    
    modal.classList.add('active');
}

function closeQuickAddModal() {
    document.getElementById('quickAddModal').classList.remove('active');
}

function copyYesterdayTasks() {
    const yesterday = new Date(currentViewDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getDateKey(yesterday);
    const todayKey = getDateKey(currentViewDate);
    
    if (!dailyData[yesterdayKey]) {
        alert('No tasks from yesterday to copy!');
        return;
    }
    
    const yesterdayData = dailyData[yesterdayKey];
    const todayData = getCurrentDayData();
    
    let copiedCount = 0;
    
    //copy incomplete todos
    ['academic', 'lifestyle'].forEach(cat => {
        yesterdayData.todos[cat]?.forEach(todo => {
            //check if not already in today's list
            const exists = todayData.todos[cat].some(
                t => t.text === todo.text && t.duration === todo.duration
            );
            if (!exists) {
                todayData.todos[cat].push({ 
                    text: todo.text,
                    duration: todo.duration,
                    priority: todo.priority || 'medium'
                });
                copiedCount++;
            }
        });
    });
    
    //copy incomplete scheduled tasks
    yesterdayData.schedule?.forEach(item => {
        if (!item.completed) {
            const exists = todayData.todos[item.category].some(
                t => t.text === item.text && t.duration === item.duration
            );
            if (!exists) {
                todayData.todos[item.category].push({ 
                    text: item.text, 
                    duration: item.duration,
                    priority: item.priority || 'medium'
                });
                copiedCount++;
            }
        }
    });
    
    if (copiedCount > 0) {
        saveData();
        renderTodos();
        alert(`Copied ${copiedCount} incomplete task${copiedCount > 1 ? 's' : ''} from yesterday!`);
    } else {
        alert('All yesterday\'s tasks are already in today\'s list!');
    }
}

function openBlockModal() {
    ['A','B','C','D','E','F','G','H'].forEach(block => {
        document.getElementById(`block${block}`).value = blockNames[block] || '';
        document.getElementById(`spare${block}`).checked = blockIsSpare[block] || false;
        toggleBlockInput(block);
    });
    document.getElementById('blockModal').classList.add('active');
}

function closeBlockModal() {
    document.getElementById('blockModal').classList.remove('active');
}

function saveBlocks() {
    ['A','B','C','D','E','F','G','H'].forEach(block => {
        blockNames[block] = document.getElementById(`block${block}`).value.trim();
        blockIsSpare[block] = document.getElementById(`spare${block}`).checked;
    });
    saveData();
    generateTimeSlots();
    closeBlockModal();
}

function toggleBlockInput(block) {
    const spare = document.getElementById(`spare${block}`);
    const input = document.getElementById(`block${block}`);
    input.disabled = spare.checked;
    if (spare.checked) input.value = '';
}

function openDateModal() {
    if (scheduleStartDate) {
        const date = new Date(scheduleStartDate);
        document.getElementById('cycleStartInput').value = date.toISOString().split('T')[0];
    }
    document.getElementById('dateModal').classList.add('active');
}

function closeDateModal() {
    document.getElementById('dateModal').classList.remove('active');
}

function saveStartDate() {
    const input = document.getElementById('cycleStartInput');
    if (input.value) {
        const startDate = new Date(input.value);
        startDate.setHours(0, 0, 0, 0);
        scheduleStartDate = startDate.toISOString();
        saveData();
        generateTimeSlots();
        closeDateModal();
    }
}

//event listeners
document.addEventListener('DOMContentLoaded', () => {
    //click handlers
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn') && e.target.dataset.category) {
            const dayData = getCurrentDayData();
            const cat = e.target.dataset.category;
            const idx = parseInt(e.target.dataset.index);
            dayData.todos[cat].splice(idx, 1);
            saveData();
            renderTodos();
        }
        
        if (e.target.classList.contains('remove-scheduled')) {
            const dayData = getCurrentDayData();
            const idx = parseInt(e.target.dataset.index);
            const item = dayData.schedule[idx];
            dayData.todos[item.category].push({ 
                text: item.text, 
                duration: item.duration,
                priority: item.priority || 'medium'
            });
            dayData.schedule.splice(idx, 1);
            saveData();
            renderTodos();
            renderSchedule();
        }
        
        if (e.target.classList.contains('complete-btn')) {
            const dayData = getCurrentDayData();
            const idx = parseInt(e.target.dataset.index);
            const task = dayData.schedule[idx];
            task.completed = true;
            dayData.completedTasks.push({ text: task.text, timestamp: new Date().toISOString() });
            saveData();
            renderSchedule();
            renderCompletedTasks();
        }
        
        if (e.target.classList.contains('delete-completed')) {
            const dayData = getCurrentDayData();
            const idx = parseInt(e.target.dataset.index);
            dayData.completedTasks.splice(idx, 1);
            saveData();
            renderCompletedTasks();
        }
    });

    //button handlers
    document.getElementById('customizeBtn').addEventListener('click', openCustomizeModal);
    document.getElementById('addTodoBtn').addEventListener('click', addTodo);
    document.getElementById('todoInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });
    
    //auto-fill duration and category based on input
    document.getElementById('todoInput').addEventListener('input', (e) => {
        const text = e.target.value.toLowerCase();
        const template = taskTemplates.find(t => t.text.toLowerCase().includes(text) && text.length > 2);
        if (template) {
            document.getElementById('categorySelect').value = template.category;
            document.getElementById('durationInput').value = template.duration;
            document.getElementById('prioritySelect').value = template.priority || 'medium';
        }
    });
    
    document.getElementById('quickAddBtn')?.addEventListener('click', openQuickAddModal);
    document.getElementById('closeQuickAddBtn')?.addEventListener('click', closeQuickAddModal);
    document.getElementById('copyYesterdayBtn')?.addEventListener('click', copyYesterdayTasks);
    
    document.getElementById('prevDay').addEventListener('click', () => navigateDay(-1));
    document.getElementById('nextDay').addEventListener('click', () => navigateDay(1));
    document.getElementById('editBlocksBtn').addEventListener('click', openBlockModal);
    document.getElementById('setScheduleBtn').addEventListener('click', openDateModal);
    
    //modal buttons
    document.getElementById('cancelCustomizeBtn').addEventListener('click', closeCustomizeModal);
    document.getElementById('saveCustomizeBtn').addEventListener('click', saveCustomization);
    document.getElementById('addShortcutBtn').addEventListener('click', openShortcutModal);
    document.getElementById('cancelShortcutBtn').addEventListener('click', closeShortcutModal);
    document.getElementById('saveShortcutBtn').addEventListener('click', saveShortcut);
    document.getElementById('iconType').addEventListener('change', toggleIconType);
    document.getElementById('shortcutImage').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const preview = document.getElementById('imagePreview');
                const img = document.getElementById('previewImg');
                img.src = event.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
    document.getElementById('cancelBlockBtn').addEventListener('click', closeBlockModal);
    document.getElementById('saveBlockBtn').addEventListener('click', saveBlocks);
    document.getElementById('cancelDateBtn').addEventListener('click', closeDateModal);
    document.getElementById('saveDateBtn').addEventListener('click', saveStartDate);
    
    //spare checkboxes
    ['A','B','C','D','E','F','G','H'].forEach(block => {
        document.getElementById(`spare${block}`).addEventListener('change', () => toggleBlockInput(block));
    });

    //color preview
    document.getElementById('primaryColor').addEventListener('input', (e) => {
        document.getElementById('primaryPreview').style.backgroundColor = e.target.value;
    });

    loadData();
});