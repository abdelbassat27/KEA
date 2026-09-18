/* أكاديمية خدومة — v7.1 — إصلاح الحذف + تحديث التواصل + تحسينات */
let role = null, currentUser = null, currentLesson = null;
let step = 0, mediaRecorder = null, chunks = [], audioCtx = null, analyser = null, waveAnim = null;
let watched = false, listened = false, recorded = false;
let quizData = [], quizTimer = null, quizLeft = 0, submitted = false, tabWarn = 0;
let unsubs = [], allLessons = [], allModules = [], allStudents = [];
let isKids = false, isDark = localStorage.getItem("theme") === "dark";
let isRepeatMode = false, quizStartAt = 0, activityHeartbeat = null;
let currentFilter = { q: "", level: "", status: "" };

const POINTS = { lesson: 100, perfect: 50, firstTry: 40, speak: 25, improve: 20, streak: 10, module: 250, level: 1000 };
const LEVELS = [
  { min: 0, name: "مبتدئ", icon: "🌱" },
  { min: 300, name: "متقدم", icon: "📘" },
  { min: 700, name: "ماهر", icon: "⭐" },
  { min: 1200, name: "محترف", icon: "🏆" },
  { min: 2000, name: "أسطورة", icon: "👑" }
];
const BADGES = {
  first: { id: "first", name: "أول درس", icon: "🎯" },
  perfect: { id: "perfect", name: "درجة كاملة", icon: "💯" },
  speaker: { id: "speaker", name: "متحدث", icon: "🎤" },
  improver: { id: "improver", name: "محسّن", icon: "📈" },
  streak7: { id: "streak7", name: "7 أيام متتالية", icon: "🔥" },
  streak30: { id: "streak30", name: "30 يوم متتالي", icon: "🚀" },
  ten: { id: "ten", name: "10 دروس", icon: "🔟" },
  fifty: { id: "fifty", name: "50 درسًا", icon: "🏅" },
  hundred: { id: "hundred", name: "100 درس", icon: "💎" },
  module: { id: "module", name: "وحدة مكتملة", icon: "🧩" },
  level: { id: "level", name: "مستوى مكتمل", icon: "🎓" }
};

function levelOf(pts) { let l = LEVELS[0]; for (const x of LEVELS) if (pts >= x.min) l = x; return l; }
function timeAgo(ts) {
  if (!ts) return "لم يظهر بعد";
  const d = Date.now() - (typeof ts === "number" ? ts : new Date(ts).getTime());
  if (d < 60000) return "الآن";
  if (d < 3600000) return Math.floor(d / 60000) + " د";
  if (d < 86400000) return Math.floor(d / 3600000) + " س";
  return Math.floor(d / 86400000) + " يوم";
}
function shuffle(a) { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }

/* ===== LANDING/LOGIN ===== */
window.showLanding = function () { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById('landing-screen').classList.add('active'); };
window.showLogin = function () { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById('login-screen').classList.add('active'); };

/* ===== CERTIFICATE VERIFY ===== */
window.verifyCertificate = async function () {
  const id = document.getElementById('verify-input').value.trim();
  const box = document.getElementById('verify-result');
  if (!id) return;
  box.innerHTML = '<p class="muted">جارٍ التحقق...</p>';
  const c = await window.KhadoumaFB.findCertificate(id);
  if (!c) { box.innerHTML = '<div class="card" style="border-color:var(--bad)">❌ <b>شهادة غير موجودة</b></div>'; return; }
  box.innerHTML = `<div class="card" style="border-color:var(--ok)">
    ✅ <b>شهادة صحيحة</b>
    <p>الاسم: <b>${c.studentName || '—'}</b></p>
    <p>${c.courseTitle || ''} — ${c.level || ''}</p>
    <p>النتيجة: ${c.score || 0}% • تاريخ الإصدار: ${new Date(c.issuedAt).toLocaleDateString('ar')}</p>
  </div>`;
};

/* ===== THEME ===== */
function applyTheme() {
  document.body.classList.toggle("dark", isDark);
  ['theme-btn','theme-btn-landing'].forEach(id => { const b = document.getElementById(id); if (b) b.textContent = isDark ? '☀️' : '🌙'; });
}
function toggleTheme() { isDark = !isDark; localStorage.setItem("theme", isDark ? "dark" : "light"); applyTheme(); }

/* ===== DOM READY ===== */
document.addEventListener("DOMContentLoaded", async () => {
  applyTheme();
  document.getElementById("theme-btn").onclick = toggleTheme;
  document.getElementById("theme-btn-landing")?.addEventListener("click", toggleTheme);
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();

  // seed مرة واحدة فقط (بعد أول تشغيل ناجح لا يعيد الاستعلام في كل زيارة)
  const seeded = localStorage.getItem("khadouma_seeded_v7");
  if (!seeded) {
    try {
      const did = await window.KhadoumaFB.seedIfEmpty();
      if (did !== false) localStorage.setItem("khadouma_seeded_v7", "1");
      else localStorage.setItem("khadouma_seeded_v7", "1");
    } catch (e) { console.warn(e); }
  }

  // Public stats (مع كاش داخل firebase.js)
  window.KhadoumaFB.getPublicStats().then(s => {
    if (s.students) document.getElementById('stat-stu').textContent = '+' + s.students;
    if (s.lessons) document.getElementById('stat-les').textContent = '+' + s.lessons;
    if (s.certificates) document.getElementById('stat-cert').textContent = '+' + s.certificates;
  }).catch(() => {});

  // Tabs
  document.querySelectorAll(".tab").forEach(t => {
    t.onclick = () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      const stu = t.dataset.tab === "student";
      document.getElementById("student-form").classList.toggle("hidden", !stu);
      document.getElementById("supervisor-form").classList.toggle("hidden", stu);
    };
  });

  document.getElementById("student-form").onsubmit = onStudentLogin;
  document.getElementById("supervisor-form").onsubmit = onSupervisorLogin;
  document.getElementById("btn-logout-sup").onclick = logout;
  document.getElementById("btn-logout-stu").onclick = logout;
  document.getElementById("btn-back-lessons").onclick = async () => {
    stopTimer(); stopWave(); isRepeatMode = false;
    await renderStudent(); show("student-screen");
  };
  document.getElementById("btn-s0").onclick = () => { if (watched) go(1); };
  document.getElementById("btn-s1").onclick = () => { if (listened && recorded) go(2); };
  document.getElementById("btn-s2").onclick = () => go(3);
  document.getElementById("btn-s3").onclick = () => go(4);
  document.getElementById("btn-submit").onclick = () => finishQuiz(false);
  document.getElementById("btn-listen").onclick = playListen;
  document.getElementById("btn-rec").onclick = toggleRec;
  document.getElementById("m-ok").onclick = () => document.getElementById("modal").classList.add("hidden");

  // Admin tabs
  document.querySelectorAll(".admin-tab").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll(".admin-tab").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      document.querySelectorAll(".admin-panel").forEach(p => p.classList.add("hidden"));
      const el = document.getElementById("admin-" + b.dataset.panel); if (el) el.classList.remove("hidden");
      const p = b.dataset.panel;
      if (p === "modules") loadAdminModules();
      if (p === "lessons") loadAdminLessons();
      if (p === "students") loadAdminStudents();
      if (p === "analytics") loadAnalyticsPanel();
      if (p === "posts") loadAdminPosts();
      if (p === "reports") loadReports();
      if (p === "notifs") loadSupNotifs();
    };
  });

  // Student tabs
  document.querySelectorAll(".stu-tab").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll(".stu-tab").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      ["path", "posts", "notifs", "myperf", "certificates"].forEach(p => {
        const el = document.getElementById("stu-panel-" + p);
        if (el) el.classList.toggle("hidden", p !== b.dataset.stu);
      });
      if (b.dataset.stu === "posts") loadStudentPosts();
      if (b.dataset.stu === "notifs") loadStudentNotifs();
      if (b.dataset.stu === "myperf") loadStudentMyPerf();
      if (b.dataset.stu === "certificates") loadStudentCertificates();
    };
  });

  // Buttons
  document.getElementById("btn-add-lesson")?.addEventListener("click", () => openLessonEditor(null));
  document.getElementById("btn-save-lesson")?.addEventListener("click", saveLessonFromForm);
  document.getElementById("btn-cancel-lesson")?.addEventListener("click", () => document.getElementById("lesson-editor").classList.add("hidden"));
  document.getElementById("btn-add-module")?.addEventListener("click", addModuleFromForm);
  document.getElementById("btn-bulk-import")?.addEventListener("click", () => document.getElementById("bulk-file").click());
  document.getElementById("bulk-file")?.addEventListener("change", handleBulkImport);
  document.getElementById("btn-add-student")?.addEventListener("click", addStudentFromForm);
  document.getElementById("btn-export-pdf")?.addEventListener("click", exportReportPDF);
  document.getElementById("btn-publish-post")?.addEventListener("click", publishPost);
  document.getElementById("btn-mark-all-read")?.addEventListener("click", async () => {
    if (!currentUser) return;
    await window.KhadoumaFB.markAllNotifsRead(currentUser.id);
    loadStudentNotifs(); updateStuNotifBadge();
  });
  document.getElementById("btn-stu-notifs")?.addEventListener("click", () => document.querySelector('.stu-tab[data-stu="notifs"]')?.click());
  document.getElementById("analytics-student-select")?.addEventListener("change", e => { if (e.target.value) renderStudentAnalytics(e.target.value); });

  // Filters
  document.getElementById("lesson-search")?.addEventListener("input", e => { currentFilter.q = e.target.value.toLowerCase(); renderLessonsList(); });
  document.getElementById("lesson-filter-level")?.addEventListener("change", e => { currentFilter.level = e.target.value; renderLessonsList(); });
  document.getElementById("lesson-filter-status")?.addEventListener("change", e => { currentFilter.status = e.target.value; renderLessonsList(); });

  // Anti-cheat visibility
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && currentLesson && step === 4 && !submitted) {
      tabWarn++;
      if (tabWarn >= 2) modal("⚠️", "مغادرة الصفحة أثناء الاختبار", "يُسجَّل ضمن نظام منع الغش.");
    }
    if (!document.hidden && role === "student" && currentUser) window.KhadoumaFB.touchActivity(currentUser.id, "visible");
  });
  document.addEventListener("copy", e => { if (step === 4) e.preventDefault(); });
});

