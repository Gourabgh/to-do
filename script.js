// ------------------ SUPABASE ------------------
const supabaseUrl = "https://njliejijdkgyjrdvhwep.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbGllamlqZGtneWpyZHZod2VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMzA1MTEsImV4cCI6MjA4MTYwNjUxMX0.s4taBieCX-WZJ_9__I93SuTAcjwcPDZItIbAngBsG4Y";
const sb = supabase.createClient(supabaseUrl, supabaseKey);

let user = null;
let tasks = [];
let focusTime = 0;

// ------------------ AUTH ------------------
const authBox = document.getElementById("auth");
const app = document.querySelector(".app");

document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  let { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) await sb.auth.signUp({ email, password });

  init();
};

async function init() {
  const { data } = await sb.auth.getUser();
  user = data.user;
  if (!user) return;

  authBox.style.display = "none";
  app.style.display = "block";

  loadTasks();
}

// ------------------ TASKS ------------------
const titleInput = document.getElementById("title");
const noteInput = document.getElementById("note");
const scheduleInput = document.getElementById("schedule");

document.getElementById("add").onclick = async () => {
  if (!titleInput.value) return;
  await sb.from("tasks").insert([{
    user_id: user.id,
    title: titleInput.value,
    note: noteInput.value,
    schedule: scheduleInput.value,
    completed:false
  }]);
  titleInput.value = noteInput.value = scheduleInput.value = "";
  loadTasks();
};

async function loadTasks() {
  const { data } = await sb.from("tasks").select("*").eq("user_id", user.id).order("created_at",{ascending:false});
  tasks = data || [];
  renderTasks();
  renderCalendar();
  renderCharts();
}

function renderTasks() {
  const ul = document.getElementById("tasks");
  ul.innerHTML = "";
  tasks.forEach(t => {
    const li = document.createElement("li");
    li.className = t.completed?"completed":"";
    li.innerHTML = `<strong>${t.title}</strong><br><small>${t.note||""}</small>`;
    li.onclick = async ()=>{
      await sb.from("tasks").update({completed:!t.completed}).eq("id",t.id);
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
  cal.innerHTML = "";
  monthYear.textContent = current.toLocaleString("default",{month:"long",year:"numeric"});

  const year = current.getFullYear();
  const month = current.getMonth();
  const days = new Date(year, month+1,0).getDate();

  for(let d=1; d<=days; d++){
    const dateStr=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const div = document.createElement("div");
    div.className="day";
    if(tasks.some(t=>t.schedule?.startsWith(dateStr))) div.classList.add("has-task");
    div.innerHTML=`<strong>${d}</strong>`;
    cal.appendChild(div);
  }
}

document.getElementById("prevMonth").onclick=()=>{current.setMonth(current.getMonth()-1); renderCalendar();}
document.getElementById("nextMonth").onclick=()=>{current.setMonth(current.getMonth()+1); renderCalendar();}

// ------------------ CHARTS ------------------
const taskCanvas=document.getElementById("taskChart");
let taskChart=null;

function renderCharts(){
  const completedCount=tasks.filter(t=>t.completed).length;
  const pendingCount=tasks.length-completedCount;
  if(taskChart) taskChart.destroy();
  taskChart=new Chart(taskCanvas,{
    type:"bar",
    data:{labels:["Completed","Pending"], datasets:[{data:[completedCount,pendingCount],backgroundColor:["#3f8cff","#555"]}]}
  });
}

// ------------------ POMODORO ------------------
let running=false;
document.getElementById("pomodoro-btn").onclick=()=>{
  running=!running;
  document.getElementById("pomodoro-status").textContent=running?"Focusing...":"Idle";
};

// ------------------ INIT ------------------
init();
