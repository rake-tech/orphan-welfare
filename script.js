/* script.js */

// --- REALISTIC DATASET ---
const realOrphanages = [
    { name: "S.K.C.V. Children's Trust", city: "Vijayawada", contact: "08662576666" },
    { name: "Nirmal Hriday", city: "Vijayawada", contact: "08662475555" },
    { name: "SOS Children's Village", city: "Hyderabad", contact: "04027752775" },
    { name: "Aman Vedika", city: "Hyderabad", contact: "04027663344" },
    { name: "Shishu Mandir", city: "Bangalore", contact: "08025253333" },
    { name: "Sneha Sadan", city: "Mumbai", contact: "02226873688" },
    { name: "Salaam Baalak Trust", city: "Delhi", contact: "01123681803" },
    { name: "Udhavum Karangal", city: "Chennai", contact: "04426216421" }
];

let isAdminMode = false;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
});

function formatForCall(phone) {
    if(!phone) return '';
    return phone.replace(/[^0-9+]/g, '');
}

// --- NAVIGATION ---
function hideAllViews() { document.querySelectorAll('.view').forEach(v => v.classList.add('hidden')); }
function showHome() { hideAllViews(); document.getElementById('home-view').classList.remove('hidden'); }
function showLogin() { hideAllViews(); document.getElementById('login-view').classList.remove('hidden'); }

function showDashboard() {
    hideAllViews();
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    currentUser = JSON.parse(localStorage.getItem('orphanage_user'));
    
    if(currentUser) {
        document.getElementById('user-display-name').textContent = currentUser.name;
        document.getElementById('user-display-area').textContent = currentUser.city;
        
        populateOrphanageDropdown(currentUser.city);
        showSingleRecommendation(currentUser.city);
    }
    loadCareData();
    loadServiceData();
}

// --- FILTERED RECOMMENDATION LOGIC ---
function showSingleRecommendation(city) {
    const box = document.getElementById('recommendation-box');
    const cleanCity = city.trim().toLowerCase();
    
    const match = realOrphanages.find(o => o.city.toLowerCase().includes(cleanCity) || cleanCity.includes(o.city.toLowerCase()));
    
    if(match) {
        box.innerHTML = `
            <div class="rec-text">
                <span>Nearest Center in <strong>${match.city}</strong>:</span><br>
                <span class="rec-name">🏠 ${match.name}</span>
            </div>
            <a href="tel:${formatForCall(match.contact)}" class="btn-primary" style="padding:8px 15px; text-decoration:none; width:auto;">📞 Call Now</a>
        `;
        box.classList.remove('hidden');
    } else {
        box.innerHTML = `<span class="rec-text">No registered match in your city. Please enter details manually below.</span>`;
        box.classList.remove('hidden');
    }
}

// --- POPULATE DROPDOWN (FILTERED + MANUAL OPTION) ---
function populateOrphanageDropdown(city) {
    const select = document.getElementById('target-orphanage');
    const cleanCity = city.trim().toLowerCase();
    
    // 1. Filter orphanages strictly by city
    const nearby = realOrphanages.filter(org => org.city.toLowerCase().includes(cleanCity));
    
    select.innerHTML = `<option value="">-- Select Orphanage --</option>`;
    
    // 2. Add filtered options
    if (nearby.length > 0) {
        nearby.forEach(org => {
            select.innerHTML += `<option value="${org.name} (${org.city})">${org.name} - ${org.city}</option>`;
        });
    } else {
        // Optional: Indicate no matches inside dropdown
        select.innerHTML += `<option value="" disabled>No orphanages found in ${city}</option>`;
    }

    // 3. ALWAYS Add "Other" option for manual entry
    select.innerHTML += `<option value="OTHER">Other (Enter Manually)</option>`;
}

// --- HANDLE MANUAL INPUT TOGGLE ---
function checkManualInput(selectElement) {
    const manualInput = document.getElementById('manual-orphanage-input');
    if (selectElement.value === 'OTHER') {
        manualInput.classList.remove('hidden');
        manualInput.required = true;
    } else {
        manualInput.classList.add('hidden');
        manualInput.required = false;
        manualInput.value = ''; // Clear value
    }
}

// --- AUTH ---
function checkLoginStatus() {
    if (localStorage.getItem('orphanage_user')) showDashboard();
    else showHome();
}
function logout() { localStorage.removeItem('orphanage_user'); currentUser = null; showHome(); }

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = {
        name: document.getElementById('login-name').value,
        contact: document.getElementById('login-contact').value,
        city: document.getElementById('login-area').value
    };
    localStorage.setItem('orphanage_user', JSON.stringify(user));
    currentUser = user;
    showDashboard();
});

// --- IMAGE COMPRESSOR ---
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxSize = 300;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxSize) { height *= maxSize / width; width = maxSize; }
            } else {
                if (height > maxSize) { width *= maxSize / height; height = maxSize; }
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.7));
        }
    }
}