/* ===== LOGIN ===== */
function logout() {
  stopTimer(); stopWave();
  if (activityHeartbeat) { clearInterval(activityHeartbeat); activityHeartbeat = null; }
  unsubs.forEach(u => { try { u(); } catch (e) {} });
  unsubs = []; role = currentUser = currentLesson = null; isRepeatMode = false;
  document.body.classList.remove("kids");
  document.getElementById("student-code").value = "";
  document.getElementById("supervisor-code").value = "";
  show("login-screen");
}

function show(id) { document.querySelectorAll(".screen").forEach(s => s.classList.remove("active")); document.getElementById(id).classList.add("active"); }
function modal(icon, title, msg) {
  document.getElementById("m-icon").textContent = icon;
  document.getElementById("m-title").textContent = title;
  document.getElementById("m-msg").textContent = msg;
  document.getElementById("modal").classList.remove("hidden");
}

async function onStudentLogin(e) {
  e.preventDefault();
  const code = document.getElementById("student-code").value;
  try {
    const s = await window.KhadoumaFB.findStudentByCode(code);
    if (!s) { window.KhadoumaFB.logLoginAttempt("student", code, false); return modal("❌", "رمز غير صحيح", "تأكد من الرمز."); }
    window.KhadoumaFB.logLoginAttempt("student", code, true);
    role = "student"; currentUser = s;
    isKids = !!s.kidsMode || (s.age && s.age <= 9);
    document.body.classList.toggle("kids", isKids);
    await window.KhadoumaFB.touchActivity(s.id, "login");
    await window.KhadoumaFB.recordAttendance(s.id, "login");
    await window.KhadoumaFB.updateStreakAndWeekly(s.id);
    startActivityHeartbeat();
    await renderStudent();
    setupStudentRealtime();
    show("student-screen");
  } catch (err) { console.error(err); modal("❌", "خطأ اتصال", "تحقق من الإنترنت أو قواعد Firebase."); }
}

async function onSupervisorLogin(e) {
  e.preventDefault();
  const code = document.getElementById("supervisor-code").value;
  try {
    const s = await window.KhadoumaFB.findSupervisorByCode(code);
    if (!s) { window.KhadoumaFB.logLoginAttempt("supervisor", code, false); return modal("❌", "رمز إشراف غير صحيح", ""); }
    window.KhadoumaFB.logLoginAttempt("supervisor", code, true);
    role = "supervisor"; currentUser = s;
    document.body.classList.remove("kids");
    await renderSupervisor();
    show("supervisor-screen");
    document.querySelectorAll(".admin-tab").forEach(x => x.classList.remove("active"));
    document.querySelector('.admin-tab[data-panel="overview"]')?.classList.add("active");
    document.querySelectorAll(".admin-panel").forEach(p => p.classList.add("hidden"));
    document.getElementById("admin-overview")?.classList.remove("hidden");
  } catch (err) { console.error(err); modal("❌", "خطأ اتصال", ""); }
}

function startActivityHeartbeat() {
  if (activityHeartbeat) clearInterval(activityHeartbeat);
  activityHeartbeat = setInterval(() => { if (role === "student" && currentUser) window.KhadoumaFB.touchActivity(currentUser.id, null); }, 60000);
}

function setupStudentRealtime() {
  if (!currentUser) return;
  unsubs.push(window.KhadoumaFB.watchNotifications(currentUser.id, list => {
    const unread = list.filter(n => !n.read).length;
    const badge = document.getElementById("stu-notif-count");
    if (badge) { badge.textContent = unread || ""; badge.style.display = unread ? "inline" : "none"; }
  }));
  unsubs.push(window.KhadoumaFB.watchLessons(() => {
    if (role === "student" && document.getElementById("student-screen")?.classList.contains("active")) renderStudent();
  }));
}

/* ===== STUDENT RENDER ===== */
function progPct(data, total) { const d = (data?.done?.length) || 0; return total ? Math.round((d / total) * 100) : 0; }

async function updateStuNotifBadge() {
  if (!currentUser) return;
  const n = await window.KhadoumaFB.getNotifications(currentUser.id);
  const unread = n.filter(x => !x.read).length;
  const b = document.getElementById("stu-notif-count");
  if (b) { b.textContent = unread || ""; b.style.display = unread ? "inline" : "none"; }
}

async function renderStudent() {
  const u = currentUser;
  const data = await window.KhadoumaFB.loadProgress(u.id);
  allLessons = await window.KhadoumaFB.getLessons(u.id);
  allModules = await window.KhadoumaFB.getModules();
  const total = allLessons.length || 1;

  document.getElementById("stu-avatar").textContent = u.avatar || "🧒";
  document.getElementById("stu-name").textContent = u.name;
  const lv = levelOf(data.points || 0);
  document.getElementById("stu-meta").textContent = (u.age || "") + " سنة • " + lv.icon + " " + lv.name;
  document.getElementById("stu-points").textContent = data.points || 0;
  document.getElementById("stu-streak").textContent = "🔥 " + (data.streak || 0);
  document.getElementById("stu-bar").style.width = progPct(data, total) + "%";
  document.getElementById("stu-progress-text").textContent = (data.done || []).length + " / " + allLessons.length + " دروس";
  document.getElementById("student-top").style.borderColor = u.color || "var(--p)";

  const badgesHtml = (data.badges || []).map(b => {
    const def = Object.values(BADGES).find(x => x.id === b) || { icon: "🏅", name: b };
    return `<span class="badge">${def.icon} ${def.name}</span>`;
  }).join("");
  document.getElementById("stu-badges").innerHTML = badgesHtml || "<span class='muted'>لا شارات بعد</span>";

  allStudents = await window.KhadoumaFB.getStudents();
  const ranks = [];
  for (const s of allStudents) { const p = window.KhadoumaFB.getLocalProg(s.id); ranks.push({ s, p: p.points || 0 }); }
  ranks.sort((a, b) => b.p - a.p);
  document.getElementById("mini-rank").innerHTML = "<strong>المنافسة:</strong> " +
    ranks.slice(0, 5).map((r, i) => (i + 1) + ") " + (r.s.first || r.s.name) + " " + r.p + "ن").join(" • ");

  await updateStuNotifBadge();
  renderLessonsList();
  await maybeIssueCertificates(data);
}

