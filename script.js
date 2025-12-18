// ------------------ SUPABASE CONFIG ------------------
const supabaseUrl = "https://njliejijdkgyjrdvhwep.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbGllamlqZGtneWpyZHZod2VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzA1MTEsImV4cCI6MjA4MTYwNjUxMX0.s4taBieCX-WZJ_9__I93SuTAcjwcPDZItIbAngBsG4Y";
const sb = supabase.createClient(supabaseUrl, supabaseKey);

let user = null;
let tasks = [];

// ------------------ AUTH LOGIC ------------------
const authBox = document.getElementById("auth");
const app = document.querySelector(".app");

document.getElementById("loginBtn").onclick = async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Enter email and password.");
        return;
    }

    // Try Login
    const { data: signInData, error: signInError } = await sb.auth.signInWithPassword({ email, password });

    if (signInError) {
        console.log("Login failed: " + signInError.message);
        
        // If login fails, attempt Signup ONCE
        const { error: signUpError } = await sb.auth.signUp({ email, password });
        
        if (signUpError) {
            alert("Signup Error: " + signUpError.message);
            return;
        } else {
            alert("Account created! Now click Login again.");
            return;
        }
    }

    // Success: Reload app
    checkUser();
};

async function checkUser() {
    const { data } = await sb.auth.getUser();
    user = data.user;
    
    if (user) {
        authBox.style.display = "none";
        app.style.display = "block";
        loadTasks();
    }
}

// ------------------ TASK OPERATIONS ------------------
const titleInput = document.getElementById("title");
const noteInput = document.getElementById("note");
const scheduleInput = document.getElementById("schedule");

document.getElementById("add").onclick = async () => {
    if (!titleInput.value || !user) return;
    
    const { error } = await sb.from("tasks").insert([{
        user_id: user.id,
        title: titleInput.value,
        note: noteInput.value,
        schedule: scheduleInput.value,
        completed: false
    }]);

    if (error) {
        console.error("Insert error:", error.message);
        alert("Failed to add task: " + error.message);
    } else {
        titleInput.value = noteInput.value = scheduleInput.value = "";
        loadTasks();
    }
};

async function loadTasks() {
    const { data, error } = await sb.from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Load error:", error.message);
    } else {
        tasks = data || [];
        renderTasks();
        renderCalendar();
        renderCharts();
    }
}

function renderTasks() {
    const ul = document.getElementById("tasks");
    ul.innerHTML = "";
    tasks.forEach(t => {
        const li = document.createElement("li");
        li.className = t.completed ? "completed" : "";
        li.innerHTML = `<strong>${t.title}</strong><br><small>${t.note || ""}</small>`;
        li.onclick = async () => {
            await sb.from("tasks").update({ completed: !t.completed }).eq("id", t.id);
            loadTasks();
        };
        ul.appendChild(li);
    });
}

// ------------------ CALENDAR ------------------
let current = new Date();
const cal = document.getElementById("calendar");
const monthYear = document.getElementById("monthYear");

function renderCalendar() {
    if (!cal) return;
    cal.innerHTML = "";
    monthYear.textContent = current.toLocaleString("default", { month: "long", year: "numeric" });

    const year = current.getFullYear();
    const month = current.getMonth();
    const days = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= days; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const div = document.createElement("div");
        div.className = "day";
        if (tasks.some(t => t.schedule && t.schedule.startsWith(dateStr))) div.classList.add("has-task");
        div.innerHTML = `<strong>${d}</strong>`;
        cal.appendChild(div);
    }
}

document.getElementById("prevMonth").onclick = () => { current.setMonth(current.getMonth() - 1); renderCalendar(); };
document.getElementById("nextMonth").onclick = () => { current.setMonth(current.getMonth() + 1); renderCalendar(); };

// ------------------ CHARTS ------------------
const taskCanvas = document.getElementById("taskChart");
let taskChart = null;

function renderCharts() {
    if (!taskCanvas) return;
    const completedCount = tasks.filter(t => t.completed).length;
    const pendingCount = tasks.length - completedCount;
    if (taskChart) taskChart.destroy();
    taskChart = new Chart(taskCanvas, {
        type: "bar",
        data: {
            labels: ["Completed", "Pending"],
            datasets: [{
                data: [completedCount, pendingCount],
                backgroundColor: ["#3f8cff", "#555"]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ------------------ POMODORO ------------------
let running = false;
document.getElementById("pomodoro-btn").onclick = () => {
    running = !running;
    document.getElementById("pomodoro-status").textContent = running ? "Focusing..." : "Idle";
};

// Start
checkUser();
