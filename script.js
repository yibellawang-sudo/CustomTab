let todos = { academic: [], lifestyle: [] };
let shortcuts = [];
let schedule = [];
let scheduleStartDate = null;
let blockNames = {
    A: '', B: '', C: '', D: '',
    E: '', F: '', G: '', H: ''
};

let blockIsSpare = {
    A: false, B: false, C: false, D: false,
    E: false, F: false, G: false, H: false
};

let completedTasks = [];

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

function saveTodos() {
    try {
        chrome.storage.local.set({ todos, schedule, shortcuts, scheduleStartDate, blockNames, blockIsSpare, completedTasks });
    } catch (e) {
        //fallback for non-extension environments (helps local testing)
        try {
            localStorage.setItem('todos', JSON.stringify(todos));
            localStorage.setItem('schedule', JSON.stringify(schedule));
            localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
            localStorage.setItem('scheduleStartDate', scheduleStartDate);
            localStorage.setItem('blockNames', JSON.stringify(blockNames));
            localStorage.setItem('blockIsSpare', JSON.stringify(blockIsSpare));
            localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
        } catch (err) { /* ignore */ }
    }
}

function loadFromFallback() {
    try {
        const t = localStorage.getItem('todos');
        if (t) todos = JSON.parse(t);
        const s = localStorage.getItem('schedule');
        if (s) schedule = JSON.parse(s);
        const sc = localStorage.getItem('shortcuts');
        if (sc) shortcuts = JSON.parse(sc);
        const sd = localStorage.getItem('scheduleStartDate');
        if (sd) scheduleStartDate = sd;
        const bn = localStorage.getItem('blockNames');
        if (bn) blockNames = JSON.parse(bn);
        const bis = localStorage.getItem('blockIsSpare');
        if (bis) blockIsSpare = JSON.parse(bis);
        const ct = localStorage.getItem('completedTasks');
        if (ct) completedTasks = JSON.parse(ct);
    } catch (e) { /* ignore */ }
}

function loadData() {
    //try chrome.storage first; fallback to localStorage
    try {
        chrome.storage.local.get(['todos', 'schedule', 'shortcuts', 'scheduleStartDate', 'blockNames', 'blockIsSpare', 'completedTasks'], (result) => {
            todos = result.todos || { academic: [], lifestyle: [] };
            schedule = result.schedule || [];
            shortcuts = result.shortcuts || [];
            scheduleStartDate = result.scheduleStartDate || null;
            blockNames = result.blockNames || { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' };
            blockIsSpare = result.blockIsSpare || { A: false, B: false, C: false, D: false, E: false, F: false, G: false, H: false };
            completedTasks = result.completedTasks || [];
            postLoadInit();
        });
    } catch (e) {
        //not in extension env; use localStorage fallback
        loadFromFallback();
        postLoadInit();
    }
}

function postLoadInit() {
    renderTodos();
    renderShortcuts();
    renderCompletedTasks();
    generateTimeSlots();

    if (!blockNames.A && !blockNames.B && !scheduleStartDate) {
        openBlockModal();
    }
}

function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const el = document.getElementById('date');
    if (el) el.textContent = now.toLocaleDateString('en-US', options);
    generateTimeSlots();
}

function setScheduleStartDate() {
    const input = document.getElementById('cycleStartInput');
    if (!input || !input.value) {
        alert("Please select the date that was Day 1");
        return;
    }
    const startDate = new Date(input.value);
    startDate.setHours(0, 0, 0, 0);

    scheduleStartDate = startDate.toISOString();
    saveTodos();
    generateTimeSlots();
}

