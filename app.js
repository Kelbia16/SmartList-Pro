let lists = JSON.parse(localStorage.getItem('smartLists')) || [];
let categories = JSON.parse(localStorage.getItem('smartCategories')) || ["To do list", "Shopping list", "Brainstorming list", "Drugo"];
let currentListId = null;
let selectedCategory = null;

function init() {
    saveCategories();
    renderCategories();
    populateCategoryDropdowns();
    checkMobileView();
    window.jsPDF = window.jspdf.jsPDF;
    
    document.getElementById('listName').addEventListener('input', validateListName);
    checkForSharedList(); 
}

function validateListName() {
    const input = document.getElementById('listName');
    if (!input.value.trim()) {
        input.setCustomValidity('Ime seznama je obvezno');
    } else {
        input.setCustomValidity('');
    }
}

function checkMobileView() {
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('active');
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

function populateCategoryDropdowns() {
    const dropdowns = document.querySelectorAll('#listCategory, #editListCategory');
    dropdowns.forEach(dropdown => {
        dropdown.innerHTML = categories.map(cat => `
            <option value="${cat}">${cat}</option>
        `).join('');
    });
}

function saveCategories() {
    localStorage.setItem('smartCategories', JSON.stringify(categories));
}

function renderCategories() {
    const container = document.getElementById('categoryTree');
    container.innerHTML = categories.map(category => `
        <div class="category-item ${selectedCategory === category ? 'active' : ''}" 
             onclick="filterByCategory('${category}')">
            <span>${category}</span>
        </div>
    `).join('');
}

function filterByCategory(category) {
    selectedCategory = category;
    document.getElementById('listContainer').style.display = 'block';
    renderCategories();
    renderLists();
}

function createList() {
    const listNameInput = document.getElementById('listName');
    if (!listNameInput.value.trim()) {
        listNameInput.reportValidity();
        return;
    }

    const newList = {
        id: Date.now(),
        name: listNameInput.value.trim() || "Brez naslova",
        category: document.getElementById('listCategory').value,
        priority: parseInt(document.getElementById('listPriority').value),
        titleColor: '#4a90e2',
        items: [],
        createdAt: new Date()
    };

    lists.push(newList);
    saveAllData();
    clearForm();
    renderLists();
}

function renderLists() {
    const container = document.getElementById('listContainer');
    if (!selectedCategory) {
        container.innerHTML = `<div class="category-prompt">Izberite kategorijo za prikaz seznamov</div>`;
        return;
    }

    const filteredLists = lists.filter(list => list.category === selectedCategory);
    container.innerHTML = `
        <div class="list-controls">
            <label>Sortiraj sezname:</label>
            <select id="sortBy" onchange="sortLists()">
                <option value="name_asc">A-Ž</option>
                <option value="name_desc">Ž-A</option>
                <option value="priority_asc">Prioriteta ▲</option>
                <option value="priority_desc">Prioriteta ▼</option>
            </select>
        </div>
        ${filteredLists.map(list => `
            <div class="list-card" onclick="openList(${list.id})" style="border-left-color: ${list.titleColor}">
                <div class="list-header">
                    <span class="priority">${'★'.repeat(list.priority)}</span>
                    <button class="delete-btn" onclick="deleteList(${list.id}, event)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <h3 style="color: ${list.titleColor}">${list.name}</h3>
                <small>${list.category}</small>
            </div>
        `).join('')}
    `;
}

function sortLists() {
    const sortValue = document.getElementById('sortBy').value;
    const filteredLists = selectedCategory ? 
        lists.filter(list => list.category === selectedCategory) : 
        [...lists];
    
    filteredLists.sort((a, b) => {
        switch(sortValue) {
            case 'name_asc': 
                return a.name.localeCompare(b.name, 'sl', { sensitivity: 'base' });
            case 'name_desc': 
                return b.name.localeCompare(a.name, 'sl', { sensitivity: 'base' });
            case 'priority_asc': 
                return a.priority - b.priority;
            case 'priority_desc': 
                return b.priority - a.priority;
            default: 
                return 0;
        }
    });
    
    const container = document.getElementById('listContainer');
    if (container) {
        container.innerHTML = `
            <div class="list-controls">
                <label>Sortiraj sezname:</label>
                <select id="sortBy" onchange="sortLists()">
                    <option value="name_asc">A-Ž</option>
                    <option value="name_desc">Ž-A</option>
                    <option value="priority_asc">Prioriteta ▲</option>
                    <option value="priority_desc">Prioriteta ▼</option>
                </select>
            </div>
            ${filteredLists.map(list => `
                <div class="list-card" onclick="openList(${list.id})" style="border-left-color: ${list.titleColor}">
                    <div class="list-header">
                        <span class="priority">${'★'.repeat(list.priority)}</span>
                        <button class="delete-btn" onclick="deleteList(${list.id}, event)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <h3 style="color: ${list.titleColor}">${list.name}</h3>
                    <small>${list.category}</small>
                </div>
            `).join('')}
        `;
        
        document.getElementById('sortBy').value = sortValue;
    }
}

function openList(id) {
    currentListId = id;
    const list = lists.find(l => l.id === id);
    
    document.getElementById('editListName').value = list.name;
    document.getElementById('titleColor').value = list.titleColor;
    document.getElementById('editListName').style.color = list.titleColor;
    document.getElementById('fullscreenListName').textContent = list.name;
    document.getElementById('fullscreenListName').style.color = list.titleColor;
    
    renderItems(list.items);
    document.getElementById('listModal').style.display = 'block';
}

function renderItems(items) {
    const container = document.getElementById('itemsContainer');
    const fullscreenContainer = document.getElementById('fullscreenItemsContainer');
    
    container.innerHTML = items.map(item => `
        <div class="item-row">
            <input type="checkbox" ${item.completed ? 'checked' : ''} 
                   onchange="toggleCompleted(${item.id})">
            <span class="${item.completed ? 'completed' : ''}">${item.text}</span>
            <span class="item-priority">${'★'.repeat(item.priority)}</span>
            <button class="delete-item-btn" onclick="deleteItem(${item.id})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    fullscreenContainer.innerHTML = items.map(item => `
        <div class="item-row">
            <span class="${item.completed ? 'completed' : ''}">${item.text}</span>
            <span class="item-priority">${'★'.repeat(item.priority)}</span>
        </div>
    `).join('');
}

function addItem() {
    const input = document.getElementById('newItem');
    if (!input.value.trim()) return;

    const list = lists.find(l => l.id === currentListId);
    list.items.push({
        id: Date.now(),
        text: input.value.trim(),
        priority: parseInt(document.getElementById('itemPriority').value),
        completed: false
    });
    
    input.value = '';
    saveAllData();
    renderItems(list.items);
}

function addItemOnEnter(e) {
    if (e.key === "Enter") addItem();
}

function sortItems() {
    const list = lists.find(l => l.id === currentListId);
    const sortValue = document.getElementById('sortItems').value;
    
    list.items.sort((a, b) => {
        switch(sortValue) {
            case 'text_asc': 
                return a.text.localeCompare(b.text, 'sl', { sensitivity: 'base' });
            case 'text_desc': 
                return b.text.localeCompare(a.text, 'sl', { sensitivity: 'base' });
            case 'priority_asc': 
                return a.priority - b.priority;
            case 'priority_desc': 
                return b.priority - a.priority;
            default: 
                return 0;
        }
    });
    
    renderItems(list.items);
}

function toggleCompleted(itemId) {
    const list = lists.find(l => l.id === currentListId);
    const item = list.items.find(i => i.id === itemId);
    if (item) item.completed = !item.completed;
    saveAllData();
    renderItems(list.items);
}

function deleteItem(itemId) {
    const list = lists.find(l => l.id === currentListId);
    list.items = list.items.filter(item => item.id !== itemId);
    saveAllData();
    renderItems(list.items);
}

function toggleFullscreen() {
    const modalContent = document.querySelector('.modal-content');
    const isFullscreen = modalContent.classList.toggle('fullscreen');
    const fullscreenBtn = document.querySelector('.fullscreen-btn');
    
    if (isFullscreen) {
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        fullscreenBtn.classList.add('fullscreen-active');
    } else {
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        fullscreenBtn.classList.remove('fullscreen-active');
    }
    
    document.querySelector('.edit-mode').style.display = isFullscreen ? 'none' : 'block';
    document.querySelector('.fullscreen-mode').style.display = isFullscreen ? 'flex' : 'none';
    document.querySelector('.modal-footer').style.display = isFullscreen ? 'none' : 'flex';
    
    const list = lists.find(l => l.id === currentListId);
    renderItems(list.items);
}

function exportPDF() {
    const list = lists.find(l => l.id === currentListId);
    if (!list) return;

    const doc = new jsPDF();
    let yPos = 20;
    
    doc.setFontSize(18);
    doc.setTextColor(list.titleColor);
    doc.text(list.name, 20, yPos);
    
    doc.setFontSize(12);
    doc.setTextColor('#000000');
    list.items.forEach((item, index) => {
        yPos += 10;
        doc.text(`${index + 1}. ${item.text} (${'★'.repeat(item.priority)})`, 20, yPos);
    });

    doc.save(`SmartList-${list.name}.pdf`);
}

function shareList() {
    if (!currentListId) return;
    const list = lists.find(l => l.id === currentListId);
    if (!list) return;
    
    const shareData = {
        n: list.name,       
        c: list.category,   
        p: list.priority,    
        t: list.titleColor,  
        i: list.items.map(i => [i.text, i.priority, i.completed ? 1 : 0]) 
    };
    
    const encoded = btoa(JSON.stringify(shareData)).replace(/=/g, '');
    const shareUrl = `${window.location.origin}${window.location.pathname}?s=${encoded}`;
    
    copyToClipboard(shareUrl);
    showNotification("Povezava za deljenje kopirana v odložišče");
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'alert-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2500);
}

function checkForSharedList() {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('s');
    
    if (sharedData) {
        try {
            const decoded = JSON.parse(atob(sharedData + '=='.slice(sharedData.length % 2)));
            const list = {
                id: Date.now(),
                name: decoded.n,
                category: decoded.c,
                priority: decoded.p,
                titleColor: decoded.t,
                items: decoded.i.map(item => ({
                    id: Date.now(),
                    text: item[0],
                    priority: item[1],
                    completed: item[2] === 1
                })),
                createdAt: new Date()
            };
            
            const exists = lists.some(l => l.name === list.name && l.category === list.category);
            if (!exists) {
                lists.push(list);
                saveAllData();
            }
            
            setTimeout(() => {
                openList(list.id);
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 300);
        } catch (e) {
            console.error("Error processing shared list:", e);
        }
    }
}

function deleteList(id, e) {
    e.stopPropagation();
    if (!confirm('Ali ste prepričani?')) return;
    lists = lists.filter(list => list.id !== id);
    saveAllData();
    renderLists();
}

function clearForm() {
    document.getElementById('listName').value = '';
    document.getElementById('listPriority').value = '1';
}

function saveAllData() {
    const list = lists.find(l => l.id === currentListId);
    if (list) {
        list.name = document.getElementById('editListName').value;
        list.titleColor = document.getElementById('titleColor').value;
    }
    localStorage.setItem('smartLists', JSON.stringify(lists));
    localStorage.setItem('smartCategories', JSON.stringify(categories));
    renderCategories();
    renderLists();
}

function closeModal() {
    document.getElementById('listModal').style.display = 'none';
    document.querySelector('.modal-content').classList.remove('fullscreen');
    document.querySelector('.edit-mode').style.display = 'block';
    document.querySelector('.fullscreen-mode').style.display = 'none';
    document.querySelector('.modal-footer').style.display = 'flex';
    document.querySelector('.fullscreen-btn').innerHTML = '<i class="fas fa-expand"></i> <span class="btn-text">Celozaslonsko</span>';
    document.querySelector('.fullscreen-btn').classList.remove('fullscreen-active');
}

window.addEventListener('resize', checkMobileView);
window.addEventListener('load', init);