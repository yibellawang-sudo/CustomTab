
//data structures
let todos = { academic: [], lifestyle: [] }; 
let shortcuts = [];
let schedule = [];
let scheduleStartDate = null;
let blockNames = {
    A: '', B: '', C: '', D: '',
    E: '', F: '', G: '', H: ''
};

//variable checking if the blocks are spares
let blockIsSpare = {
    A: false, B: false, C: false, D: false,
    E: false, F: false, G: false, H: false
}

let completedTasks = [];

//block rotation schedule
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

// Class periods with their time slots - should take up corresponding space in schedule
const classPeriods = [
    { period: 1, start: 8.75, end: 10.083, label: '8:45-10:05' },   // 8:45 = 8.75, 10:05 = 10.083
    { period: 2, start: 10.75, end: 12.25, label: '10:45-12:15' },  // 10:45 = 10.75, 12:15 = 12.25
    { period: 3, start: 13, end: 14.25, label: '1:00-2:15' },       // 1:00 = 13, 2:15 = 14.25
    { period: 4, start: 14.417, end: 15.75, label: '2:25-3:45' }    // 2:25 = 14.417, 3:45 = 15.75
];

//display current date
function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const el = document.getElementById('date');
    if (el) el.textContent = now.toLocaleDateString('en-US', options);
    generateTimeSlots();
}

function setScheduleStartDate() {    
    const startDate = new Date('2024-11-28');
    startDate.setHours(0, 0, 0, 0);
    
    scheduleStartDate = startDate.toISOString();
    saveTodos();
    updateBlockSchedule();
    generateTimeSlots();
}

//generate time slots from 6 am to 11pm
function generateTimeSlots() {
    const container = document.getElementById('timeBlocks');
    if (!container) return;

    //consistent sizing for absolute positioning strat
    const hrs = 23 - 6 + 1;
    container.style.position = 'relative';
    container.style.height = `${hrs + 60}px`;
    container.style.boxSizing = 'border-box';

    container.innerHTML = '';

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
        slot.style.borderBottom = '1px solid rgba(0, 0, 0, 0.06)';

        const time = h % 12 === 0 ? 12 : h % 12;
        const ampm = h < 12 ? 'AM' : 'PM';

        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLable.style.position = 'absolute';
        timeLable.style.left = '8px';
        timeLable.style.top = '12px';
        timeLable.style.width = '90px';
        timeLable.textContent = `${time}:00 ${ampm}`;

        slot.appendChild(timeLabel);

        const content = document.createElement('div');
        content.className = 'time-slot-content';
        content.style.position = 'absolute';
        content.style.left = '110px';
        content.style.right = '8px';
        content.style.top = '0';
        content.style.height = '60px';
        content.style.overflow = 'visible'; // allow overflow
        slot.appendChild(content);

        slot.innerHTML = `  
            <div class="time-label">${time}:00 ${ampm}</div>
            <div class="time-slot-content"></div>
        `;

        //check if current hour contains a class 
        if (todayBlocks.length = 0) {
            classPeriods.forEach((period, idx) => {
                if (h === Math.floor(period.start)) {
                    const block = todayBlocks[idx];
                    if (!blockIsSpare[block]) {
                        const className = blockNames[block] || `Block ${block}`;
                        
                        const classDiv = document.createElement('div');
                        classDiv.className = 'scheduled-task class-block';
                        classDiv.style.position = 'absolute';
                        classDiv.style.left = '110px';
                        classDiv.style.top = '0';
                        classDiv.style.height = `${Math.ceil((period.end - period.start) * 60)}px`;
                        classDiv.style.width = `calc(100% - 120px)`;
                        classDiv.innerHTML = `
                            <div class="scheduled-task-title">${className}</div>
                            <div class="scheduled-task-time">${period.label}</div>
                        `;
                        slot.appendChild(classDiv);
                    }
                }
            });
        }

        container.appendChild(slot);
    }

    renderSchedule();
}

