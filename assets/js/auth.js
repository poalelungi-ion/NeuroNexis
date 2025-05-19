/**
 * Authentication logic for NEURONEXIS
 * Handles user registration, login, and user data persistence
 */
const STORAGE_KEY = 'neuronexis_users';
const CURRENT_USER_KEY = 'neuronexis_current_user';
const USER_DATA_KEY = 'neuronexis_user_data';
let users = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
let userData = JSON.parse(localStorage.getItem(USER_DATA_KEY)) || {};
let currentUser = localStorage.getItem(CURRENT_USER_KEY) || null;

// Migrate existing accounts to new structure
Object.keys(users).forEach(username => {
    if (!userData[username]) {
        userData[username] = {
            tasks: [],
            reminders: [],
            documents: [],
            chats: [],
            calendarEvents: [],
            emails: [],
            tasksCreated: 0,
            tasksCompleted: 0,
            pomodoroSessionsCompleted: 0,
            language: 'en',
            theme: 'light'
        };
    }
    if (!users[username].profileImage) {
        users[username].profileImage = 'assets/img/profile-img.jpg';
    }
    if (!users[username].googleToken) {
        users[username].googleToken = null;
    }
});
saveUsers();
saveUserData();

// Save users to localStorage
function saveUsers() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// Save user data to localStorage
function saveUserData() {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
}

// Register a new user
function register(username, email, password, name) {
    if (users[username]) {
        return { success: false, message: 'Username already exists!' };
    }

    let hashedPassword;
    try {
        if (typeof md5 === 'function') {
            hashedPassword = md5(password);
        } else {
            console.warn('md5 not available, storing password in plain text (not recommended for production).');
            hashedPassword = password;
        }
    } catch (error) {
        console.error('Error hashing password:', error);
        hashedPassword = password;
    }

    users[username] = { email, password: hashedPassword, name, profileImage: 'assets/img/profile-img.jpg', googleToken: null };
    userData[username] = {
        tasks: [],
        reminders: [],
        documents: [],
        chats: [],
        calendarEvents: [],
        emails: [],
        tasksCreated: 0,
        tasksCompleted: 0,
        pomodoroSessionsCompleted: 0,
        language: 'en',
        theme: 'light'
    };
    saveUsers();
    saveUserData();
    return { success: true, message: 'Registration successful! Redirecting to login...' };
}

// Login with username and password
function login(username, password) {
    console.log('Attempting login for:', username); // Debug log
    const user = users[username];
    if (!user) {
        console.log('User not found:', username);
        return { success: false, message: 'Username not found!' };
    }

    let hashedPassword;
    try {
        if (typeof md5 === 'function') {
            hashedPassword = md5(password);
        } else {
            hashedPassword = password;
        }
    } catch (error) {
        console.error('Error hashing password:', error);
        hashedPassword = password;
    }

    console.log('Hashed password:', hashedPassword, 'Stored password:', user.password); // Debug log
    if (user.password !== hashedPassword) {
        console.log('Password mismatch for:', username);
        return { success: false, message: 'Incorrect password!' };
    }
    currentUser = username;
    localStorage.setItem(CURRENT_USER_KEY, currentUser);
    console.log('Login successful for:', currentUser);
    return { success: true, message: 'Login successful!' };
}

// Update user profile
function updateProfile(username, updates) {
    if (!users[username]) return false;
    users[username] = { ...users[username], ...updates };
    if (userData[username]) {
        userData[username] = { ...userData[username], ...updates };
    }
    saveUsers();
    saveUserData();
    return true;
}

// Change password
function changePassword(username, currentPassword, newPassword) {
    const user = users[username];
    let hashedCurrentPassword;
    try {
        hashedCurrentPassword = typeof md5 === 'function' ? md5(currentPassword) : currentPassword;
    } catch (error) {
        console.error('Error hashing password:', error);
        hashedCurrentPassword = currentPassword;
    }

    if (!user || user.password !== hashedCurrentPassword) {
        return false;
    }

    let hashedNewPassword;
    try {
        hashedNewPassword = typeof md5 === 'function' ? md5(newPassword) : newPassword;
    } catch (error) {
        console.error('Error hashing password:', error);
        hashedNewPassword = newPassword;
    }

    user.password = hashedNewPassword;
    saveUsers();
    return true;
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = 'pages-login.html';
}

// Google Calendar Integration
async function initializeGoogleAPI(clientId) {
    const gapi = window.gapi;
    if (!gapi) {
        console.error('Google API client library not loaded');
        return false;
    }
    try {
        await gapi.load('client:auth2', () => {
            gapi.client.init({
                clientId: clientId,
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                scope: 'https://www.googleapis.com/auth/calendar'
            });
        });
        return true;
    } catch (error) {
        console.error('Error initializing Google API:', error);
        return false;
    }
}

async function connectGoogleCalendar() {
    if (!currentUser || !users[currentUser]) {
        console.log('No user logged in');
        return { success: false, message: 'Please log in first!' };
    }

    if (!await initializeGoogleAPI('YOUR_CLIENT_ID_HERE')) {
        return { success: false, message: 'Failed to initialize Google API' };
    }

    try {
        const authInstance = gapi.auth2.getAuthInstance();
        const response = await authInstance.signIn();
        const token = response.getAuthResponse().access_token;
        users[currentUser].googleToken = token;
        saveUsers();

        // Sync calendar events
        await syncCalendarEvents();
        return { success: true, message: 'Google Calendar connected successfully!' };
    } catch (error) {
        console.error('Google Calendar sign-in error:', error);
        return { success: false, message: 'Failed to connect to Google Calendar' };
    }
}

async function syncCalendarEvents() {
    if (!users[currentUser]?.googleToken) {
        return;
    }
    try {
        const response = await gapi.client.calendar.events.list({
            calendarId: 'primary',
            timeMin: (new Date()).toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime'
        });
        userData[currentUser].calendarEvents = response.result.items.map(event => ({
            summary: event.summary,
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date
        }));
        saveUserData();
    } catch (error) {
        console.error('Error syncing calendar events:', error);
    }
}

// Expose functions globally
window.auth = {
    register,
    login,
    updateProfile,
    changePassword,
    logout,
    connectGoogleCalendar,
    syncCalendarEvents
};