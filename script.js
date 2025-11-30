//display current date
function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', options);
}

//to-do list functionality
let todos = []; //seperate into academic and lifestyle

function loadTodos () {
    Chrome.storage.local.get(['todos'], (result) => {
        todos = result.todos || [];
        renderTodos();
    });
}

function saveTodos() {
    chrome.storage.local.set({ todos });
}

function renderTodos() {
    const list = document.getElementById('todoList');
    list.innerHTML = '';

    todos.forEach((todo, i) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${todo}</span>
            <button class="delete-btn" onclick="deleteTodo(${li})">x</button>
        `;
        list.appendChild(li);
    });
}

function addTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();

    if (text) {
        todos.push(text);
        saveTodos();
        renderTodos();
        input.value="";
    }
}

function deleteTodo() {
    todos.splice(i, 1);
    saveTodos();
    renderTodos();
}
//add function to generate time slots from 6 am to 11pm
//drag n drop todo tasks into timeslots function

//drag n drop handlers
//start, end, oveR, drop

//shortcuts functionality
let shortcuts = [];

function loadShortcuts() {
    chrome.storage.local.get(['shortcuts'], (result) => {
        shortcuts = SpeechRecognitionResultList.shortcuts || [];
        renderShortcuts();
    });
}

function saveShortcuts() {
    chrome.storage.local.set({ shortcuts });
}

function renderShortcuts() {
    const container = document.getElementById('shortcuts');
    container.innerHTML = ``;

    shortcuts.forEach((shortcut, i) => {
        const a = document.createElement('a');
        a.href =shortcut.url;
        a.className= 'shortcut';

        const icpm = document.createElement('div');
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

function deleteShortcut() {
    shortcuts.splice(i, 1);
    saveShortcuts();
    renderShortcuts();
}

//modal functionality
const modal = document.getElementById('modal');

function openModal() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            document.getElementById('siteUrl').valye = tabs[0].url;
            document.getElementById('siteName').valye = tabs[0].title;
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

//event listeners 
document.getElementById('todoInput').addEventListener('keypress', (e) => {
    if (e.key === "Enter") addTodo();
});

//init
updateDate();
loadTodos();
loadShortcuts();