function renderLessonsList() {
  const box = document.getElementById("lessons");
  if (!box) return;
  const data = window.KhadoumaFB.getLocalProg(currentUser.id);
  const done = data.done || [];
  box.innerHTML = "";

  if (!allLessons.length) { box.innerHTML = "<p class='muted'>لا توجد دروس منشورة بعد. انتظر المشرف.</p>"; return; }

  // Group by module
  const byMod = {};
  allLessons.forEach(L => { const k = L.moduleId || 'misc'; (byMod[k] = byMod[k] || []).push(L); });

  const modsOrdered = allModules.filter(m => byMod[m.id]?.length).sort((a, b) => (a.order || 0) - (b.order || 0));
  if (byMod['misc']) modsOrdered.push({ id: 'misc', title: 'دروس متنوعة', titleEn: 'Miscellaneous', level: '' });

  modsOrdered.forEach(mod => {
    const list = byMod[mod.id] || [];
    const filtered = list.filter(L => {
      if (currentFilter.q && !(L.title + ' ' + (L.titleEn || '')).toLowerCase().includes(currentFilter.q)) return false;
      if (currentFilter.level && L.level !== currentFilter.level) return false;
      if (currentFilter.status === 'done' && !done.includes(L.id)) return false;
      if (currentFilter.status === 'todo' && done.includes(L.id)) return false;
      return true;
    });
    if (!filtered.length) return;

    const sep = document.createElement('div');
    sep.className = 'module-sep';
    sep.innerHTML = `${mod.title} ${mod.level ? `<span class="level-chip">${mod.level}</span>` : ''}`;
    box.appendChild(sep);

    const doneInMod = list.filter(L => done.includes(L.id)).length;
    const modPercent = Math.round((doneInMod / list.length) * 100);

    if (list.length && doneInMod === list.length) {
      const badge = document.createElement('div');
      badge.className = 'card center';
      badge.style.cssText = 'background:linear-gradient(135deg,#fff,#fef9e7);border:2px solid var(--gold)';
      badge.innerHTML = `🏆 <b>أكملت هذه الوحدة (${modPercent}%)</b>`;
      box.appendChild(badge);
    }

    filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
    filtered.forEach((L, idx) => {
      const isDone = done.includes(L.id);
      const tries = (data.tries && data.tries[L.id]) || 0;
      const scores = (data.lessonScores && data.lessonScores[L.id]) || {};
      const reps = (data.repetitions && data.repetitions[L.id]) || 0;
      const el = document.createElement("div");
      el.className = "lesson" + (isDone ? " done" : "");

      // New badge (updated in last 7 days)
      const isNew = L.updatedAt && (Date.now() - L.updatedAt) < 7 * 86400000 && !isDone;
      const deadline = L.deadline ? new Date(L.deadline).toLocaleDateString("ar") : "";
      let extra = "";
      if (isDone) extra = `<small class="muted">أفضل: ${scores.best || "—"}% • محاولات: ${tries} • تكرارات: ${reps}</small>`;
      else if (tries > 0) extra = `<small class="muted">محاولات: ${tries}</small>`;

      el.innerHTML = `${isNew ? '<span class="badge-new">جديد</span>' : ''}
        <span class="n">${L.order || idx + 1}</span>
        <div><h4>${L.title} <span class="level-chip">${L.level || ''}</span></h4>
        <p>${L.titleEn || ""}${deadline ? " • آخر أجل: " + deadline : ""}</p>${extra}</div>
        <span class="st">${isDone ? "مكتمل ✓" : "ابدأ"}</span>`;

      el.onclick = () => openLesson(L, isDone);
      if (isDone) {
        const repBtn = document.createElement("button");
        repBtn.className = "btn btn-sec btn-repeat";
        repBtn.textContent = "🔁 إعادة";
        repBtn.onclick = (ev) => { ev.stopPropagation(); openLesson(L, true); };
        el.appendChild(repBtn);
      }
      box.appendChild(el);
    });
  });
}

/* ===== SUPERVISOR RENDER ===== */
async function renderSupervisor() {
  const sup = currentUser;
  document.getElementById("sup-name").textContent = sup.name;
  document.getElementById("sup-role").textContent = (sup.role || "مشرف") + (sup.canSeeAll ? " — يرى الجميع" : " — طلابه فقط");
  await refreshSupervisorData();

  unsubs.forEach(u => { try { u(); } catch (e) {} });
  unsubs = [];
  // بدل مستمع حي لكل طالب (ثقيل جداً) — تحديث دوري كل 30 ثانية فقط
  const interval = setInterval(() => {
    if (role === "supervisor" && currentUser) refreshSupervisorData();
  }, 30000);
  unsubs.push(() => clearInterval(interval));
}

async function refreshSupervisorData() {
  if (role !== "supervisor" || !currentUser) return;
  const sup = currentUser;
  allStudents = await window.KhadoumaFB.getStudents();
  let list = allStudents;
  if (!sup.canSeeAll && sup.students) list = allStudents.filter(s => sup.students.includes(s.id));

  const progs = {};
  await Promise.all(list.map(async s => { progs[s.id] = await window.KhadoumaFB.loadProgress(s.id); }));

  let totalPts = 0, finished = 0, onlineish = 0;
  list.forEach(s => {
    const p = progs[s.id];
    totalPts += p.points || 0;
    if ((p.done || []).length >= 5) finished++;
    if (p.lastSeen && Date.now() - p.lastSeen < 10 * 60000) onlineish++;
  });

  const statsEl = document.getElementById("sup-stats");
  if (statsEl) statsEl.innerHTML =
    `<div class="stat"><b>${list.length}</b><span>طلاب</span></div>
     <div class="stat"><b>${totalPts}</b><span>مجموع النقاط</span></div>
     <div class="stat"><b>${finished}</b><span>تقدموا</span></div>
     <div class="stat"><b>${onlineish}</b><span>نشطون</span></div>`;

  const ranks = list.map(s => ({ s, p: progs[s.id].points || 0, pr: (progs[s.id].done || []).length })).sort((a, b) => b.p - a.p);
  const lb = document.getElementById("leaderboard");
  if (lb) lb.innerHTML = ranks.map((r, i) => `<div class="row"><span>${i + 1}</span><span>${r.s.avatar || ""} ${r.s.name}</span><span>${r.p} نقطة</span><span>${r.pr} دروس</span></div>`).join("") || "<p class='muted'>لا طلاب</p>";

  const wRanks = list.map(s => ({ s, p: progs[s.id].weeklyPoints || 0 })).sort((a, b) => b.p - a.p).filter(x => x.p > 0);
  const wb = document.getElementById("weekly-board");
  if (wb) wb.innerHTML = wRanks.map((r, i) => `<div class="row"><span>${i + 1}</span><span>${r.s.avatar || ""} ${r.s.name}</span><span>${r.p} نقطة أسبوعية</span><span>🔥 ${progs[r.s.id].streak || 0}</span></div>`).join("") || "<p class='muted'>لا نشاط أسبوعي بعد</p>";

  const stuBox = document.getElementById("sup-students");
  if (stuBox) stuBox.innerHTML = list.map(s => {
    const d = progs[s.id];
    const lv = levelOf(d.points || 0);
    const last = timeAgo(d.lastSeen || d.lastActivity);
    return `<div class="card kid">
      <div class="av">${s.avatar || "🧒"}</div>
      <h4>${s.name}</h4>
      <p>${s.age || "?"} سنة • ${lv.icon} ${lv.name}</p>
      <div class="bar"><div class="fill" style="width:${Math.min(100, (d.done || []).length * 5)}%"></div></div>
      <p>${(d.done || []).length} دروس • ${d.points || 0} نقطة • 🔥 ${d.streak || 0}</p>
      <p class="muted last-seen">آخر ظهور: ${last}</p>
    </div>`;
  }).join("");
}