function generateTimeSlots() {
    const pendingClasses = [];
    const container = document.getElementById('timeBlocks');
    if (!container) return;

    //ensure consistent sizing for absolute positioning strategy
    const hours = 23 - 6 + 1; 
    container.style.position = 'relative';
    container.style.height = `${hours * 60}px`;
    container.style.boxSizing = 'border-box';

    container.innerHTML = ''; //clear

    let todayBlocks = [];
    if (scheduleStartDate) {
        const startDate = new Date(scheduleStartDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);

        const dayOfWeek = today.getDay();

        //no classes on weekends
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            let weekdayCount = 0;
            let currentDate = new Date(startDate);

            while (currentDate < today) {
                const day = currentDate.getDay();
                if (day !== 0 && day !== 6) {
                    weekdayCount++;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const cycleDay = weekdayCount % 8;
            todayBlocks = blockRotation[cycleDay];
        }
    }

    //create hour rows (as visual grid background). Each row is 60px tall.
    for (let h = 6; h <= 23; h++) {
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        slot.dataset.hour = h;
        slot.style.position = 'absolute';
        slot.style.left = '0';

        slot.style.top = `${(h - 6) * 60}px`;
        slot.style.height = '60px';
        slot.style.width = '100%';
        slot.style.boxSizing = 'border-box';
        slot.style.borderBottom = '1px solid rgba(0,0,0,0.06)';

        const time = h % 12 === 0 ? 12 : h % 12;
        const ampm = h < 12 ? 'AM' : 'PM';

        //time label 
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.style.position = 'absolute';
        timeLabel.style.left = '8px';
        timeLabel.style.top = '12px';
        timeLabel.style.width = '90px';
        timeLabel.textContent = `${time}:00 ${ampm}`;

        slot.appendChild(timeLabel);

        //placeholder for class blocks
        const content = document.createElement('div');
        content.className = 'time-slot-content';
        content.style.position = 'absolute';
        content.style.left = '110px';
        content.style.right = '8px';
        content.style.top = '0';
        content.style.height = '60px';
        content.style.overflow = 'visible'; 
        slot.appendChild(content);

        content.addEventListener('dragover', handleDragOver);
        content.addEventListener('drop', handleDrop);

        if (todayBlocks.length > 0) {
            classPeriods.forEach((period, idx) => {
                const block = todayBlocks[idx];
                if (blockIsSpare[block]) return;

                const className = blockNames[block] || `Block ${block}`;

                const classDiv = document.createElement('div');
                classDiv.className = 'scheduled-task class-block';
                classDiv.style.position = 'absolute';

                const minutesFrom6 = (period.start - 6) * 60;
                const height = (period.end - period.start) * 60;

                classDiv.style.left = '110px';
                classDiv.style.top = `${minutesFrom6}px`;
                classDiv.style.height = `${height}px`;

                classDiv.innerHTML = `
                    <div class="scheduled-task-title">${className}</div>
                    <div class="scheduled-task-time">${period.label}</div>
                `;
                pendingClasses.push(classDiv);
            })
        }
        container.appendChild(slot);
    }
    pendingClasses.forEach(c => container.appendChild(c));

    // after creating the grid, render schedule items
    renderSchedule();
}

function renderTodos() {
    ['academic', 'lifestyle'].forEach(cat => {
        const list = document.getElementById(`${cat}List`);
        if (!list) return;
        list.innerHTML = '';

        todos[cat].forEach((todo, i) => {
            const li = document.createElement('li');
            li.className = 'todo-item';
            li.draggable = true;
            li.dataset.category = cat;
            li.dataset.index = i;

            //create inner structure without inline handlers
            const content = document.createElement('div');
            content.className = 'todo-item-content';

            const title = document.createElement('div');
            title.className = 'todo-item-title';
            title.textContent = todo.text;

            const dur = document.createElement('div');
            dur.className = 'todo-item-duration';
            dur.textContent = `${todo.duration} min`;

            content.appendChild(title);
            content.appendChild(dur);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'x';
            deleteBtn.dataset.category = cat;
            deleteBtn.dataset.index = i;

            li.appendChild(content);
            li.appendChild(deleteBtn);

            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragend', handleDragEnd);

            list.appendChild(li);
        });
    });
}

function renderSchedule() {
    const container = document.getElementById('timeBlocks');
    if (!container) return;

    //remove previous scheduled-task elements that were created from schedule (mark them with data-scheduled)
    container.querySelectorAll('.scheduled-task[data-scheduled="true"]').forEach(el => el.remove());

    //ensure container has proper height
    const hours = 23 - 6 + 1;
    container.style.position = 'relative';
    container.style.height = `${hours * 60}px`;

    schedule.forEach((item, i) => {
        const startHour = item.hour;
        const startMinute = item.startMinute || 0; 
        const minutesFrom6 = (startHour - 6) * 60 + startMinute;
        const height = item.duration; 

        const task = document.createElement('div');
        task.className = `scheduled-task ${item.category} ${item.completed ? 'completed' : 'incomplete'}`;
        task.dataset.scheduled = "true";
        task.dataset.index = i;

        task.style.top = `${minutesFrom6}px`;
        task.style.height = `${height}px`;

        if (item.completed) {
            task.style.background = '#999';
            task.style.color = '#222';
        } else {
            task.style.background = '#ff5e5eff';
            task.style.color = '#222';
        }

        //build inner content via nodes
        const title = document.createElement('div');
        title.className = 'scheduled-task-title';
        title.textContent = item.text;

        const timeInfo = document.createElement('div');
        timeInfo.className = 'scheduled-task-time';
        timeInfo.textContent = `${item.duration} min`;

        const controls = document.createElement('div');
        controls.className = 'scheduled-controls';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-scheduled';
        removeBtn.textContent = '✖';
        removeBtn.dataset.index = i;

        const completeBtn = document.createElement('button');
        completeBtn.className = 'complete-btn';
        completeBtn.textContent = "\u2713";
        completeBtn.dataset.index = i;

        controls.appendChild(removeBtn);
        controls.appendChild(completeBtn);

        task.appendChild(title);
        task.appendChild(timeInfo);
        task.appendChild(controls);

        container.appendChild(task);
    });
}


//complete task functionality
function renderCompletedTasks() {
    const container = document.getElementById('completedList');
    if (!container) return;

    container.innerHTML = '';

    completedTasks.forEach((task, i) => {
        const li = document.createElement('li');
        li.className = 'completed-item';

        const content = document.createElement('div');
        content.className = 'completed-content';

        const title = document.createElement('div');
        title.className = 'completed-title';
        title.textContent = task.text;

        content.appendChild(title);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-completed';
        deleteBtn.textContent = 'x';
        deleteBtn.dataset.index = i;

        li.appendChild(content);
        li.appendChild(deleteBtn);

        container.appendChild(li);
    });
}

function completeTask(i) {
    const idx = Number(i);
    if (!schedule[idx]) return;

    const task = schedule[idx];

    //mark visually complete
    task.completed = true;

    //add to completed list for record
    completedTasks.push({
        text: task.text,
        timestamp: new Date().toISOString()
    });

    saveTodos();
    renderSchedule();
    renderCompletedTasks();
}

//remove completed list item
function removeCompleted(i) {
    completedTasks.splice(Number(i), 1);
    saveTodos();
    renderCompletedTasks();
}

//todo functionality
function addTodo() {
    const input = document.getElementById('todoInput');
    if (!input) return;
    const categoryEl = document.getElementById('categorySelect');
    const durationEl = document.getElementById('durationInput');
    const category = categoryEl ? categoryEl.value : 'academic';
    const duration = durationEl ? (parseInt(durationEl.value) || 30) : 30;
    const text = input.value.trim();

    if (text) {
        todos[category].push({ text, duration });
        saveTodos();
        renderTodos();
        input.value = "";
    }
}

function deleteTodo(cat, i) {
    todos[cat].splice(Number(i), 1);
    saveTodos();
    renderTodos();
}

function removeScheduled(i) {
    const idx = Number(i);
    if (!schedule[idx]) return;
    const item = schedule[idx];
    //add back to list
    if (!todos[item.category]) {
        todos[item.category] = [];
    }
    todos[item.category].push({ text: item.text, duration: item.duration });
    schedule.splice(idx, 1);
    saveTodos();
    renderTodos();
    renderSchedule();
}

function saveShortcuts() {
    try {
        chrome.storage.local.set({ shortcuts });
    } catch (e) {
        localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
    }
}

function renderShortcuts() {
    const container = document.getElementById('shortcuts');
    if (!container) return;
    container.innerHTML = '';

    shortcuts.forEach((shortcut, i) => {
        const a = document.createElement('a');
        a.href = shortcut.url;
        a.className = 'shortcut';
        a.target = '_blank';
        a.rel = 'noopener';

        const icon = document.createElement('div');
        icon.className = 'shortcut-icon';

        if (shortcut.image) {
            const img = document.createElement('img');
            img.src = shortcut.image;
            icon.appendChild(img);
        } else {
            icon.style.backgroundColor = shortcut.color || '#666';
            icon.textContent = (shortcut.letter || shortcut.name?.[0] || 'X').toUpperCase();
        }

        const name = document.createElement('span');
        name.textContent = shortcut.name || '';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-shortcut';
        deleteBtn.textContent = 'x';
        deleteBtn.dataset.index = i;

        a.appendChild(icon);
        a.appendChild(name);
        a.appendChild(deleteBtn);
        container.appendChild(a);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'shortcut add-shortcut';
    const plusIcon = document.createElement('div');
    plusIcon.className = 'shortcut-icon plus';
    plusIcon.textContent = '+';
    addBtn.appendChild(plusIcon);
    addBtn.appendChild(document.createElement('span')).textContent = 'Add Site';
    addBtn.dataset.action = 'open-shortcut-modal';
    container.appendChild(addBtn);
}

function deleteShortcut(i) {
    shortcuts.splice(Number(i), 1);
    saveShortcuts();
    renderShortcuts();
}

function openModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        try {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs && tabs[0]) {
                    const urlEl = document.getElementById('siteUrl');
                    const nameEl = document.getElementById('siteName');
                    if (urlEl) urlEl.value = tabs[0].url;
                    if (nameEl) nameEl.value = tabs[0].title;
                }
            });
        } catch (e) { /* ignore */ }

        modal.classList.add('active');
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('active');
        const nameEl = document.getElementById('siteName');
        const urlEl = document.getElementById('siteUrl');
        const letterEl = document.getElementById('iconLetter');
        const colorEl = document.getElementById('iconColor');
        const uploadEl = document.getElementById('iconUpload');

        if (nameEl) nameEl.value = '';
        if (urlEl) urlEl.value = '';
        if (letterEl) letterEl.value = '';
        if (colorEl) colorEl.value = '#666';
        if (uploadEl) uploadEl.value = '';
    }
}

