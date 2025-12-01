
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
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', options);
    generateTimeSlots();
}

function setScheduleStartDate() {
    const dec2 = new Date('2024-12-02');
    dec2.setHours(0, 0, 0, 0);
    
    const startDate = new Date('2024-11-28');
    startDate.setHours(0, 0, 0, 0);
    
    scheduleStartDate = startDate.toISOString();
    saveTodos();
    updateBlockSchedule();
}

//generate time slots from 6 am to 11pm
function generateTimeSlots() {
    const container = document.getElementById('timeBlocks');
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

        const time = h % 12 === 0 ? 12 : h % 12;
        const ampm = h < 12 ? 'AM' : 'PM';

        slot.innerHTML = `  
            <div class="time-label">${time}:00 ${ampm}</div>
            <div class="time-slot-content"></div>
        `;

        const content = slot.querySelector('.time-slot-content');

        //check if current hour contains a class 
        let classAdded = false;
        classPeriods.forEach((period, idx) => {
            if (h >= Math.floor(period.start) && h < Math.ceil(period.end)) {
                if (!classAdded && todayBlocks.length > 0) {
                    const block = todayBlocks[idx];
                    const className = blockNames[block] || `Block ${block}`;
                    
                    const classDiv = document.createElement('div');
                    classDiv.className = 'scheduled-task class-block';
                    classDiv.innerHTML = `
                        <div class="scheduled-task-title">${className}</div>
                        <div class="scheduled-task-time">${period.label}</div>
                    `;
                    content.appendChild(classDiv);
                    classAdded = true;
                }
            }
        });

        content.addEventListener('dragover', handleDragOver);
        content.addEventListener('drop', handleDrop);

        container.appendChild(slot);
    }

    renderSchedule();
}

//load data
function loadData() {
    chrome.storage.local.get(['todos', 'schedule', 'shortcuts', 'scheduleStartDate', 'blockNames'], (result) => {
        todos = result.todos || { academic: [], lifestyle: [] };
        schedule = result.schedule || [];
        shortcuts = result.shortcuts || [];
        scheduleStartDate = result.scheduleStartDate || null;
        blockNames = result.blockNames || { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '' };
        renderTodos();
        renderSchedule();
        renderShortcuts();
        generateTimeSlots();
        
        //prompt user to set block names if not set
        if (!blockNames.A && !blockNames.B && !scheduleStartDate) {
            openBlockModal();
        }
    });
}

//save data
function saveTodos() {
    chrome.storage.local.set({ todos, schedule, shortcuts, scheduleStartDate, blockNames });
}

function renderTodos() {
    ['academic', 'lifestyle'].forEach(cat => {
        const list = document.getElementById(`${cat}List`);
        list.innerHTML = '';

        todos[cat].forEach((todo, i) => {
            const li = document.createElement('li');
            li.className = 'todo-item';
            li.draggable = true;
            li.dataset.category = cat;
            li.dataset.index = i;

            li.innerHTML = `
                <div class="todo-item-content">
                    <div class="todo-item-title">${todo.text}</div>
                    <div class="todo-item-duration">${todo.duration} min</div>
                </div>
                <button class="delete-btn" onclick="deleteTodo('${cat}', ${i})">x</button>
            `;

            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragend', handleDragEnd);

            list.appendChild(li);
        });
    });
}

//render schedule
function renderSchedule() {
    //clear existing scheduled tasks
    document.querySelectorAll('.scheduled-task:not(.class-block').forEach(el => el.remove());

    //make the height of the block correspond to the length of the task
    schedule.forEach((item, i) => {
        const slot = document.querySelector(`[data-hour="${item.hour}"] .time-slot-content`);
        if (slot) {
            const task = document.createElement('div');
            task.className = `scheduled-task ${item.category}`;
            task.innerHTML = `
                <div class="scheduled-task-title">${item.text}</div>
                <div class="scheduled-task-time">${item.duration} min</div>
                <button class="remove-scheduled" onclick="removeScheduled(${i})">x</button>
            `;
            slot.appendChild(task);
        }
    });
}

//functions for completed tasks (render, complete, delete)

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
            if (input) {
                input.value = blockNames[block] || '';
            }
            //check if spare
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

//function toggle block input if spare checked


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

    //add spare checkbox listeners
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