/* ===== LESSON PLAYER ===== */
function updateStepsBar(n) {
  for (let i = 0; i < 5; i++) {
    const el = document.getElementById("step-dot-" + i);
    if (!el) continue;
    el.classList.remove("active", "done");
    if (i < n) el.classList.add("done");
    if (i === n) el.classList.add("active");
  }
}

function openLesson(L, asRepeat) {
  currentLesson = L; isRepeatMode = !!asRepeat;
  step = 0; watched = listened = recorded = submitted = false; tabWarn = 0;
  show("lesson-screen");
  document.getElementById("les-title").textContent = L.title + (isRepeatMode ? " (إعادة)" : "");
  document.getElementById("vid-en").textContent = L.videoText || "";
  document.getElementById("vid-ar").textContent = L.videoArabic || "";
  document.getElementById("lis-en").textContent = L.listen || "";
  document.getElementById("lis-ar").textContent = L.listenAr || "";
  document.getElementById("btn-s0").disabled = true;
  document.getElementById("btn-s1").disabled = true;
  document.getElementById("rec-play").classList.add("hidden");
  document.getElementById("rec-status").textContent = "";
  document.getElementById("rec-status").classList.remove("recording");
  document.getElementById("repeat-banner").classList.toggle("hidden", !isRepeatMode);

  const vids = L.videos || [];
  document.getElementById("vid-box").innerHTML = vids.map((v, i) =>
    `<div class="yt"><p>${v.t || "فيديو"}</p><iframe src="https://www.youtube-nocookie.com/embed/${v.id || v.url || ""}?rel=0" allowfullscreen loading="lazy"></iframe></div>`
  ).join("") || "<p class='muted'>لا فيديو — استخدم النص والصوت</p>";

  const prac = L.practice || {};
  document.getElementById("prac").innerHTML = (prac.items || []).map(i => `<div class="chip">${i}</div>`).join("") || "<p class='muted'>تدرب على ما تعلمته</p>";
  document.getElementById("pdf-box").innerHTML = (L.pdfs || []).map(p => `<a class="pdf-link" href="${p.url}" target="_blank">${p.title}<small>${p.note || ""}</small></a>`).join("") || (L.extraNote ? `<p>${L.extraNote}</p>` : "<p class='muted'>لا مستندات إضافية</p>");

  if (currentUser) window.KhadoumaFB.touchActivity(currentUser.id, "open_lesson");
  startWatch();
  setStep(0);
}

function startWatch() {
  let left = 20;
  const el = document.getElementById("watch-msg");
  const t = setInterval(() => {
    left--;
    el.textContent = left > 0 ? `تبقى ${left} ثانية مشاهدة إلزامية` : "يمكنك المتابعة ✓";
    if (left <= 0) { clearInterval(t); watched = true; document.getElementById("btn-s0").disabled = false; }
  }, 1000);
}

function setStep(n) {
  step = n;
  for (let i = 0; i < 5; i++) document.getElementById("step-" + i).classList.toggle("hidden", i !== n);
  updateStepsBar(n);
  document.getElementById("les-step").textContent = (n + 1) + "/5";
  if (n === 4) beginQuiz();
  if (n !== 1) stopWave();
}
function go(n) { setStep(n); }

function beginQuiz() {
  submitted = false; quizStartAt = Date.now();
  document.getElementById("quiz-res").classList.add("hidden");
  document.getElementById("btn-submit").classList.remove("hidden");
  document.getElementById("quiz-note").textContent = isRepeatMode ? "إعادة الدرس — النجاح من 70٪" : "النجاح من 70٪";

  const raw = (currentLesson.quiz || []).map(q => { if (!q.type) q.type = "mcq"; return q; });
  quizData = shuffle(raw.map(q => {
    if (q.type === "mcq") {
      const opts = (q.options || []).map((t, i) => ({ t, i }));
      return { type: "mcq", q: q.q, opts: shuffle(opts), ans: q.correct };
    }
    if (q.type === "fill") return { type: "fill", q: q.q, answer: (q.answer || "").toLowerCase().trim() };
    return { type: "mcq", q: q.q, opts: shuffle((q.options || []).map((t, i) => ({ t, i }))), ans: q.correct || 0 };
  }));

  document.getElementById("quiz-box").innerHTML = quizData.map((q, qi) => {
    if (q.type === "fill") return `<div class="qq"><h4>${qi + 1}. ${q.q}</h4><input class="fill-input" type="text" id="fill-${qi}" placeholder="اكتب الإجابة..."></div>`;
    return `<div class="qq"><h4>${qi + 1}. ${q.q}</h4>${q.opts.map(o => `<label><input type="radio" name="qq${qi}" value="${o.i}"> ${o.t}</label>`).join("")}</div>`;
  }).join("");

  quizLeft = Math.max(60, quizData.length * 25);
  stopTimer(); tick();
  quizTimer = setInterval(tick, 1000);
}

function tick() {
  document.getElementById("quiz-timer").textContent = "الوقت: " + quizLeft + " ث";
  if (quizLeft <= 0) { stopTimer(); if (!submitted) finishQuiz(true); return; }
  quizLeft--;
}
function stopTimer() { if (quizTimer) clearInterval(quizTimer); quizTimer = null; }