function openBlockModal() {
    const blockModal = document.getElementById('blockModal');
    if (blockModal) {
        ['A','B','C','D','E','F','G','H'].forEach(block => {
            const input = document.getElementById(`block${block}`);
            if (input) {
                input.value = blockNames[block] || '';
            }
            const spare = document.getElementById(`spare${block}`);
            if (spare) {
                spare.checked = blockIsSpare[block] || false;
                toggleBlockInput(block);
            }
        });
        blockModal.classList.add('active');
    }
}

function closeBlockModal() {
    const blockModal = document.getElementById('blockModal');
    if (blockModal) blockModal.classList.remove('active');
}

// Add new functions for date modal
function openDateModal() {
    const dateModal = document.getElementById('dateModal');
    if (dateModal) {
        const dateInput = document.getElementById('cycleStartInput');
        if (dateInput && scheduleStartDate) {
            const date = new Date(scheduleStartDate);
            const yr = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateInput.value = `${yr}-${month}-${day}`;
        }
        dateModal.classList.add('active');
    }
}

function closeDateModal() {
    const dateModal = document.getElementById('dateModal');
    if (dateModal) dateModal.classList.remove('active');
}

function saveStartDate() {
    const input = document.getElementById('cycleStartInput');
    if (!input || !input.value) {
        alert("Please select the date that was Day 1");
        return;
    }
    const startDate = new Date(input.value);
    startDate.setHours(0, 0, 0, 0);

    scheduleStartDate = startDate.toISOString();
    saveTodos();
    generateTimeSlots();
    closeDateModal();
}

