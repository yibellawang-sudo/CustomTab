//display current date
function updateDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', options);
}

//to-do list functionality
let todos = [];

function loadTodos () {
    Chrome.storage.local.get(['todos'], (result) => {
        todos = result.todos || [];
        renderTodos();
    });
}

function saceTodos() {
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

//event listeners
document.getElementById('todoInput').addEventListener('keypress', (e) => {
    if (e.key === "Enter") addTodo();
});

//init
updateDate();
loadTodos();