async function finishQuiz(auto) {
  if (submitted) return;
  submitted = true; stopTimer();
  const duration = Math.round((Date.now() - quizStartAt) / 1000);
  let ok = 0; const answers = []; const errors = [];

  quizData.forEach((q, i) => {
    if (q.type === "fill") {
      const val = (document.getElementById("fill-" + i)?.value || "").toLowerCase().trim();
      const correct = val === q.answer || (val && (val.includes(q.answer) || q.answer.includes(val)));
      if (correct) ok++;
      else errors.push({ q: q.q, given: val, expected: q.answer, type: "fill" });
      answers.push({ q: q.q, given: val, correct, expected: q.answer });
    } else {
      const sel = document.querySelector(`input[name="qq${i}"]:checked`);
      const chosen = sel ? Number(sel.value) : null;
      const correct = chosen !== null && chosen === q.ans;
      if (correct) ok++;
      else {
        const givenText = sel ? (q.opts.find(o => o.i === chosen)?.t || "") : "(بدون)";
        const expectedText = q.opts.find(o => o.i === q.ans)?.t || "";
        errors.push({ q: q.q, given: givenText, expected: expectedText, type: "mcq" });
      }
      answers.push({ q: q.q, given: chosen, correct, expected: q.ans });
    }
  });

  const score = quizData.length ? Math.round((ok / quizData.length) * 100) : 0;
  const pass = score >= 70;

  let ks = await window.KhadoumaFB.recordQuizAttempt(currentUser.id, currentLesson.id, { score, pass, answers, errors, duration, isRepeat: isRepeatMode });
  if (!ks.done) ks.done = [];
  if (!ks.badges) ks.badges = [];
  if (!ks.tries) ks.tries = {};

  const box = document.getElementById("quiz-res");
  box.classList.remove("hidden", "ok", "bad");
  box.classList.add(pass ? "ok" : "bad");

  if (pass) {
    let g = 0; const newBadges = [];
    const alreadyDone = ks.done.includes(currentLesson.id);
    const streakBonus = Math.min(50, (ks.streak || 0) * 2);

    if (!alreadyDone) {
      g = POINTS.lesson + streakBonus;
      if (score === 100) g += POINTS.perfect;
      if ((ks.tries[currentLesson.id] || 1) === 1) g += POINTS.firstTry;
      if (recorded) g += POINTS.speak;
      ks.done.push(currentLesson.id);
      ks.points = (ks.points || 0) + g;
      ks.weeklyPoints = (ks.weeklyPoints || 0) + g;

      if (ks.done.length === 1 && !ks.badges.includes("first")) { ks.badges.push("first"); newBadges.push(BADGES.first); }
      if (score === 100 && !ks.badges.includes("perfect")) { ks.badges.push("perfect"); newBadges.push(BADGES.perfect); }
      if (recorded && !ks.badges.includes("speaker")) { ks.badges.push("speaker"); newBadges.push(BADGES.speaker); }
      if (ks.done.length >= 10 && !ks.badges.includes("ten")) { ks.badges.push("ten"); newBadges.push(BADGES.ten); }
      if (ks.done.length >= 50 && !ks.badges.includes("fifty")) { ks.badges.push("fifty"); newBadges.push(BADGES.fifty); }
      if (ks.done.length >= 100 && !ks.badges.includes("hundred")) { ks.badges.push("hundred"); newBadges.push(BADGES.hundred); }
      if ((ks.streak || 0) >= 7 && !ks.badges.includes("streak7")) { ks.badges.push("streak7"); newBadges.push(BADGES.streak7); }
      if ((ks.streak || 0) >= 30 && !ks.badges.includes("streak30")) { ks.badges.push("streak30"); newBadges.push(BADGES.streak30); }
    } else if (isRepeatMode) {
      const prevBest = (ks.lessonScores?.[currentLesson.id]?.best) || 0;
      if (score > prevBest) {
        g = POINTS.improve;
        ks.points = (ks.points || 0) + g;
        ks.weeklyPoints = (ks.weeklyPoints || 0) + g;
        if (!ks.badges.includes("improver")) { ks.badges.push("improver"); newBadges.push(BADGES.improver); }
      }
    }

    await window.KhadoumaFB.saveProgress(currentUser.id, ks);
    await notifySupervisors("success", `${currentUser.first || currentUser.name} ${isRepeatMode ? "أعاد" : "أكمل"} درساً`, `${isRepeatMode ? "إعادة" : "أنهى"}: ${currentLesson.title} بدرجة ${score}%`, { studentId: currentUser.id, lessonId: currentLesson.id, score });

    const errSummary = errors.length ? `<p class="err-summary">أخطاء: ${errors.map(e => e.q.slice(0, 40)).join(" ؛ ")}</p>` : `<p>لا أخطاء 👏</p>`;
    box.innerHTML = `<h3>${isRepeatMode ? "إعادة ناجحة" : "نجحت"} 🎉</h3>
      <p>الدرجة ${score}% ${g ? "• +" + g + " نقطة" : ""} ${streakBonus ? "🔥 +" + streakBonus : ""}</p>
      <p>مجموعك ${ks.points}</p>${errSummary}
      ${newBadges.map(b => `<span class="badge">${b.icon} ${b.name}</span>`).join("")}`;
    document.getElementById("btn-submit").classList.add("hidden");

    // Check certificates after passing
    await maybeIssueCertificates(ks);
  } else {
    await window.KhadoumaFB.saveProgress(currentUser.id, ks);
    if ((ks.tries[currentLesson.id] || 0) >= 3) {
      await notifySupervisors("warn", `فشل متكرر: ${currentUser.first || currentUser.name}`, `حاول ${ks.tries[currentLesson.id]} مرات في: ${currentLesson.title}`, { studentId: currentUser.id, lessonId: currentLesson.id });
    }
    const errHtml = errors.length ? `<ul class="err-list">${errors.map(e => `<li><strong>${e.q}</strong><br>إجابتك: ${e.given || "—"} ← الصحيح: ${e.expected}</li>`).join("")}</ul>` : "";
    box.innerHTML = `<h3>لم تنجح بعد</h3><p>الدرجة ${score}% (المطلوب 70%)</p><p>محاولة ${ks.tries[currentLesson.id] || 1}</p>${errHtml}`;
  }
}

async function notifySupervisors(type, title, body, meta) {
  const sups = await window.KhadoumaFB.getSupervisors();
  for (const sp of sups) {
    if (sp.canSeeAll || (sp.students && sp.students.includes(currentUser.id))) {
      window.KhadoumaFB.addNotification(sp.id, type, title, body, meta);
    }
  }
}

/* ===== CERTIFICATES: DYNAMIC ===== */
async function maybeIssueCertificates(prog) {
  if (!currentUser || !prog) return;
  const lessons = await window.KhadoumaFB.getLessons(currentUser.id);
  const modules = await window.KhadoumaFB.getModules();
  const done = prog.done || [];
  prog.issuedCerts = prog.issuedCerts || [];
  const newCerts = [];

  // Per module
  for (const mod of modules) {
    const modLessons = lessons.filter(L => L.moduleId === mod.id);
    if (!modLessons.length) continue;
    if (modLessons.every(L => done.includes(L.id))) {
      const refId = 'module_' + mod.id;
      if (!prog.issuedCerts.includes(refId)) {
        const avg = Math.round(modLessons.reduce((a, L) => a + ((prog.lessonScores?.[L.id]?.best) || 0), 0) / modLessons.length);
        const cert = await window.KhadoumaFB.issueCertificate(currentUser.id, {
          refId, certType: 'module',
          courseTitle: mod.title + (mod.titleEn ? ` (${mod.titleEn})` : ''),
          level: mod.level || '', score: avg,
          studentName: currentUser.name
        });
        prog.issuedCerts.push(refId);
        prog.points = (prog.points || 0) + POINTS.module;
        if (!prog.badges.includes('module')) prog.badges.push('module');
        newCerts.push({ ...cert, type: 'module', title: mod.title });
      }
    }
  }

  // Per level
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  for (const lv of levels) {
    const lvLessons = lessons.filter(L => L.level === lv);
    if (!lvLessons.length) continue;
    if (lvLessons.every(L => done.includes(L.id))) {
      const refId = 'level_' + lv;
      if (!prog.issuedCerts.includes(refId)) {
        const avg = Math.round(lvLessons.reduce((a, L) => a + ((prog.lessonScores?.[L.id]?.best) || 0), 0) / lvLessons.length);
        const cert = await window.KhadoumaFB.issueCertificate(currentUser.id, {
          refId, certType: 'level',
          courseTitle: `English Level ${lv} — Full Completion`,
          level: lv, score: avg, studentName: currentUser.name
        });
        prog.issuedCerts.push(refId);
        prog.points = (prog.points || 0) + POINTS.level;
        if (!prog.badges.includes('level')) prog.badges.push('level');
        newCerts.push({ ...cert, type: 'level', title: 'Level ' + lv });
      }
    }
  }

  // Milestones
  for (const ms of window.KhadoumaFB.MILESTONES) {
    if (done.length >= ms) {
      const refId = 'milestone_' + ms;
      if (!prog.issuedCerts.includes(refId)) {
        const cert = await window.KhadoumaFB.issueCertificate(currentUser.id, {
          refId, certType: 'milestone',
          courseTitle: `${ms} Lessons Milestone`,
          level: '', score: 100, studentName: currentUser.name
        });
        prog.issuedCerts.push(refId);
        newCerts.push({ ...cert, type: 'milestone', title: ms + ' درسًا' });
      }
    }
  }

  if (newCerts.length) {
    await window.KhadoumaFB.saveProgress(currentUser.id, prog);
    for (const c of newCerts) {
      await window.KhadoumaFB.addNotification(currentUser.id, 'success', '🏆 شهادة جديدة!', `حصلت على: ${c.title}`, { type: 'certificate' });
    }
    if (document.getElementById('stu-panel-certificates') && !document.getElementById('stu-panel-certificates').classList.contains('hidden')) loadStudentCertificates();
  }
}

async function loadStudentCertificates() {
  if (!currentUser) return;
  const box = document.getElementById('stu-certificates-box');
  if (!box) return;
  box.innerHTML = '<p class="muted">جارٍ التحميل...</p>';
  const certs = await window.KhadoumaFB.getCertificates(currentUser.id);
  if (!certs.length) {
    box.innerHTML = `<div class="card center">
      <div style="font-size:3rem">🏆</div>
      <h3>لا توجد شهادات بعد</h3>
      <p class="muted">أكمل وحدة كاملة أو مستوى كامل أو حقق معلمًا (25/50/100...) لتصدر شهادتك.</p>
    </div>`;
    return;
  }
  box.innerHTML = certs.map(c => {
    const typeLabel = c.certType === 'level' ? '🎓 مستوى' : c.certType === 'milestone' ? '🏅 معلم' : '🧩 وحدة';
    return `<div class="cert-card">
      <span class="cert-ico">📜</span>
      <div style="flex:1">
        <span class="badge">${typeLabel}</span>
        <h4>${c.courseTitle || 'English Course'}</h4>
        <p>النتيجة: ${c.score || 0}% • ${new Date(c.issuedAt).toLocaleDateString('ar')}</p>
        <p class="muted" style="font-size:.72rem">ID: ${c.certId}</p>
      </div>
      <div class="cert-actions">
        <button class="btn btn-gold" onclick='KEA_Certificate.generate({
          studentName: "${currentUser.name}",
          courseTitle: "${(c.courseTitle || "").replace(/"/g, "")}",
          level: "${c.level || ""}",
          date: "${new Date(c.issuedAt).toLocaleDateString("en-GB")}",
          score: ${c.score || 0},
          certId: "${c.certId}",
          certType: "${c.certType || 'module'}"
        })'>📥 PDF</button>
      </div>
    </div>`;
  }).join('');
}

