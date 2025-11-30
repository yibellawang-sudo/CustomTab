//display current date
function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', options);
}

//to-do list functionality
let todos = { academic: [], lifestyle: [] }; 

//add function to generate time slots from 6 am to 11pm
function generateTimeSlots() {
    const container = document.getElementById('timeBlocks');
    container.innerHTML = '';

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

        //make time slot a drop zone
        const content = slot.querySelector('.time-slot-content');
        content.addEventListener('dragover', handleDragOver);
        content.addEventListener('drop', handleDrop);

        container.appendChild(slot);
    }

    renderSchedule();
}

//load data
function loadData() {
    chrome.storage.local.get(['todos', 'schedule'], (result) => {
        todos = result.todos || { academic: [], lifestyle: [] };
        schedule = result.schedule || [];
        renderTodos();
        renderSchedule();
    });
}
//save data
function saveTodos() {
    chrome.storage.local.set({ todos, schedule });
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
                    <div class="todo-item-title>${todo.text}</div>
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
    document.querySelectorAll('.scheduled-task').forEach(el => el.remove());

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
let shortcuts = [];

function saveShortcuts() {
    chrome.storage.local.set({ shortcuts });
}

function renderShortcuts() {
    const container = document.getElementById('shortcuts');
    container.innerHTML = '';

    shortcuts.forEach((shortcut, i) => {
        const a = document.createElement('a');
        a.href =shortcut.url;
        a.className= 'shortcut';

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
    addBtn.id = 'addBtn';
    addBtn.innerHTML = '<div class="shortcut-icon plus">+</div><span>Ass Site</span>';
    addBtn.onclick = openModal;
    container.appendChild(addBtn);
}

function deleteShortcut(i) {
    shortcuts.splice(i, 1);
    saveShortcuts();
    renderShortcuts();
}

//modal functionality
const modal = document.getElementById('modal');

function openModal() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            document.getElementById('siteUrl').value = tabs[0].url;
            document.getElementById('siteName').value = tabs[0].title;
        }
    });

    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
    document.getElementById('siteName').value = '';
    document.getElementById('siteUrl').value = '';
    document.getElementById('iconLetter').value ='';
    document.getElementById('iconColor').value = '#4a9eff';
    document.getElementById('iconUpload').value = '';
}

document.getElementById('cancelBtn').onclick = closeModal;

document.getElementById('saveBtn').onclick = () => {
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

//drag n drop todo tasks into timeslots function

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

//event listeners 
document.getElementById('addBtn').addEventListener('click', addTodo);
document.getElementById('todoInput').addEventListener('keypress', (e) => {
    if (e.key === "Enter") addTodo();
});

//remove drop zone when drag leaves
document.addEventListener('dragleave', (e) => {
    if (e.target.classList.contains('time-slot-content')) {
        e.target.parentElement.classList.remove('drop-zone');
    }
});
//init
updateDate();
loadTodos();
loadData();

