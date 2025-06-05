const CLIENT_ID = '906465572275-hanrq89dvi0a8bpf2benqdq7quu3njtc.apps.googleusercontent.com';
const API_KEY = 'xai-ebMLEZxbsn9IZ0arKr12U9PH7amQXn4hMuzrTAdF5NTajnHM8ymCLKwdbeqDbS3zSv4j2pho1zcSOAbc';
const SCOPES = 'profile email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
const chatBox = document.getElementById('chat-box');
const form = document.getElementById('input-form');
const input = document.getElementById('user-input');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const typingIndicator = document.querySelector('.typing-indicator');
const micBtn = document.getElementById('mic-btn');
const langSelect = document.getElementById('lang-select');
const tasksReminders = document.getElementById('tasks-reminders');
const dailyRecommendations = document.getElementById('daily-recommendations');
const dailyOverview = document.getElementById('daily-overview');
const dailyOverviewContainer = document.getElementById('daily-overview-container');
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const pomodoroTimer = document.getElementById('pomodoro-timer');
const pomodoroSession = document.getElementById('pomodoro-session');
const pomodoroStartBtn = document.getElementById('pomodoro-start-btn');
const pomodoroPauseBtn = document.getElementById('pomodoro-pause-btn');
const pomodoroResetBtn = document.getElementById('pomodoro-reset-btn');
const pomodoroContainer = document.getElementById('pomodoro-container');
const tasksContainer = document.getElementById('tasks-container');
const recommendationsContainer = document.getElementById('recommendations-container');
const taskEditModal = document.getElementById('task-edit-modal');
const taskEditId = document.getElementById('task-edit-id');
const taskEditName = document.getElementById('task-edit-name');
const taskEditDescription = document.getElementById('task-edit-description');
const taskEditDeadline = document.getElementById('task-edit-deadline');
const taskEditSave = document.getElementById('task-edit-save');
const taskEditCancel = document.getElementById('task-edit-cancel');
const pomodoroToggle = document.getElementById('pomodoro-toggle');
const tasksToggle = document.getElementById('tasks-toggle');
const recommendationsToggle = document.getElementById('recommendations-toggle');
const placeholders = {
    'en-US': { default: 'Type your message...', listening: 'Listening...' },
    'ro-RO': { default: 'Tastează mesajul tău...', listening: 'Ascult...' },
    'ru-RU': { default: 'Введите ваше сообщение...', listening: 'Слушаю...' },
    'es-ES': { default: 'Escribe tu mensaje...', listening: 'Escuchando...' },
    'fr-FR': { default: 'Tapez votre message...', listening: 'Écoute...' }
};
let userData = JSON.parse(localStorage.getItem('userData')) || {};
let currentUser = localStorage.getItem('currentUser');
let tasks = userData[currentUser]?.tasks || [];
let reminders = userData[currentUser]?.reminders || [];
let chatHistory = userData[currentUser]?.chats || [];
let isPomodoroVisible = false;
let isTasksVisible = false;
let isRecommendationsVisible = false;
let accessToken = localStorage.getItem('googleAccessToken');
if (Notification.permission !== 'granted') {
    Notification.requestPermission();
}
function saveUserData() {
    localStorage.setItem('userData', JSON.stringify(userData));
}
function handleCredentialResponse(response) {
    const data = JSON.parse(atob(response.credential.split('.')[1]));
    currentUser = data.email;
    userData[currentUser] = userData[currentUser] || { tasks: [], reminders: [], chats: [], profile: {}, location: null };
    userData[currentUser].profile = {
        name: data.name,
        email: data.email,
        picture: data.picture
    };
    localStorage.setItem('currentUser', currentUser);
    saveUserData();
    initializeGoogleAPI();
    document.getElementById('login-nav').style.display = 'none';
    document.getElementById('profile-nav').style.display = 'block';
    loadProfile();
}
function initializeGoogleAPI() {
    gapi.load('client:auth2', async () => {
        try {
            await gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                scope: SCOPES,
                discoveryDocs: [
                    'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
                    'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
                ]
            });
            const authInstance = gapi.auth2.getAuthInstance();
            if (!authInstance.isSignedIn.get()) {
                await authInstance.signIn();
            }
            accessToken = authInstance.currentUser.get().getAuthResponse().access_token;
            localStorage.setItem('googleAccessToken', accessToken);
            fetchGoogleData();
        } catch (error) {
            console.error('Google API init error:', error);
            addMessage('Eroare la inițializarea Google API. Te rog încearcă din nou.', 'ai');
            logout();
        }
    });
}
async function fetchGoogleData() {
    try {
        await fetchEmails();
        await fetchCalendarEvents();
    } catch (error) {
        console.error('Google data fetch error:', error);
        addMessage('Eroare la preluarea datelor Google. Te rog autentifică-te din nou.', 'ai');
        logout();
    }
}
async function fetchEmails() {
    try {
        const response = await gapi.client.gmail.users.messages.list({
            userId: 'me',
            maxResults: 5,
            q: 'from:* -in:trash'
        });
        const messages = response.result.messages || [];
        const emails = [];
        for (const msg of messages) {
            const msgResponse = await gapi.client.gmail.users.messages.get({
                userId: 'me',
                id: msg.id
            });
            emails.push(msgResponse.result);
        }
        userData[currentUser].emails = emails;
        saveUserData();
        generateDailyOverview();
    } catch (error) {
        console.error('Email fetch error:', error);
    }
}
async function fetchCalendarEvents() {
    try {
        const response = await gapi.client.calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime'
        });
        userData[currentUser].calendarEvents = response.result.items || [];
        saveUserData();
        generateDailyOverview();
    } catch (error) {
        console.error('Calendar fetch error:', error);
    }
}
async function createCalendarEvent(summary, description, startDateTime, endDateTime) {
    try {
        const event = {
            summary: summary,
            description: description,
            start: { dateTime: startDateTime, timeZone: 'UTC' },
            end: { dateTime: endDateTime, timeZone: 'UTC' }
        };
        const response = await gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });
        userData[currentUser].calendarEvents = userData[currentUser]?.calendarEvents || [];
        userData[currentUser].calendarEvents.push(response.result);
        saveUserData();
        generateDailyOverview();
        return response.result;
    } catch (error) {
        console.error('Error creating calendar event:', error);
        addMessage('Eroare la crearea evenimentului în calendar.', 'ai');
        return null;
    }
}
async function analyzeEmails() {
    const emails = userData[currentUser]?.emails || [];
    return emails.filter(email => {
        const subject = email.payload?.headers.find(h => h.name === 'Subject')?.value?.toLowerCase() || '';
        const snippet = email.snippet?.toLowerCase() || '';
        return subject.includes('are you ok') || snippet.includes('are you ok');
    });
}
function logout() {
    if (gapi.auth2) {
        const authInstance = gapi.auth2.getAuthInstance();
        if (authInstance) {
            authInstance.signOut();
        }
    }
    localStorage.removeItem('currentUser');
    localStorage.removeItem('googleAccessToken');
    localStorage.removeItem('userData');
    currentUser = null;
    accessToken = null;
    document.getElementById('login-nav').style.display = 'block';
    document.getElementById('profile-nav').style.display = 'none';
    window.location.href = 'index.html';
}
if (!currentUser || !accessToken) {
    document.getElementById('login-nav').style.display = 'block';
    document.getElementById('profile-nav').style.display = 'none';
} else {
    document.getElementById('login-nav').style.display = 'none';
    document.getElementById('profile-nav').style.display = 'block';
    loadProfile();
}
function loadProfile() {
    const user = userData[currentUser];
    if (user && user.profile) {
        document.getElementById('user-name').textContent = user.profile.name || currentUser;
        document.getElementById('user-fullname').textContent = user.profile.name || currentUser;
        document.getElementById('user-role').textContent = user.profile.email;
        const profileImage = user.profile.picture || 'assets/img/profile-img.jpg';
        document.getElementById('header-profile-image').src = profileImage;
        tasks = user.tasks || [];
        reminders = user.reminders || [];
        chatHistory = user.chats || [];
        renderChatHistory();
        renderTasksReminders();
        generateDailyOverview();
        generateDailyRecommendations();
        scheduleWorkReminder();
        if (accessToken) {
            initializeGoogleAPI();
        }
    }
}
async function requestLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                userData[currentUser].location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    timestamp: new Date().toISOString()
                };
                saveUserData();
                const locationInfo = await getLocationInfo(position.coords.latitude, position.coords.longitude);
                addMessage(`Locația ta: ${locationInfo.city}, ${locationInfo.country}. Recomandările vor fi optimizate.`, 'ai');
            },
            (error) => {
                console.error('Location error:', error);
                addMessage('Nu am putut accesa locația ta. Continuăm fără informații de locație.', 'ai');
            }
        );
    } else {
        addMessage('Geolocația nu este suportată de browser-ul tău.', 'ai');
    }
}
async function getLocationInfo(lat, lon) {
    try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ro`);
        const data = await response.json();
        return {
            city: data.city || 'Necunoscut',
            country: data.countryName || 'Necunoscut'
        };
    } catch (error) {
        console.error('Error fetching location info:', error);
        return { city: 'Necunoscut', country: 'Necunoscut' };
    }
}
toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
});
closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
});
document.querySelector('[data-bs-toggle="dropdown"]').addEventListener('click', () => {
    const dropdown = document.querySelector('.dropdown-menu');
    dropdown.classList.toggle('hidden');
});
pomodoroToggle.addEventListener('click', () => {
    isPomodoroVisible = !isPomodoroVisible;
    pomodoroContainer.style.display = isPomodoroVisible ? 'block' : 'none';
    pomodoroToggle.textContent = isPomodoroVisible ? 'Ascunde Timer Pomodoro' : 'Arată Timer Pomodoro';
});
tasksToggle.addEventListener('click', () => {
    isTasksVisible = !isTasksVisible;
    tasksContainer.style.display = isTasksVisible ? 'block' : 'none';
    tasksToggle.textContent = isTasksVisible ? 'Ascunde Sarcini & Memento-uri' : 'Arată Sarcini & Memento-uri';
});
recommendationsToggle.addEventListener('click', () => {
    isRecommendationsVisible = !isRecommendationsVisible;
    recommendationsContainer.style.display = isRecommendationsVisible ? 'block' : 'none';
    recommendationsToggle.textContent = isRecommendationsVisible ? 'Ascunde Recomandări' : 'Arată Recomandări';
});
let pomodoroState = JSON.parse(localStorage.getItem('pomodoroState')) || {
    active: false,
    paused: false,
    time: 25 * 60,
    isWorkSession: true,
    lastUpdate: Date.now()
};
let pomodoroInterval = null;
function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoroState.time / 60);
    const seconds = pomodoroState.time % 60;
    pomodoroTimer.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    pomodoroSession.textContent = pomodoroState.isWorkSession ? 'Sesiune de Lucru' : 'Pauză';
    pomodoroStartBtn.classList.toggle('hidden', pomodoroState.active && !pomodoroState.paused);
    pomodoroPauseBtn.classList.toggle('hidden', !pomodoroState.active || pomodoroState.paused);
}
function savePomodoroState() {
    localStorage.setItem('pomodoroState', JSON.stringify(pomodoroState));
}
function startPomodoro() {
    if (pomodoroState.active && !pomodoroState.paused) return;
    pomodoroState.active = true;
    pomodoroState.paused = false;
    pomodoroState.lastUpdate = Date.now();
    pomodoroInterval = setInterval(updatePomodoro, 1000);
    updatePomodoroDisplay();
    savePomodoroState();
    if (window.innerWidth <= 1024 && !isPomodoroVisible) {
        isPomodoroVisible = true;
        pomodoroContainer.style.display = 'block';
        pomodoroToggle.textContent = 'Ascunde Timer Pomodoro';
    }
}
function pausePomodoro() {
    pomodoroState.paused = true;
    clearInterval(pomodoroInterval);
    updatePomodoroDisplay();
    savePomodoroState();
}
function resetPomodoro() {
    clearInterval(pomodoroInterval);
    pomodoroState = {
        active: false,
        paused: false,
        time: 25 * 60,
        isWorkSession: true,
        lastUpdate: Date.now()
    };
    updatePomodoroDisplay();
    savePomodoroState();
}
function updatePomodoro() {
    const now = Date.now();
    const elapsed = (now - pomodoroState.lastUpdate) / 1000;
    pomodoroState.time -= elapsed;
    pomodoroState.lastUpdate = now;
    if (pomodoroState.time <= 0) {
        pomodoroState.isWorkSession = !pomodoroState.isWorkSession;
        pomodoroState.time = pomodoroState.isWorkSession ? 25 * 60 : 5 * 60;
        addMessage(`Timpul de ${pomodoroState.isWorkSession ? 'pauză' : 'lucru'} s-a terminat! ${pomodoroState.isWorkSession ? 'Începe sesiunea de lucru.' : 'Ia o pauză de 5 minute.'}`, 'ai');
        if (!pomodoroState.isWorkSession) {
            scheduleWorkReminder();
        }
    }
    updatePomodoroDisplay();
    savePomodoroState();
}
pomodoroStartBtn.addEventListener('click', startPomodoro);
pomodoroPauseBtn.addEventListener('click', pausePomodoro);
pomodoroResetBtn.addEventListener('click', resetPomodoro);
if (pomodoroState.active && !pomodoroState.paused) {
    pomodoroState.lastUpdate = Date.now();
    pomodoroInterval = setInterval(updatePomodoro, 1000);
}
updatePomodoroDisplay();
async function scheduleWorkReminder() {
    const delay = Math.random() * (30 - 5) + 5;
    setTimeout(async () => {
        if (Notification.permission === 'granted') {
            new Notification('E timpul să lucrezi!', {
                body: 'AI-ul tău te îndeamnă să te apuci de lucru.',
                icon: 'assets/img/favicon.png'
            });
        }
        addMessage('E timpul să lucrezi! Hai să ne apucăm de treabă.', 'ai');
        await scheduleNextReminder();
    }, delay * 60 * 1000);
}
async function scheduleNextReminder() {
    const now = new Date();
    const pendingTasks = tasks.filter(task => !task.completed && task.deadline);
    if (pendingTasks.length === 0) {
        setTimeout(scheduleWorkReminder, 60 * 60 * 1000);
        return;
    }
    pendingTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const nearestDeadline = new Date(pendingTasks[0].deadline);
    const timeToDeadline = (nearestDeadline - now) / (1000 * 60);
    let nextReminderDelay;
    if (timeToDeadline <= 30) {
        nextReminderDelay = timeToDeadline / 2;
    } else if (timeToDeadline <= 60) {
        nextReminderDelay = 30;
    } else {
        nextReminderDelay = 60;
    }
    setTimeout(async () => {
        const task = pendingTasks[0];
        if (Notification.permission === 'granted') {
            new Notification(`Memento sarcină: ${task.name}`, {
                body: `Sarcina "${task.name}" este scadentă la ${new Date(task.deadline).toLocaleString()}.`,
                icon: 'assets/img/favicon.png'
            });
        }
        addMessage(`Memento: Sarcina "${task.name}" este scadentă la ${new Date(task.deadline).toLocaleString()}.`, 'ai');
        await scheduleNextReminder();
    }, nextReminderDelay * 60 * 1000);
}
async function addTask(name, description, deadline) {
    const task = { id: Date.now(), name, description, deadline, completed: false };
    tasks.push(task);
    userData[currentUser].tasks = tasks;
    saveUserData();
    renderTasksReminders();
    if (deadline && !isNaN(new Date(deadline).getTime())) {
        await addReminder(`Task: ${name}`, deadline);
    }
    generateDailyOverview();
    if (window.innerWidth <= 1024 && !isTasksVisible) {
        isTasksVisible = true;
        tasksContainer.style.display = 'block';
        tasksToggle.textContent = 'Ascunde Sarcini & Memento-uri';
    }
    return task;
}
async function addReminder(description, deadline) {
    const reminder = { id: Date.now(), description, deadline, notified: false };
    reminders.push(reminder);
    userData[currentUser].reminders = reminders;
    saveUserData();
    renderTasksReminders();
    checkReminders();
    generateDailyOverview();
    return reminder;
}
function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    userData[currentUser].tasks = tasks;
    saveUserData();
    renderTasksReminders();
    generateDailyOverview();
    scheduleNextReminder();
}
function deleteReminder(id) {
    reminders = reminders.filter(reminder => reminder.id !== id);
    userData[currentUser].reminders = reminders;
    saveUserData();
    renderTasksReminders();
    generateDailyOverview();
}
async function toggleTaskCompletion(id) {
    const task = tasks.find(task => task.id === id);
    if (task) {
        task.completed = !task.completed;
        userData[currentUser].tasks = tasks;
        saveUserData();
        renderTasksReminders();
        generateDailyOverview();
        if (task.completed) {
            const feedback = await sendMessageToAI(`Generează feedback pentru sarcina completată: ${task.name} - ${task.description}`);
            addMessage(`Feedback AI: ${feedback}`, 'ai');
            if (Notification.permission === 'granted') {
                new Notification('Sarcină completată!', {
                    body: `Ai finalizat "${task.name}". Feedback: ${feedback}`,
                    icon: 'assets/img/favicon.png'
                });
            }
        }
    }
}
function editTask(id) {
    const task = tasks.find(task => task.id === id);
    if (task) {
        taskEditId.value = task.id;
        taskEditName.value = task.name;
        taskEditDescription.value = task.description;
        taskEditDeadline.value = task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '';
        taskEditModal.style.display = 'flex';
    }
}
taskEditSave.addEventListener('click', async () => {
    const id = parseInt(taskEditId.value);
    const task = tasks.find(task => task.id === id);
    if (task) {
        task.name = taskEditName.value.trim();
        task.description = taskEditDescription.value.trim();
        task.deadline = taskEditDeadline.value ? new Date(taskEditDeadline.value) : null;
        userData[currentUser].tasks = tasks;
        saveUserData();
        renderTasksReminders();
        generateDailyOverview();
        taskEditModal.style.display = 'none';
        await scheduleNextReminder();
    }
});
taskEditCancel.addEventListener('click', () => {
    taskEditModal.style.display = 'none';
});
function renderTasksReminders() {
    tasksReminders.innerHTML = '';
    if (tasks.length > 0) {
        tasks.forEach(task => {
            const div = document.createElement('div');
            div.className = `flex justify-between items-center p-1 md:p-3 rounded-lg bg-gray-50 mb-1 md:mb-2 ${task.completed ? 'bg-green-50 line-through' : ''}`;
            div.innerHTML = `
        <span class="flex items-center text-xs md:text-sm">
          <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskCompletion(${task.id})" class="mr-1 md:mr-2">
          ${task.name}: ${task.description} ${task.deadline ? `(${new Date(task.deadline).toLocaleString()})` : ''}
        </span>
        <div class="flex space-x-2">
          <i class="fa fa-edit text-primary cursor-pointer text-xs md:text-sm" onclick="editTask(${task.id})"></i>
          <i class="fa fa-trash text-danger cursor-pointer text-xs md:text-sm" onclick="deleteTask(${task.id})"></i>
        </div>
      `;
            tasksReminders.appendChild(div);
        });
    }
    if (reminders.length > 0) {
        reminders.forEach(reminder => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-1 md:p-3 rounded-lg bg-gray-50 mb-1 md:mb-2';
            div.innerHTML = `
        <span class="text-xs md:text-sm">${reminder.description} (${new Date(reminder.deadline).toLocaleString()})</span>
        <i class="fa fa-trash text-danger cursor-pointer text-xs md:text-sm" onclick="deleteReminder(${reminder.id})"></i>
      `;
            tasksReminders.appendChild(div);
        });
    }
    if (window.innerWidth <= 1024) {
        const hasItems = tasks.length > 0 || reminders.length > 0;
        tasksToggle.classList.toggle('hidden', !hasItems);
        if (hasItems && !isTasksVisible) {
            isTasksVisible = true;
            tasksContainer.style.display = 'block';
            tasksToggle.textContent = 'Ascunde Sarcini & Memento-uri';
        } else if (!hasItems && isTasksVisible) {
            isTasksVisible = false;
            tasksContainer.style.display = 'none';
            tasksToggle.textContent = 'Arată Sarcini & Memento-uri';
        }
    }
}
function checkReminders() {
    const now = new Date();
    reminders.forEach(reminder => {
        const deadline = new Date(reminder.deadline);
        if (deadline <= now && !reminder.notified) {
            if (Notification.permission === 'granted') {
                new Notification('Memento!', {
                    body: `Memento: ${reminder.description} este scadent acum!`,
                    icon: 'assets/img/favicon.png'
                });
            }
            addMessage(`Memento: ${reminder.description} este scadent acum!`, 'ai');
            reminder.notified = true;
            userData[currentUserData].reminders = reminders;
            saveUserData();
        }
    });
}
setInterval(checkReminders, 60000);
function generateDailyOverview() {
    const today = new Date();
    const emails = userData[currentUser]?.emails || [];
    const events = userData[currentUser]?.calendarEvents || [];
    const pendingTasks = tasks.filter(task => !task.completed && (!task.deadline || new Date(task.deadline) >= today));
    dailyOverview.innerHTML = '';
    if (events.length > 0) {
        const div = document.createElement('div');
        div.className = 'overview-item p-2 md:p-3 rounded-lg bg-gray-50 mb-1 md:mb-2';
        div.innerHTML = `<h4 class="font-semibold text-gray-800 text-xs md:text-sm">Evenimente de astăzi</h4><ul class="list-disc pl-3 md:pl-5">${events.map(e => `<li class="text-xs md:text-sm">${e.summary} (${new Date(e.start.dateTime).toLocaleTimeString()} - ${new Date(e.end.dateTime).toLocaleTimeString()})</li>`).join('')}`</ul>;
        dailyOverview.appendChild(div);
    }
    if (emails.length > 0) {
        emails.forEach(email => {
            const from = email.payload?.headers.find(h => h.name === 'From')?.value || 'Unknown';
            const subject = email.payload?.headers.find(h => h.name === 'Subject')?.value || 'No Subject';
            const snippet = email.snippet.substring?.substring(0, 100) + (email.snippet?.length > 100 ? '...' : '') || '';
            const taskSuggestion = `Răspunde la e-mailul de la ${from}: ${subject}`;
            const div = document.createElement('div');
            div.className = 'overview-item p-2 md:p-3 rounded-lg bg-gray-50 mb-1 md:mb-2';
            div.innerHTML = `
        <p class="text-xs md:text-sm"><strong>De la:</strong> ${from}</p>
        <p class="text-xs md:text-sm"><strong>Subiect:</strong> ${subject}</p>
        <p class="text-xs md:text-sm">${snippet}</p>
        <button onclick="addTask('${taskSuggestion}', null); generateDailyOverview();" class="bg-primary text-white rounded-lg px-2 md:px-4 py-1 md:py-1 mt-1 md:mt-2 hover:bg-indigo-700 text-xs md:text-sm">Adaugă ca sarcină</button>
        `;
            dailyOverview.appendChild(div);
        });
    }
    if (pendingTasks.length > 0) {
        const div = document.createElement('div');
        div.className = 'overview-item p-2 md:p-3 rounded-lg bg-gray-50 mb-1 md:mb-2';
        div.innerHTML = `<h4 class="font-semibold text-gray-800 text-xs md:text-sm">Sarcini pendinte</h4><ul class="list-disc pl-3 md:pl-5">${pendingTasks.map(t => `<li class="text-xs md:text-sm">${t.name}: ${t.description} ${t.deadline ? `(${new Date(t.deadline).toLocaleString()})` : ''}</li>`).join('')}`</ul>;
        dailyOverview.appendChild(div);
    }
}
dailyOverviewContainer.classList.toggle('hidden', !events.length && !emails.length && !pendingTasks.length);
}
function generateDailyRecommendations() {
    const today = new Date();
    const recommendations = ['Începe o sesiune Pomodoro pentru a te concentra pe sarcinile tale!'];
    const pendingTasks = tasks.filter(task => !task.completed && (!task.deadline || new Date(task.deadline) >= today));
    if (pendingTasks.length > 0) {
        recommendations.push('**Priorități de astăzi:**');
        pendingTasks.sort((a, b) => new Date(a.deadline || Infinity) - new Date(b.deadline || Infinity));
        pendingTasks.slice(0, 3).forEach(task => {
            recommendation.push(`- ${task.name}: ${task.description} ${task.deadline ? `(scadent: ${new Date(task.deadline).toLocaleString()})` : '')}`);
        });
    }
    if (userData[currentUser].location) {
        recommendations.push(`**Recomandare locală:** Bazat pe locația ta (${userData[currentUser].location.city}), prioritizează sarcinile care pot fi realizate în apropiere.`);
    }
}
dailyRecommendations.innerHTML = marked.parse(recommendations.join('\n'));
if (window.innerWidth <= 1024) {
    recommendationsToggle.classList.toggle('hidden', pendingTasks.length === 0);
    if (pendingTasks.length > 0 && !isRecommendationsVisible) {
        isRecommendationsVisible = true;
        recommendationsContainer.style.display = 'block';
        recommendationsToggle.textContent = 'Ascende Recomendări';
    }
}
}
}
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = langSelect.value;
    let finalTranscript = '';
    recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript = transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        input.value = finalTranscript + interimTranscript;
    };
    recognition.onstart = () => {
        micBtn.classList.add('bg-red-500', 'hover:bg-red-600');
        input.placeholder = placeholders[langSelect.value].listening;
    };
    recognition.onend = () => {
        micBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
        micBtn.classList.add('bg-success', 'hover:bg-green-600');
        input.placeholder = placeholders[langSelect.value].default;
        if (finalTranscript.trim()) {
            form.dispatchEvent(new Event('submit'));
        }
        finalTranscript = '';
    };
    recognition.onerror = (event) => {
        micBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
        micBtn.classList.add('bg-success', 'hover:bg-green-600');
        input.placeholder = placeholders[langSelect.value].default;
        console.error('Speech recognition error:', error);
        addMessage('Eroare la intrarea vocală. Te rog încearcă din nou.', 'ai');
    };
    micBtn.addEventListener('click', () => {
        if (!micBtn.classList.contains('bg-red-500')) {
            finalTranscript = '';
            recognition.lang = langSelect.value;
            recognition.start();
        } else {
            recognition.stop();
        }
    });
    langSelect.addEventListener('change', () => {
        input.placeholder = placeholders[langSelect.value].default;
    } else {
        micBtn.style.display = 'none';
        langSelect.style.display = 'none';
    }
});
uploadBtn.addEventListener('click', () => {
    fileInput.click();
});
fileInput.addEventListener('change', async () => {
    const files = fileInput.files;
    if (files.length === 0) return;
    typingIndicator.classList.remove('hidden');
    chatBox.scrollTop = chatBox.scrollHeight;
    let fileContents = [];
    for (const file of files) {
        let content;
        if (file.type === 'application/pdf') {
            content = await extractTextFromPDF(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            content = await extractTextFromDocx(file);
        } else {
            content = await readFile(file);
        }
        fileContents.push(`**${file.name}**\n${content}`);
        addMessage(`Încărcat: ${file.name}`, 'user');
    });
    const message = input.value.trim() || 'Analizează documentele încărcate.';
    const combinedMessage = `${message}\n\n${fileContents.join('\n\n')}`;
    const aiResponse = await sendMessageToAI(combinedMessage);
    typingIndicator.classList.add('hidden');
    addMessage(aiResponse, 'ai', true);
    fileInput.value = '';
});
async function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Eroare la citirea fișierului'));
        reader.readAsText(file);
    }));
}
async function extractTextFromPDF(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            text += textContent.items.map(item => item.str).join(' ') + '\n';
        }
        return text;
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return 'Eroare la extragerea textului din PDF.';
    }
}
async function extractTextFromDocx(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer });
        return value;
    } catch (error) {
        console.error('Error extracting DOCX text:', error);
        return 'Error la extragerea textului din DOCX.';
    }
}
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim().toLowerCase();
    if (!message) return;
    addMessage(input.value, 'user');
    input.value = '';
    typingIndicator.classList.remove('hidden');
    chatBox.scrollTop = chatBox.scrollHeight;
    userData[currentUser].chats = userData[currentUser].chats || [];
    userData[currentUser].chats.push({ type: 'user', text: message });
    saveUserData();
    if (message.includes('create document') || message.includes('add contract') || message.includes('contract') || message.includes('orar') || message.includes('schedule') || message.includes('excel')) {
        message.includes('excel') || '') {
            addMessage('Redirecționez către editorul de documente pentru a crea documentul solicitat.', 'ai');
            setTimeout(() => {
                window.location.href = `document-editor.html?query=${encodeURIComponent(message)}`;
            }, 1000);
            typingIndicator.classList.add('hidden');
            return;
        }
        if (message.includes('start pomodoro')) {
            startPomodoro();
            addMessage('Timer Pomodoro a fost pornit! Apasă „Start” pentru a începe.', 'ai');
            typingIndicator.classList.add('hidden');
        } else if (message.includes('create a task') || message.includes('add task') || message.includes('adaugă sarcină') || message.includes('crează un task')) {
            typingIndicator.classList.remove('hidden');
            try {
                const aiResponse = await sendMessageToAI(`Generează un nume și o descriere pentru o sarcină bazată pe: "${message}". Returnează sub forma: **Nume:** [nume]\n**Descriere:** [descriere]\n**Dată limită (opțional):** [data limită sau "fără dată limită"]`);
                typingIndicator.classList.add('hidden');
                let name = 'Sarcină implicită';
                let description = 'Fără descriere';
                let deadline = null;
                const nameMatch = aiResponse.match(/\*\*Nume:\*\* (.*?)(?=\n|$)/);
                const descMatch = aiResponse.match(/\*\*Descriere:\*\* (.*?)(?=\n|$)/);
                const deadlineMatch = aiResponse.match(/\*\*Dată limită \(opțional\):\*\* (.*?)(?=\n|$)/);
                if (nameMatch) name = nameMatch[1].trim();
                if (descMatch) description = descMatch[1].trim();
                if (deadlineMatch && deadlineMatch[1] !== 'fără dată limită') {
                    const parsedDeadline = new Date(deadlineMatch[1]);
                    if (!isNaN(parsedDeadline.getTime())) deadline = parsedDeadline;
                }
                if (message.includes('crearea unui document')) {
                    name = 'Crearea unui document';
                    description = 'Creare document';
                    const now = new Date();
                    now.setHours(now.getHours() + 1);
                    deadline = now;
                }
                const task = await addTask(name, description, deadline);
                let confirmationMessage = `Sarcină adăugată: ${task.name}: ${task.description}`;
                if (task.deadline) {
                    confirmationMessage += ` (scadent: ${new Date(task.deadline).toLocaleString()})`;
                }
                addMessage(confirmationMessage, 'ai');
            } catch (error) {
                typingIndicator.classList.add('hidden');
                addMessage('Eroare la generarea sarcinii.', 'ai');
                console.error('Task creation error:', error);
            }
        } else if (message.includes('show recommendations')) {
            generateDailyRecommendations();
            addMessage('Recomandările zilnice au fost afişate.', 'ai');
            typingIndicator.classList.add('hidden');
        } else if (message.includes('adaugă memento') || message.includes('reminder')) {
            const parts = message.split('la');
            const description = parts[0].replace(/adaugă memento|reminder/i, '').trim();
            const deadline = parts[1] ? new Date(parts[1].trim()) : null;
            if (description && description.trim() && deadline && !isNaN(deadline.getTime())) {
                const reminder = await addReminder(description, deadline);
                addMessage(`Memento adăugat: ${reminder.description} la ${new Date(reminder.deadline).toLocaleString()}`, 'ai');
            } else {
                addMessage('Eroare la adăugarea mementoului. Specifică o descriere și o dată validă.', 'ai');
            }
            typingIndicator.classList.add('hidden');
        } else if (message.includes('create event') || message.includes('add event') || message.includes('eveniment')) {
            const parts = message.split(' la');
            const summary = parts[0].replace(/(create|add)\s*(event|eveniment)/i, '').trim();
            const timeStr = parts[1]?.trim();
            if (summary && timeStr) {
                const startTime = new Date(timeStr);
                const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
                if (!isNaN(startTime.getTime())) {
                    const event = await createCalendarEvent(summary, '', startTime.toISOString(), endTime.toISOString());
                    if (event) {
                        addMessage(`Eveniment creat: ${summary} la ${new Date(event.start.dateTime).toLocaleString()}`, 'ai');
                    }
                } else {
                    addMessage('Data invalidă. Specifică o dată validă.', 'ai');
                }
            } else {
                addMessage('Specifică un titlu și o dată pentru eveniment.', 'ai');
            }
            typingIndicator.classList.add('hidden');
        } else if (message.includes('are you ok') || message.includes('ești ok')) {
            const youOkEmails = await analyzeEmails();
            if (youOkEmails.length > 0) {
                const response = `Am găsit ${youOkEmails.length} e-mailuri care conțin "are you ok":\n` +
                    youOkEmails.map(email => {
                        const from = email.payload?.headers.find(h => h.name === 'From')?.value || 'Unknown';
                        const subject = email.payload?.headers.find(h => h.name === 'Subject')?.value || 'No Subject';
                        return `- De la ${from}: ${subject}`;
                    }).join('\n'));
                addMessage(response, 'ai');
            } else {
                addMessage('Nu am găsit e-mailuri recente cu "are you ok" sau "ești ok".', 'ai');
            }
            typingIndicator.classList.add('hidden');
        } else if (message.includes('calendar') || message.includes('evenimente')) {
            const events = userData[currentUser]?.calendarEvents || [];
            if (events.length > 0) {
                const response = `Evenimentele tale viitoare:\n` +
                    events.map(e => `- ${e.summary} (${new Date(e.start.dateTime).toLocaleString()} - ${new Date(e.end.dateTime).toLocaleString()})`).join('\n'));
                addMessage(response, 'ai');
            } else {
                addMessage('Nu ai evenimente viitoare în calendar.', 'ai');
            }
            typingIndicator.classList.add('hidden');
        } else if (message.includes('location') || message.includes('locație')) {
            const location = userData[currentUser]?.location;
            if (location) {
                const locationInfo = await getLocationInfo(location.latitude, location.longitude);
                addMessage(`Locația ta curentă: ${locationInfo.city}, ${locationInfo.country}.`, 'ai');
            } else {
                addMessage('Nu am informații despre locația ta. Permite accesul pentru recomandări personalizate.', 'ai');
            }
            typingIndicator.classList.add('hidden');
        } else {
            const aiResponse = await sendMessageToAI(message);
            typingIndicator.classList.add('hidden');
            addMessage(aiResponse, 'ai', true);
            userData[currentUser].chats.push({ type: 'ai', text: aiResponse });
            saveUserData();
        }
        generateDailyRecommendations();
        generateDailyOverview();
    });
    function addMessage(text, type, isDocument = false) {
        const div = document.createElement('div');
        div.className = `message ${type} p-1 md:p-3 rounded-lg max-w-[70%] ${type === 'user' ? 'bg-primary text-white ml-auto rounded-br-none' : 'bg-soft text-gray-800 rounded-bl-none'} animate-slideIn shadow-sm`;
        let generalContent = text;
        let documentContent = '';
        const documentMarker = '===DOCUMENTATION===';
        const documentEndMarker = '===END_DOCUMENTATION===';
        if (isDocument && text.includes(documentMarker)) {
            const startIdx = text.indexOf(documentMarker) + documentMarker.length;
            const endIdx = text.includes(documentEndMarker) ? text.indexOf(documentEndMarker) : text.length;
            documentContent = text.slice(startIdx, endIdx).trim();
            generalContent = text.slice(0, startIdx - documentMarker.length).trim() + text.slice(endIdx + documentEndMarker.length).trim();
            div.classList.add('border-2', 'border-primary');
        }
        if (generalContent) {
            const renderedHtml = marked.parse(generalContent);
            const contentDiv = document.createElement('div');
            contentDiv.innerHTML = renderedHtml;
            contentDiv.className = 'prose prose-sm max-w-none text-xs md:text-sm';
            div.appendChild(contentDiv);
        }
        if (documentContent && type === 'ai') {
            const openBtn = document.createElement('button');
            openBtn.className = 'mt-1 md:mt-2 bg-primary text-white rounded-lg px-2 md:px-4 py-1 md:py-1 hover:bg-indigo-700 flex items-center text-xs md:text-sm';
            openBtn.innerHTML = '<i class="fas fa-file-alt mr-1 md:mr-2"></i>Deschide în Editorul de Documente';
            openBtn.addEventListener('click', () => {
                window.location.href = `document-editor.html?content=${encodeURIComponent(documentContent)}`;
            });
            div.appendChild(openBtn);
        }
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    function renderChatHistory() {
        chatHistory.forEach(chat => {
            addMessage(chat.text, chat.type, chat.text.includes('===DOCUMENTATION==='));
        });
    }
    async function sendMessageToAI(message) {
        try {
            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: 'grok-2',
                    messages: [
                        {
                            role: 'system',
                            content: 'Ești un asistent AI pentru productivitate, care ajută cu organizarea calendarului, e-mailurilor, sarcinilor și oferă memento-uri inteligente. Răspunde în română, folosind markdown (titluri cu **text**, liste, blocuri de cod cu ```). Pentru documente generate (ex. contracte, orare), include conținutul între ===DOCUMENTATION=== și ===END_DOCUMENTATION===. Pentru sarcini sau memento-uri, extrage informațiile relevante (descriere, dată limită) și returnează un răspuns structurat. Oferă recomandări zilnice bazate pe sarcinile utilizatorului și locația acestuia, dacă este disponibilă.'
                        },
                        { role: 'user', content: message }
                    ],
                    stream: false,
                    temperature: 0.7,
                    max_tokens: 4096
                })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.choices[0].message.content || 'Îmi pare rău, nu am primit un răspuns de la AI.';
        } catch (error) {
            console.error('Error:', error);
            return 'Eroare la conectarea cu API-ul xAI Grok. Cheia API poate fi invalidă sau serviciul indisponibil.';
        }
    }
    window.addEventListener('resize', () => {
        const height = window.innerHeight - (document.getElementById('header').offsetHeight + document.querySelector('footer').offsetHeight + 20);
        chatBox.style.maxHeight = `${height * 0.6}px`;
        dailyOverview.style.maxHeight = `${height * 0.6}px`;
        tasksReminders.style.maxHeight = `${height * 0.4}px`;
    });
    window.dispatchEvent(new Event('resize'));
    input.placeholder = placeholders[langSelect.value].default;
    document.getElementById('logout-btn').addEventListener('click', logout);
    window.addEventListener('load', () => {
        if (!currentUser) {
            google.accounts.id.initialize({
                client_id: CLIENT_ID,
                callback: handleCredentialResponse,
                scope: 'profile email'
            });
            google.accounts.id.renderButton(
                document.getElementById('google-login-btn'),
                { theme: 'outline', size: 'large' }
            );
        } else {
            requestLocation();
            initializeGoogleAPI();
        }
    });
</script>