/* ===== AUDIO ===== */
function playListen() {
  const t = document.getElementById("lis-en").textContent;
  if ("speechSynthesis" in window) {
    const u = new SpeechSynthesisUtterance(t); u.lang = "en-US"; u.rate = 0.85; speechSynthesis.speak(u);
  }
  listened = true; unlockListen();
}
function unlockListen() { if (listened && recorded) document.getElementById("btn-s1").disabled = false; }

async function toggleRec() {
  const btn = document.getElementById("btn-rec");
  const stt = document.getElementById("rec-status");
  const aud = document.getElementById("rec-play");
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop(); btn.textContent = "سجّل صوتك";
    stt.textContent = "تم التسجيل ✓"; stt.classList.remove("recording");
    recorded = true; unlockListen(); stopWave();
    document.getElementById("pron-feedback").textContent = "تم حفظ التسجيل. استمر في التدريب!";
    document.getElementById("pron-feedback").classList.remove("hidden");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = () => { aud.src = URL.createObjectURL(new Blob(chunks, { type: "audio/webm" })); aud.classList.remove("hidden"); stream.getTracks().forEach(t => t.stop()); };
    mediaRecorder.start(); btn.textContent = "إيقاف التسجيل";
    stt.textContent = "جاري التسجيل..."; stt.classList.add("recording");
    startWave(stream);
  } catch (e) { stt.textContent = "يجب السماح بالميكروفون."; }
}
function startWave(stream) {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser(); analyser.fftSize = 64; src.connect(analyser);
    const box = document.getElementById("wave-box"); box.innerHTML = "";
    const bars = [];
    for (let i = 0; i < 24; i++) { const b = document.createElement("div"); b.className = "wave-bar"; b.style.height = "4px"; box.appendChild(b); bars.push(b); }
    const data = new Uint8Array(analyser.frequencyBinCount);
    function draw() { waveAnim = requestAnimationFrame(draw); analyser.getByteFrequencyData(data); bars.forEach((b, i) => { const v = data[i % data.length] || 0; b.style.height = Math.max(4, (v / 255) * 50) + "px"; }); }
    draw();
  } catch (e) { console.warn(e); }
}
function stopWave() {
  if (waveAnim) cancelAnimationFrame(waveAnim);
  waveAnim = null;
  if (audioCtx) { try { audioCtx.close(); } catch (e) {} audioCtx = null; }
  document.getElementById("wave-box")?.querySelectorAll(".wave-bar").forEach(b => b.style.height = "4px");
}

/* ===== ADMIN: MODULES ===== */
async function loadAdminModules() {
  const mods = await window.KhadoumaFB.getAllModulesAdmin();
  const box = document.getElementById("admin-modules-list");
  box.innerHTML = mods.map(m => `
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div><b>${m.title}</b> <span class="badge">${m.level}</span>
        <p class="muted">${m.titleEn || ""} • ترتيب: ${m.order || 0}</p>
      </div>
      <button class="btn btn-danger" onclick="deleteModuleConfirm('${m.id}')">حذف</button>
    </div>`).join("") || "<p class='muted'>لا وحدات بعد</p>";
}
async function addModuleFromForm() {
  const title = document.getElementById("mod-title").value.trim();
  const titleEn = document.getElementById("mod-titleEn").value.trim();
  const level = document.getElementById("mod-level").value;
  const order = Number(document.getElementById("mod-order").value) || 1;
  if (!title) return modal("❌", "العنوان مطلوب", "");
  await window.KhadoumaFB.saveModule(null, { title, titleEn, level, order, published: true });
  document.getElementById("mod-title").value = "";
  document.getElementById("mod-titleEn").value = "";
  modal("✅", "تم", "أُضيفت الوحدة");
  loadAdminModules();
}
window.deleteModuleConfirm = async function (id) {
  if (!confirm("حذف الوحدة؟")) return;
  try {
    await window.KhadoumaFB.deleteModule(id);
    modal("✅", "تم الحذف", "تم حذف الوحدة بنجاح");
    loadAdminModules();
  } catch (err) {
    console.error(err);
    modal("❌", "فشل الحذف", "تحقق من الاتصال أو صلاحيات Firebase. " + (err.message || ""));
  }
};

/* ===== ADMIN: LESSONS ===== */
async function loadAdminLessons() {
  const list = await window.KhadoumaFB.getAllLessonsAdmin();
  const box = document.getElementById("admin-lessons-list");
  box.innerHTML = list.map(L => `
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div><strong>${L.order || "?"} — ${L.title}</strong> <span class="badge">${L.level || ""}</span>
        <p class="muted">${L.published ? "✅" : "⏸"} • ${(L.quiz || []).length} أسئلة • v${L.version || 1}</p>
      </div>
      <div class="row">
        <button class="btn btn-sec" onclick="openLessonEditor('${L.id}')">تعديل</button>
        <button class="btn btn-danger" onclick="deleteLessonConfirm('${L.id}')">حذف</button>
      </div>
    </div>`).join("") || "<p class='muted'>لا دروس. أضف درساً أو استورد JSON.</p>";
}

window.openLessonEditor = async function (id) {
  const mods = await window.KhadoumaFB.getAllModulesAdmin();
  const sel = document.getElementById("les-edit-module");
  sel.innerHTML = '<option value="">— بدون وحدة —</option>' + mods.map(m => `<option value="${m.id}">${m.title} (${m.level})</option>`).join("");

  document.getElementById("lesson-editor").classList.remove("hidden");
  document.getElementById("editor-title").textContent = id ? "تعديل درس" : "درس جديد";
  document.getElementById("les-edit-id").value = id || "";

  if (id) {
    const list = await window.KhadoumaFB.getAllLessonsAdmin();
    const L = list.find(x => x.id === id);
    if (!L) return;
    document.getElementById("les-edit-title").value = L.title || "";
    document.getElementById("les-edit-titleEn").value = L.titleEn || "";
    document.getElementById("les-edit-module").value = L.moduleId || "";
    document.getElementById("les-edit-level").value = L.level || "A1";
    document.getElementById("les-edit-order").value = L.order || 1;
    document.getElementById("les-edit-goal").value = L.goal || "";
    document.getElementById("les-edit-videoText").value = L.videoText || "";
    document.getElementById("les-edit-videoArabic").value = L.videoArabic || "";
    document.getElementById("les-edit-videos").value = (L.videos || []).map(v => v.id + "|" + (v.t || "")).join("\n");
    document.getElementById("les-edit-listen").value = L.listen || "";
    document.getElementById("les-edit-listenAr").value = L.listenAr || "";
    document.getElementById("les-edit-practice").value = (L.practice?.items || []).join("\n");
    document.getElementById("les-edit-quiz").value = JSON.stringify(L.quiz || [], null, 2);
    document.getElementById("les-edit-published").checked = !!L.published;
    document.getElementById("les-edit-deadline").value = L.deadline ? L.deadline.slice(0, 10) : "";
    document.getElementById("les-edit-targets").value = (L.targetStudents || ["all"]).join(",");
  } else {
    ["les-edit-title","les-edit-titleEn","les-edit-goal","les-edit-videoText","les-edit-videoArabic","les-edit-videos","les-edit-listen","les-edit-listenAr","les-edit-practice","les-edit-deadline"].forEach(i => document.getElementById(i).value = "");
    document.getElementById("les-edit-order").value = "1";
    document.getElementById("les-edit-published").checked = true;
    document.getElementById("les-edit-targets").value = "all";
    document.getElementById("les-edit-quiz").value = JSON.stringify([
      { type: "mcq", q: "سؤال مثال؟", options: ["أ", "ب", "ج"], correct: 0 },
      { type: "fill", q: "أكمل: Hello ___", answer: "world" }
    ], null, 2);
  }
  document.getElementById("lesson-editor").scrollIntoView({ behavior: "smooth" });
};

