/**
 * Authentication logic for NEURONEXIS
 * Handles user registration, login, and user data persistence
 */
const STORAGE_KEY = 'neuronexis_users';
const CURRENT_USER_KEY = 'neuronexis_current_user';
let users = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
let userData = JSON.parse(localStorage.getItem('neuronexis_user_data')) || {};
let currentUser = localStorage.getItem(CURRENT_USER_KEY) || null;

// Save users to localStorage
function saveUsers() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// Save user data to localStorage
function saveUserData() {
    localStorage.setItem('neuronexis_user_data', JSON.stringify(userData));
}

// Register a new user
function register(username, email, password, name) {
    if (users[username]) {
        return { success: false, message: 'Username already exists!' };
    }

    let hashedPassword;
    try {
        if (typeof md5 === 'function') {
            hashedPassword = md5(password); // Using md5 for password hashing
        } else {
            console.warn('md5 not available, storing password in plain text (not recommended for production).');
            hashedPassword = password; // Fallback to plain text
        }
    } catch (error) {
        console.error('Error hashing password:', error);
        hashedPassword = password; // Fallback to plain text
    }

    users[username] = { email, password: hashedPassword, name, profileImage: 'assets/img/profile-img.jpg', googleToken: null };
    userData[username] = { tasks: [], reminders: [], chats: [], calendarEvents: [], emails: [] };
    saveUsers();
    saveUserData();
    return { success: true, message: 'Registration successful! Redirecting to login...' };
}

// Login with username and password
function login(username, password) {
    const user = users[username];
    if (!user) {
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

    if (user.password !== hashedPassword) {
        return { success: false, message: 'Incorrect password!' };
    }
    currentUser = username;
    localStorage.setItem(CURRENT_USER_KEY, currentUser);
    return { success: true, message: 'Login successful!' };
}

// Update user profile
function updateProfile(username, updates) {
    if (!users[username]) return false;
    users[username] = { ...users[username], ...updates };
    saveUsers();
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