//load data
function loadData() {
    try {
        chrome.storage.local.get(['todos', 'schedule', 'shortcuts', 'scheduleStartDate', 'blockNames'], (result) => {
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

//save data
function saveTodos() {
    try {
        chrome.storage.local.set({ todos, schedule, shortcuts, scheduleStartDate, blockNames, blockIsSpare, completedTasks });
    } catch (e) {
        try {
            localStorage.setItem('todos', JSON.stringify(todos));
            localStorage.setItem('schedule', JSON.stringify(schedule));
            localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
            localStorage.setItem('scheduleStartDate', JSON.stringify(scheduleStartDate));
            localStorage.setItem('blockNames', JSON.stringify(blockNames));
            localStorage.setItem('blockIsSpare', JSON.stringify(blockIsSpare));
            localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
        } catch (err) { /*ignore*/ }
    }
}

function loadFromFallback() {
    try {
        const t = localStorage.getItem('todos');
        if (t) todos = JSON.parse(t);

        const s = localStorage.getItem('schedule');
        if (s) todos = JSON.parse(t);

        const sc = localStorage.getItem('shortcuts');
        if (sc) todos = JSON.parse(t);

        const sd = localStorage.getItem('scheduleStartDate');
        if (sd) todos = JSON.parse(t);

        const bn = localStorage.getItem('blockNames');
        if (bn) todos = JSON.parse(t);

        const bis = localStorage.getItem('blockIsSpare');
        if (bis) todos = JSON.parse(t);

        const ct = localStorage.getItem('completedTasks');
        if (ct) todos = JSON.parse(t);
    } catch (e) { /*ignore*/ }
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

            const content = document.createElement('div');
            content.className = 'todo-item-content';

            const title = document.createElement('div');
            title.className = 'todo-item-title';
            title.textContent = todo.text;

            const dur = document.createElement('div');
            dur.className = 'todo-item-duration';
            dur.textContent `${todo.duration} min`;
            
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

//render schedule
function renderSchedule() {
    const container = document.getElementById('timeBlocks');
    if (!contaier) return;

    //clear existing scheduled tasks
    document.querySelectorAll('.scheduled-task[data0scheduled="true"]').forEach(el => el.remove());

    const hrs = 23 - 6 + 1;
    container.style.position = 'relative';
    container.style.height = `${hrs * 60}px`;

    schedule.forEach((item, i) => {
        const startHr = item.hour;
        const startMin = item.startMin || 0;
        const minutesFromStart = (startHour - 6) * 60 + startMin;
        const height = item.duration;

        const task = document.createElement('div');
        task.className = `scheduled-task ${item.category} ${item.completed ? 'completed' : 'incomplete'}`;
        task.dataset.scheduled = "true";
        task.dataset.index = i;
        task,style.position = 'absolute';
        task,style.left = '110px';
        task,style.width = 'calc(100% - 120px';
        task,style.top = `${minutesFromStart}px`;
        task,style.height = `${height}`;
        task,style.boxSizing = 'border-box';
        task,style.padding = '6px';
        task,style.borderRadius = '6px' ;
        task,style.overflow = 'hidden';

        const title = document.createElement('div');
        title.className = 'scheduled-task-title';
        title.textContent = item.text;

        const timeInfo = document.createElement('div');
        timeInfo.className = 'scheduled-task-time';
        timeInfo.textContent = `${item.duration} min`;

        const controls = document.createElement('div');
        controls.className = 'scheduled-controls';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove=scheduled';
        removeBtn.textContent = 'x';
        removeBtn.dataset.index = i;

        const completeBtn = document.createElement('button');
        completeBtn.className = 'complete-btn';
        completeBtn.textContent = '√';
        completeBtn.dataset.index = i;

        controls.appendChild(removeBtn);
        controls.appendChild(completeBtn);

        task.appendChild(title);
        task.appendChild(timeInfo);
        task.appendChild(controls);

        container.appendChild(task);
    });
}

//completed tasks functionality
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
        title.textContent = task.takk;

        content.appendChild(title);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-completed';
        deleteBtn.textContent = 'x';
        deleteBtn.dataset.index = i;

        li.appenChild(content);
        li.appendChild(deleteBtn);

        container.appendChild(li);
    });
}

function completeTask(i) {
    const task = schedule[i];

    task.completed = true;

    completedTasks.push({
        text: task.text,
        timestamp: new Date().toISOString()
    });

    saveTodos();
    renderSchedule();
    renderCompletedTasks();
}


function removeCompleted(i) {
    completedTasks.splice(Number(i), 1);
    saveTodos();
    renderCompletedTasks();
}

function addTodo() {
    const input = document.getElementById('todoInput');
    const category = document.getElementById('categorySelect').value;
    const duration = parseInt(document.getElementById('durationInput').value) || 30;
    const text = input.value.trim();

    if (text) {
        todos[category].push({ text, duration });
        saveTodos();
        renderTodos();
        input.value="";
    }
}

function deleteTodo(cat, i) {
    todos[cat].splice(i, 1);
    saveTodos();
    renderTodos();
}

//remove scheduled task
function removeScheduled(i) {
    const item = schedule[i];
    //add back to list
    todos[item.category].push({ text: item.text, duration: item.duration });
    schedule.splice(i, 1);
    saveTodos();
    renderTodos();
    renderSchedule();
}

//shortcuts functionality
function saveShortcuts() {
    chrome.storage.local.set({ shortcuts });
}

function renderShortcuts() {
    const container = document.getElementById('shortcuts');
    container.innerHTML = '';

    shortcuts.forEach((shortcut, i) => {
        const a = document.createElement('a');
        a.href = shortcut.url;
        a.className = 'shortcut';

        const icon = document.createElement('div');
        icon.className = 'shortcut-icon';

        if (shortcut.image) {
            const img = document.createElement('img');
            img.src = shortcut.image;
            icon.appendChild(img);
        } else {
            icon.style.backgroundColor = shortcut.color;
            icon.textContent = shortcut.letter.toUpperCase();
        }

        const name = document.createElement('span');
        name.textContent = shortcut.name;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-shortcut';
        deleteBtn.textContent = 'x';
        deleteBtn.onclick = (e) => {
            e.preventDefault();
            deleteShortcut(i);
        };

        a.appendChild(icon);
        a.appendChild(name);
        a.appendChild(deleteBtn);
        container.appendChild(a);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'shortcut add-shortcut';
    addBtn.innerHTML = '<div class="shortcut-icon plus">+</div><span>Add Site</span>';
    addBtn.onclick = openModal;
    container.appendChild(addBtn);
}

function deleteShortcut(i) {
    shortcuts.splice(i, 1);
    saveShortcuts();
    renderShortcuts();
}

//modal functionality
function openModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                document.getElementById('siteUrl').value = tabs[0].url;
                document.getElementById('siteName').value = tabs[0].title;
            }
        });
        modal.classList.add('active');
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('siteName').value = '';
        document.getElementById('siteUrl').value = '';
        document.getElementById('iconLetter').value = '';
        document.getElementById('iconColor').value = '#4a9eff';
        document.getElementById('iconUpload').value = '';
    }
}