async function saveLessonFromForm() {
  let quiz = [];
  try { quiz = JSON.parse(document.getElementById("les-edit-quiz").value || "[]"); }
  catch (e) { return modal("❌", "خطأ JSON", "تحقق من صيغة الأسئلة"); }

  const videosRaw = document.getElementById("les-edit-videos").value.trim();
  const videos = videosRaw ? videosRaw.split("\n").map(line => { const [id, ...rest] = line.split("|"); return { id: id.trim(), t: rest.join("|").trim() || "فيديو", ar: true }; }) : [];
  const practiceItems = document.getElementById("les-edit-practice").value.trim().split("\n").map(x => x.trim()).filter(Boolean);
  const targets = document.getElementById("les-edit-targets").value.split(",").map(x => x.trim()).filter(Boolean);

  const data = {
    title: document.getElementById("les-edit-title").value.trim(),
    titleEn: document.getElementById("les-edit-titleEn").value.trim(),
    moduleId: document.getElementById("les-edit-module").value || null,
    level: document.getElementById("les-edit-level").value,
    order: Number(document.getElementById("les-edit-order").value) || 1,
    goal: document.getElementById("les-edit-goal").value.trim(),
    videoText: document.getElementById("les-edit-videoText").value.trim(),
    videoArabic: document.getElementById("les-edit-videoArabic").value.trim(),
    videos, listen: document.getElementById("les-edit-listen").value.trim(),
    listenAr: document.getElementById("les-edit-listenAr").value.trim(),
    practice: { type: "list", items: practiceItems },
    quiz,
    published: document.getElementById("les-edit-published").checked,
    deadline: document.getElementById("les-edit-deadline").value || null,
    targetStudents: targets.length ? targets : ["all"],
    createdBy: currentUser.id
  };
  if (!data.title) return modal("❌", "العنوان مطلوب", "");

  const id = document.getElementById("les-edit-id").value || null;
  const newId = await window.KhadoumaFB.saveLesson(id, data);

  if (data.published) {
    const students = await window.KhadoumaFB.getStudents();
    const tg = data.targetStudents.includes("all") ? students : students.filter(s => data.targetStudents.includes(s.id));
    await window.KhadoumaFB.broadcastNotification(tg.map(s => s.id), "lesson", id ? "تحديث درس" : "درس جديد", data.title, { lessonId: newId });
  }
  modal("✅", "تم الحفظ", "");
  document.getElementById("lesson-editor").classList.add("hidden");
  loadAdminLessons();
}

window.deleteLessonConfirm = async function (id) {
  if (!confirm("حذف الدرس نهائياً؟")) return;
  try {
    await window.KhadoumaFB.deleteLesson(id);
    modal("✅", "تم الحذف", "تم حذف الدرس بنجاح");
    loadAdminLessons();
  } catch (err) {
    console.error(err);
    modal("❌", "فشل الحذف", "تحقق من الاتصال أو صلاحيات Firebase. " + (err.message || ""));
  }
};

async function handleBulkImport(e) {
  const file = e.target.files[0]; if (!file) return;
  const text = await file.text();
  let arr;
  try { arr = JSON.parse(text); } catch (err) { return modal("❌", "JSON غير صالح", ""); }
  if (!Array.isArray(arr)) arr = [arr];
  const ids = await window.KhadoumaFB.bulkSaveLessons(arr);
  modal("✅", "تم الاستيراد", `تم استيراد ${ids.length} درس`);
  e.target.value = "";
  loadAdminLessons();
}