function toggleBlockInput(block) {
    const spare = document.getElementById(`spare${block}`);
    const input = document.getElementById(`block${block}`);
    if (spare && input) {
        input.disabled = spare.checked;
        if (spare.checked) {
            input.value = '';
        }
        blockIsSpare[block] = spare.checked;
    }
}

//create/update a small block display summary
function updateBlockSchedule() {
    const container = document.getElementById('blockDisplay');
    if (!container) return;
    container.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'block-row';
    ['A','B','C','D','E','F','G','H'].forEach(block => {
        const box = document.createElement('div');
        box.className = 'block-box';
        box.textContent = blockNames[block] || block;
        if (blockIsSpare[block]) {
            box.style.opacity = '0.5';
        }
        row.appendChild(box);
    });
    container.appendChild(row);
}

let draggedItem = null;

function handleDragStart(e) {
    //`this` is li
    draggedItem = {
        category: this.dataset.category,
        index: parseInt(this.dataset.index, 10),
        text: todos[this.dataset.category][this.dataset.index].text,
        duration: todos[this.dataset.category][this.dataset.index].duration
    };
    this.classList.add('dragging');
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    //highlight target hour slot
    const parent = this.closest('.time-slot');
    if (parent) {
        parent.classList.add('drop-zone');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const parent = this.closest('.time-slot');
    if (parent) {
        parent.classList.remove('drop-zone');
    }

    if (draggedItem && parent) {
        const hour = parseInt(parent.dataset.hour, 10);

        schedule.push({
            ...draggedItem,
            hour,
            startMinute: 0
        });

        //remove from todo list
        todos[draggedItem.category].splice(draggedItem.index, 1);

        saveTodos();
        renderTodos();
        renderSchedule();

        draggedItem = null;
    }
}

//remove drop zone when drag leaves
document.addEventListener('dragleave', (e) => {
    if (e.target.classList && e.target.classList.contains('time-slot-content')) {
        e.target.parentElement.classList.remove('drop-zone');
    }
});

document.addEventListener('click', (e) => {
    const target = e.target;

    //delete todo
    if (target.classList.contains('delete-btn')) {
        const cat = target.dataset.category;
        const idx = target.dataset.index;
        if (cat != null && idx != null) {
            deleteTodo(cat, idx);
        }
        return;
    }

    //remove scheduled
    if (target.classList.contains('remove-scheduled')) {
        const idx = target.dataset.index;
        removeScheduled(idx);
        return;
    }

    //complete scheduled
    if (target.classList.contains('complete-btn')) {
        const idx = target.dataset.index;
        completeTask(idx);
        return;
    }

    //delete shortcut
    if (target.classList.contains('delete-shortcut')) {
        const idx = target.dataset.index;
        deleteShortcut(idx);
        return;
    }

    //open shortcut modal if add button clicked
    if (target.closest && target.closest('.add-shortcut')) {
        openModal();
        return;
    }

    //delete completed item
    if (target.classList.contains('delete-completed')) {
        const idx = target.dataset.index;
        removeCompleted(idx);
        return;
    }
});

document.addEventListener('keydown', (e) => {
    const todoInput = document.getElementById('todoInput');
    if (!todoInput) return;
    if (document.activeElement === todoInput && e.key === 'Enter') {
        addTodo();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const cancelBtn = document.getElementById('cancelBtn');
    const saveBtn = document.getElementById('saveBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {

            const nameEl = document.getElementById('siteName');
            const urlEl = document.getElementById('siteUrl');
            const letterEl = document.getElementById('iconLetter');
            const colorEl = document.getElementById('iconColor');
            const uploadEl = document.getElementById('iconUpload');

            const name = nameEl ? nameEl.value.trim() : '';
            const url = urlEl ? urlEl.value.trim() : '';
            const letter = letterEl ? letterEl.value.trim() : '';
            const color = colorEl ? colorEl.value : '#cc0000';
            const file = uploadEl ? uploadEl.files[0] : null;

            if (!name || !url) return;

            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    shortcuts.push({ name, url, image: ev.target.result });
                    saveShortcuts();
                    renderShortcuts();
                    closeModal();
                };
                reader.readAsDataURL(file);
            } else {
                shortcuts.push({ name, url, letter: letter || name[0] || 'X', color });
                saveShortcuts();
                renderShortcuts();
                closeModal();
            }
        });
    }

    // Block modal buttons
    const cancelBlockBtn = document.getElementById('cancelBlockBtn');
    const saveBlockBtn = document.getElementById('saveBlockBtn');
    if (cancelBlockBtn) cancelBlockBtn.addEventListener('click', closeBlockModal);
    if (saveBlockBtn) {
        saveBlockBtn.addEventListener('click', () => {
            ['A','B','C','D','E','F','G','H'].forEach(block => {
                const input = document.getElementById(`block${block}`);
                const spare = document.getElementById(`spare${block}`);
                if (input) blockNames[block] = input.value.trim();
                if (spare) blockIsSpare[block] = spare.checked;
            });

            saveTodos();
            updateBlockSchedule();
            generateTimeSlots();
            closeBlockModal();
        });
    }

    // Date modal buttons
    const cancelDateBtn = document.getElementById('cancelDateBtn');
    const saveDateBtn = document.getElementById('saveDateBtn');
    if (cancelDateBtn) cancelDateBtn.addEventListener('click', closeDateModal);
    if (saveDateBtn) saveDateBtn.addEventListener('click', saveStartDate);

    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-scheduled")) {
            removeScheduled(e.target.dataset.index);
        }
        if (e,target.classList.contains("complete-btn")) {
            completeTask(e.target.dataset.index);
        }
    });

    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-completed")) {
            removeCompleted(e.target.dataset.index);
        }
    });

    //schedule buttons
    const setScheduleBtn = document.getElementById('setScheduleBtn');
    const editBlocksBtn = document.getElementById('editBlocksBtn');
    if (setScheduleBtn) setScheduleBtn.addEventListener('click', openDateModal);
    if (editBlocksBtn) editBlocksBtn.addEventListener('click', openBlockModal);


    //todo buttons
    const addTodoBtn = document.getElementById('addTodoBtn');
    const todoInput = document.getElementById('todoInput');
    if (addTodoBtn) addTodoBtn.addEventListener('click', addTodo);
    if (todoInput) {
        todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTodo();
        });
    }

    //spare checkbox listeners
    ['A','B','C','D','E','F','G','H'].forEach(block => {
        const spare = document.getElementById(`spare${block}`);
        if (spare) {
            spare.addEventListener('change', () => toggleBlockInput(block));
        }
    });

    // initial load of stored data
    loadData();
});

updateDate();