// --- 1. CARE REPORT ---
document.getElementById('care-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const file = document.getElementById('care-photo').files[0];
    const checkboxes = document.querySelectorAll('input[name="care-need"]:checked');
    const needs = Array.from(checkboxes).map(cb => cb.value).join(', ');

    if (!currentUser) { alert("Please login first"); return; }

    if (file) {
        compressImage(file, (base64Img) => {
            const record = {
                id: Date.now(),
                photo: base64Img,
                age: document.getElementById('care-age').value,
                loc: document.getElementById('care-location').value,
                cat: document.getElementById('care-category').value,
                needs: needs,
                status: 'Pending',
                reporterName: currentUser.name,
                reporterContact: currentUser.contact
            };
            saveData('care_data', record);
            e.target.reset();
            document.getElementById('upload-text').innerText = "Photo Uploaded!";
            loadCareData();
        });
    } else {
        alert("Please upload a photo.");
    }
});

// --- 2. SERVICE BOOKING (UPDATED WITH MANUAL INPUT LOGIC) ---
document.getElementById('service-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const dropdownVal = document.getElementById('target-orphanage').value;
    const manualVal = document.getElementById('manual-orphanage-input').value;
    
    // Determine which name to save
    let finalOrphanageName = dropdownVal;
    if (dropdownVal === 'OTHER') {
        if (!manualVal.trim()) { alert("Please type the orphanage name."); return; }
        finalOrphanageName = manualVal + " (Manual Entry)";
    }

    const record = {
        id: Date.now(),
        orphanage: finalOrphanageName,
        type: document.getElementById('service-type').value,
        time: `${document.getElementById('service-date').value} @ ${document.getElementById('service-time').value}`,
        status: 'Pending'
    };
    saveData('service_data', record);
    e.target.reset();
    
    // Reset manual input visibility
    document.getElementById('manual-orphanage-input').classList.add('hidden');
    
    loadServiceData();
});

// --- DATA HANDLING ---
function saveData(key, item) {
    let data = JSON.parse(localStorage.getItem(key) || '[]');
    data.push(item);
    try {
        localStorage.setItem(key, JSON.stringify(data));
        alert("Submitted Successfully!");
    } catch(e) {
        alert("Storage Full. Please clear old data.");
    }
}

function toggleAdminMode() {
    isAdminMode = document.getElementById('admin-toggle').checked;
    const cols = document.querySelectorAll('.admin-col');
    cols.forEach(c => isAdminMode ? c.classList.remove('hidden') : c.classList.add('hidden'));
    loadCareData();
    loadServiceData();
}

function loadCareData() {
    const data = JSON.parse(localStorage.getItem('care_data') || '[]');
    const tbody = document.querySelector('#care-table tbody');
    tbody.innerHTML = '';
    data.forEach(item => {
        let btn = (isAdminMode && item.status === 'Pending') 
            ? `<button class="btn-small" onclick="markCompleted('care_data', ${item.id})">Mark Done</button>` : '';
        let actionCell = isAdminMode ? `<td>${btn}</td>` : ''; 

        const callLink = `tel:${formatForCall(item.reporterContact)}`;

        tbody.innerHTML += `
            <tr>
                <td><img src="${item.photo}" class="care-img-thumb"></td>
                <td>
                    <b>${item.cat}</b><br>
                    <small>Loc: ${item.loc}</small><br>
                    <small style="color:red">Needs: ${item.needs}</small>
                </td>
                <td>
                    ${item.reporterName}<br>
                    <a href="${callLink}" class="contact-link">📞 ${item.reporterContact}</a>
                </td>
                <td class="status-${item.status}">${item.status}</td>
                ${actionCell}
            </tr>
        `;
    });
}

function loadServiceData() {
    const data = JSON.parse(localStorage.getItem('service_data') || '[]');
    const tbody = document.querySelector('#service-table tbody');
    tbody.innerHTML = '';
    data.forEach(item => {
        let btn = (isAdminMode && item.status === 'Pending') 
            ? `<button class="btn-small" onclick="markCompleted('service_data', ${item.id})">Mark Done</button>` : '';
        let actionCell = isAdminMode ? `<td>${btn}</td>` : ''; 

        tbody.innerHTML += `
            <tr>
                <td><b>${item.orphanage}</b></td>
                <td>${item.type}<br><small>${item.time}</small></td>
                <td class="status-${item.status}">${item.status}</td>
                ${actionCell}
            </tr>
        `;
    });
}

function markCompleted(key, id) {
    let data = JSON.parse(localStorage.getItem(key) || '[]');
    data = data.map(i => { if(i.id === id) i.status = 'Completed'; return i; });
    localStorage.setItem(key, JSON.stringify(data));
    if(key === 'care_data') loadCareData(); else loadServiceData();
}