/* ===== ADMIN: STUDENTS ===== */
async function loadAdminStudents() {
  const list = await window.KhadoumaFB.getAllStudents();
  document.getElementById("admin-students-list").innerHTML = list.map(s => `
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div>${s.avatar || ""} <strong>${s.name}</strong> — <code>${s.code}</code>
        <span class="muted">(${s.active !== false ? "نشط" : "معطّل"}${s.kidsMode ? " • أطفال" : ""})</span>
      </div>
      <div class="row">
        <button class="btn btn-sec" onclick="toggleStudentActive('${s.id}', ${s.active === false})">${s.active === false ? "تفعيل" : "تعطيل"}</button>
        <button class="btn btn-danger" onclick="deleteStudentConfirm('${s.id}', '${(s.name || "").replace(/[\'"`]/g, "")}')">حذف</button>
      </div>
    </div>`).join("");
}
window.toggleStudentActive = async function (id, activate) { await window.KhadoumaFB.saveStudent(id, { active: activate }); loadAdminStudents(); };
window.deleteStudentConfirm = async function (id, name) {
  if (!confirm("حذف الطالب «" + name + "» نهائياً مع كل تقدمه؟")) return;
  try {
    await window.KhadoumaFB.deleteStudent(id, true);
    modal("✅", "تم الحذف", "تم حذف الطالب وجميع بياناته");
    loadAdminStudents();
  } catch (err) {
    console.error(err);
    modal("❌", "فشل الحذف", "تحقق من الاتصال أو صلاحيات Firebase. " + (err.message || ""));
  }
};
async function addStudentFromForm() {
  const name = document.getElementById("new-stu-name").value.trim();
  const code = document.getElementById("new-stu-code").value.trim().toUpperCase();
  const age = Number(document.getElementById("new-stu-age").value) || 10;
  const kids = document.getElementById("new-stu-kids").checked;
  if (!name || !code) return modal("❌", "الاسم والرمز مطلوبان", "");
  const id = code.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16) || "stu" + Date.now();
  await window.KhadoumaFB.saveStudent(id, { name, first: name.split(" ").pop(), age, code, avatar: "🧒", color: "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0"), active: true, kidsMode: kids });
  modal("✅", "تمت الإضافة", name);
  document.getElementById("new-stu-name").value = "";
  document.getElementById("new-stu-code").value = "";
  loadAdminStudents();
}

/* ===== ANALYTICS ===== */
async function loadAnalyticsPanel() {
  const list = await window.KhadoumaFB.getStudents();
  const sel = document.getElementById("analytics-student-select");
  sel.innerHTML = '<option value="">— اختر طالباً —</option>' + list.map(s => `<option value="${s.id}">${s.avatar || ""} ${s.name}</option>`).join("");
  document.getElementById("analytics-detail").innerHTML = "<p class='muted'>اختر طالباً.</p>";
}
async function renderStudentAnalytics(sid) {
  const students = await window.KhadoumaFB.getAllStudents();
  const s = students.find(x => x.id === sid);
  const p = await window.KhadoumaFB.loadProgress(sid);
  const lessons = await window.KhadoumaFB.getAllLessonsAdmin();
  const lessonMap = {}; lessons.forEach(L => { lessonMap[L.id] = L; });

  const scores = p.lessonScores || {};
  const reps = p.repetitions || {};
  const errs = p.errorStats || {};
  const activity = (p.activityLog || []).slice().reverse().slice(0, 15);

  const lessonsHtml = Object.keys(scores).map(lid => {
    const sc = scores[lid];
    return `<tr><td>${lessonMap[lid]?.title || lid}</td><td>${sc.best || 0}%</td><td>${sc.last || 0}%</td><td>${sc.attempts || 0}</td><td>${reps[lid] || 0}</td></tr>`;
  }).join("") || "<tr><td colspan='5' class='muted'>لا بيانات</td></tr>";

  const topErrors = Object.entries(errs).sort((a, b) => b[1].count - a[1].count).slice(0, 10)
    .map(([q, info]) => `<li><strong>${info.count}×</strong> ${q.slice(0, 80)}</li>`).join("") || "<li class='muted'>لا أخطاء</li>";

  const actHtml = activity.map(a => {
    const t = new Date(a.at).toLocaleString("ar");
    if (a.type === "quiz") return `<li>${t} — اختبار: ${a.score}% ${a.pass ? "✓" : "✗"}</li>`;
    return `<li>${t} — ${a.type}</li>`;
  }).join("") || "<li class='muted'>لا نشاط</li>";

  document.getElementById("analytics-detail").innerHTML = `
    <h3>${s?.avatar || ""} ${s?.name || sid}</h3>
    <p>النقاط: <b>${p.points || 0}</b> • المستوى: ${levelOf(p.points || 0).icon} ${levelOf(p.points || 0).name} • 🔥 ${p.streak || 0}</p>
    <p>آخر ظهور: <b>${timeAgo(p.lastSeen || p.lastActivity)}</b></p>
    <p>دروس مكتملة: ${(p.done || []).length} / ${lessons.length}</p>
    <h4>أداء الدروس</h4>
    <div class="table-wrap"><table class="analytics-table">
      <thead><tr><th>الدرس</th><th>أفضل</th><th>آخر</th><th>محاولات</th><th>تكرارات</th></tr></thead>
      <tbody>${lessonsHtml}</tbody></table></div>
    <h4>أكثر الأخطاء تكراراً</h4><ul class="err-top">${topErrors}</ul>
    <h4>سجل النشاط</h4><ul class="act-log">${actHtml}</ul>`;
}

/* ===== POSTS ===== */
async function publishPost() {
  const title = document.getElementById("post-title").value.trim();
  const body = document.getElementById("post-body").value.trim();
  const type = document.getElementById("post-type").value;
  const notify = document.getElementById("post-notify").checked;
  if (!title || !body) return modal("❌", "العنوان والمحتوى مطلوبان", "");
  const id = await window.KhadoumaFB.addPost({ title, body, type, authorId: currentUser.id, authorName: currentUser.name, published: true });
  if (notify) {
    const students = await window.KhadoumaFB.getStudents();
    let targets = students;
    if (!currentUser.canSeeAll && currentUser.students) targets = students.filter(s => currentUser.students.includes(s.id));
    await window.KhadoumaFB.broadcastNotification(targets.map(s => s.id), "post", "منشور جديد", title, { postId: id, type });
  }
  document.getElementById("post-title").value = ""; document.getElementById("post-body").value = "";
  modal("✅", "تم النشر", "");
  loadAdminPosts();
}
async function loadAdminPosts() {
  const list = await window.KhadoumaFB.getAllPostsAdmin();
  document.getElementById("admin-posts-list").innerHTML = list.map(p => `
    <div class="card post-card">
      <div class="post-meta">
        <span class="post-type">${p.type === "instruction" ? "تعليمات" : p.type === "announcement" ? "إعلان" : "خبر"}</span>
        <small class="muted">${new Date(p.createdAt).toLocaleString("ar")} — ${p.authorName || ""}</small>
      </div>
      <h4>${p.title}</h4><p>${(p.body || "").slice(0, 200)}</p>
      <button class="btn btn-danger" style="width:auto" onclick="deletePostConfirm('${p.id}')">حذف</button>
    </div>`).join("") || "<p class='muted'>لا منشورات</p>";
}
window.deletePostConfirm = async function (id) {
  if (!confirm("حذف المنشور؟")) return;
  try {
    await window.KhadoumaFB.deletePost(id);
    modal("✅", "تم الحذف", "");
    loadAdminPosts();
  } catch (err) {
    console.error(err);
    modal("❌", "فشل الحذف", err.message || "");
  }
};

async function loadStudentPosts() {
  const list = await window.KhadoumaFB.getPosts(30);
  document.getElementById("stu-posts-list").innerHTML = list.map(p => `
    <div class="card post-card">
      <div class="post-meta">
        <span class="post-type">${p.type === "instruction" ? "📋 تعليمات" : p.type === "announcement" ? "📢 إعلان" : "📰 خبر"}</span>
        <small class="muted">${new Date(p.createdAt).toLocaleString("ar")}</small>
      </div>
      <h4>${p.title}</h4><p>${p.body || ""}</p>
      <small class="muted">— ${p.authorName || "المشرف"}</small>
    </div>`).join("") || "<p class='muted'>لا منشورات</p>";
}

async function loadStudentNotifs() {
  if (!currentUser) return;
  const list = await window.KhadoumaFB.getNotifications(currentUser.id);
  document.getElementById("stu-notifs-list").innerHTML = list.map(n => `
    <div class="notif-item ${n.read ? "" : "unread"}" data-id="${n.id}">
      <strong>${n.title}</strong><p class="muted">${n.body}</p>
      <small>${new Date(n.createdAt).toLocaleString("ar")} • ${n.type || ""}</small>
    </div>`).join("") || "<p class='muted'>لا إشعارات</p>";
  document.querySelectorAll("#stu-notifs-list .notif-item.unread").forEach(el => {
    el.onclick = async () => { await window.KhadoumaFB.markNotifRead(el.dataset.id); el.classList.remove("unread"); updateStuNotifBadge(); };
  });
}

async function loadStudentMyPerf() {
  if (!currentUser) return;
  const p = await window.KhadoumaFB.loadProgress(currentUser.id);
  const lessons = await window.KhadoumaFB.getLessons(currentUser.id);
  const lessonMap = {}; lessons.forEach(L => { lessonMap[L.id] = L; });
  const scores = p.lessonScores || {}; const errs = p.errorStats || {};
  const rows = Object.keys(scores).map(lid => {
    const sc = scores[lid];
    return `<tr><td>${lessonMap[lid]?.title || lid}</td><td>${sc.best}%</td><td>${sc.last}%</td><td>${sc.attempts}</td><td>${(p.repetitions || {})[lid] || 0}</td></tr>`;
  }).join("") || "<tr><td colspan='5'>لا بيانات</td></tr>";
  const topE = Object.entries(errs).sort((a, b) => b[1].count - a[1].count).slice(0, 5).map(([q, i]) => `<li>${i.count}× — ${q.slice(0, 60)}</li>`).join("") || "<li>لا أخطاء</li>";
  document.getElementById("stu-myperf-box").innerHTML = `
    <h3>أداؤك</h3>
    <p>النقاط: <b>${p.points || 0}</b> • 🔥 Streak: <b>${p.streak || 0}</b> يوم</p>
    <p>آخر نشاط: ${timeAgo(p.lastSeen || p.lastActivity)}</p>
    <div class="table-wrap"><table class="analytics-table">
      <thead><tr><th>الدرس</th><th>أفضل</th><th>آخر</th><th>محاولات</th><th>تكرارات</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <h4>أخطاؤك المتكررة</h4><ul>${topE}</ul>`;
}

async function loadReports() {
  const list = await window.KhadoumaFB.getStudents();
  const box = document.getElementById("reports-box");
  let html = "";
  for (const s of list) {
    const p = await window.KhadoumaFB.loadProgress(s.id);
    const weak = Object.entries(p.tries || {}).filter(([, n]) => n >= 2).map(([lid, n]) => `${lid} (${n})`);
    html += `<div class="card">
      <h4>${s.avatar || ""} ${s.name}</h4>
      <p>النقاط: <b>${p.points || 0}</b> • مكتملة: ${(p.done || []).length} • 🔥 ${p.streak || 0}</p>
      <p>آخر ظهور: ${timeAgo(p.lastSeen || p.lastActivity)}</p>
      <p>نقاط الضعف: ${weak.length ? weak.join("، ") : "لا يوجد"}</p>
    </div>`;
  }
  box.innerHTML = html || "<p class='muted'>لا بيانات</p>";
}
function exportReportPDF() { window.print(); modal("📄", "تصدير", "استخدم طباعة المتصفح → حفظ PDF"); }

async function loadSupNotifs() {
  const list = await window.KhadoumaFB.getNotifications(currentUser.id);
  document.getElementById("sup-notifs-list").innerHTML = list.map(n => `
    <div class="notif-item ${n.read ? "" : "unread"}">
      <strong>${n.title}</strong><p class="muted">${n.body}</p>
      <small>${new Date(n.createdAt).toLocaleString("ar")}</small>
    </div>`).join("") || "<p class='muted'>لا إشعارات</p>";
}