//block modal functionality
function openBlockModal() {
    const blockModal = document.getElementById('blockModal');
    if (blockModal) {
        // Populate current values
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(block => {
            const input = document.getElementById(`block${block}`);
            if (input) input.value = blockNames[block] || '';
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
    if (blockModal) {
        blockModal.classList.remove('active');
    }
}

function toggleBlockInput(block) {
    const spare = document.getElementById(`spare${block}`);
    const input = document.getElementById(`block${block}`);
    if (spare && input) {
        input.disabled = spare.checked;
        if (spare.checked) {
            input.value = '';
        }
    }
}


//setup event listeners after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    // Modal buttons
    const modal = document.getElementById('modal');
    if (modal) {
        const cancelBtn = document.getElementById('cancelBtn');
        const saveBtn = document.getElementById('saveBtn');
        
        if (cancelBtn) cancelBtn.onclick = closeModal;
        
        if (saveBtn) {
            saveBtn.onclick = () => {
                const name = document.getElementById('siteName').value.trim();
                const url = document.getElementById('siteUrl').value.trim();
                const letter = document.getElementById('iconLetter').value.trim() || name[0] || 'X';
                const color = document.getElementById('iconColor').value;
                const file = document.getElementById('iconUpload').files[0];

                if (!name || !url) return;

                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        shortcuts.push({ name, url, image: e.target.result });
                        saveShortcuts();
                        renderShortcuts();
                        closeModal();
                    };
                    reader.readAsDataURL(file);
                } else {
                    shortcuts.push({ name, url, letter, color });
                    saveShortcuts();
                    renderShortcuts();
                    closeModal();
                }
            };
        }
    }

    // Block modal buttons
    const blockModal = document.getElementById('blockModal');
    if (blockModal) {
        const cancelBlockBtn = document.getElementById('cancelBlockBtn');
        const saveBlockBtn = document.getElementById('saveBlockBtn');
        
        if (cancelBlockBtn) cancelBlockBtn.onclick = closeBlockModal;
        
        if (saveBlockBtn) {
            saveBlockBtn.onclick = () => {
                ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(block => {
                    const input = document.getElementById(`block${block}`);
                    if (input) {
                        blockNames[block] = input.value.trim();
                    }
                    //if spare
                });
                
                // Set start date if not already set
                if (!scheduleStartDate) {
                    const startDate = new Date('2024-11-28');
                    startDate.setHours(0, 0, 0, 0);
                    scheduleStartDate = startDate.toISOString();
                }
                
                saveTodos();
                updateBlockSchedule();
                closeBlockModal();
            };
        }
    }

    // Schedule buttons
    const setScheduleBtn = document.getElementById('setScheduleBtn');
    const editBlocksBtn = document.getElementById('editBlocksBtn');
    
    if (setScheduleBtn) setScheduleBtn.onclick = setScheduleStartDate;
    if (editBlocksBtn) editBlocksBtn.onclick = openBlockModal;

    // Todo buttons
    const addTodoBtn = document.getElementById('addTodoBtn');
    const todoInput = document.getElementById('todoInput');
    
    if (addTodoBtn) addTodoBtn.addEventListener('click', addTodo);
    if (todoInput) {
        todoInput.addEventListener('keypress', (e) => {
            if (e.key === "Enter") addTodo();
        });
    }

    //spare checkbox listeners
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(block => {
        const spare = document.getElementById(`spare${block}`);
        if (spare) {
            spare.addEventListener('change', () => toggleBlockInput(block));
        }
    });
});

//drag n drop handlers
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = {
        category: this.dataset.category,
        index: parseInt(this.dataset.index),
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
    this.parentElement.classList.add('drop-zone');
}

function handleDrop(e) {
    e.preventDefault();
    this.parentElement.classList.remove('drop-zone');

    if(draggedItem) {
        const hour = parseInt(this.parentElement.dataset.hour);

        //add to schedule
        schedule.push({
            ...draggedItem,
            hour
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
    if (e.target.classList.contains('time-slot-content')) {
        e.target.parentElement.classList.remove('drop-zone');
    }
});

//init
updateDate();
generateTimeSlots();
loadData();