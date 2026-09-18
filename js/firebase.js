/* Firebase init + all data helpers — v7.1 infinite lessons + robust deletes */
(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyC28IcQKksT3fhEiLMneUST27fCkoStJJs",
    authDomain: "khadouma-english-academy.firebaseapp.com",
    projectId: "khadouma-english-academy",
    storageBucket: "khadouma-english-academy.firebasestorage.app",
    messagingSenderId: "105813500473",
    appId: "1:105813500473:web:bc5fd2f069be374d8d63e8",
    measurementId: "G-HDHVSH42M5"
  };

  firebase.initializeApp(firebaseConfig);
  try { firebase.analytics(); } catch (e) {}

  const db = firebase.firestore();
  // أخف وأحدث — يتجنب التحذير ويقلل استهلاك الذاكرة
  db.enablePersistence({ synchronizeTabs: false }).catch(function (err) {
    if (err.code === "failed-precondition") {
      console.warn("Persistence: تبويب آخر مفتوح");
    } else if (err.code === "unimplemented") {
      console.warn("Persistence غير مدعوم في هذا المتصفح");
    } else {
      console.warn("Persistence:", err.code);
    }
  });

  const LS = "khadouma_v7";
  const MILESTONES = [25, 50, 100, 200, 500, 1000, 2000];

  function emptyProgress() {
    return {
      done: [], points: 0, tries: {}, badges: [], level: 1,
      weeklyPoints: 0, weeklyResetAt: 0, streak: 0, lastStreakDate: null,
      lastActivity: null, lastSeen: null, activityLog: [],
      answerHistory: {}, errorStats: {}, lessonScores: {}, repetitions: {},
      issuedCerts: [], updatedAt: Date.now()
    };
  }

  function loadAllLocal() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } }
  function saveLocal(key, val) { const all = loadAllLocal(); all[key] = val; localStorage.setItem(LS, JSON.stringify(all)); }
  function getLocal(key, def) { const all = loadAllLocal(); return all[key] !== undefined ? all[key] : def; }

  window.KhadoumaFB = {
    db: db,
    MILESTONES: MILESTONES,
    emptyProgress: emptyProgress,
    getLocalProg: (sid) => getLocal("prog_" + sid, emptyProgress()),

    /* ===== PROGRESS ===== */
    loadProgress: function (sid) {
      return db.collection("progress").doc(sid).get()
        .then(snap => { if (snap.exists) { const d = snap.data(); saveLocal("prog_" + sid, d); return d; } return getLocal("prog_" + sid, emptyProgress()); })
        .catch(() => getLocal("prog_" + sid, emptyProgress()));
    },
    saveProgress: function (sid, data) {
      data.updatedAt = Date.now();
      data.lastActivity = new Date().toISOString();
      data.lastSeen = Date.now();
      saveLocal("prog_" + sid, data);
      return db.collection("progress").doc(sid).set(data, { merge: true }).catch(console.warn);
    },
    watchProgress: function (sid, cb) {
      return db.collection("progress").doc(sid).onSnapshot(
        snap => { const d = snap.exists ? snap.data() : emptyProgress(); saveLocal("prog_" + sid, d); cb(d); },
        () => cb(getLocal("prog_" + sid, emptyProgress()))
      );
    },

    recordQuizAttempt: function (sid, lessonId, attempt) {
      return this.loadProgress(sid).then(prog => {
        prog.answerHistory = prog.answerHistory || {};
        prog.errorStats = prog.errorStats || {};
        prog.lessonScores = prog.lessonScores || {};
        prog.repetitions = prog.repetitions || {};
        prog.tries = prog.tries || {};

        prog.answerHistory[lessonId] = prog.answerHistory[lessonId] || [];
        prog.answerHistory[lessonId].push({ at: Date.now(), score: attempt.score, pass: attempt.pass, answers: attempt.answers || [], errors: attempt.errors || [], duration: attempt.duration || 0, isRepeat: !!attempt.isRepeat });
        if (prog.answerHistory[lessonId].length > 20) prog.answerHistory[lessonId] = prog.answerHistory[lessonId].slice(-20);

        prog.tries[lessonId] = (prog.tries[lessonId] || 0) + 1;
        if (attempt.isRepeat) prog.repetitions[lessonId] = (prog.repetitions[lessonId] || 0) + 1;

        (attempt.errors || []).forEach(err => {
          const key = err.q || err.question || "unknown";
          prog.errorStats[key] = prog.errorStats[key] || { count: 0, lessonId, lastAt: 0 };
          prog.errorStats[key].count++;
          prog.errorStats[key].lastAt = Date.now();
          prog.errorStats[key].lessonId = lessonId;
        });

        prog.lessonScores[lessonId] = prog.lessonScores[lessonId] || { best: 0, last: 0, attempts: 0 };
        prog.lessonScores[lessonId].last = attempt.score;
        prog.lessonScores[lessonId].attempts++;
        if (attempt.score > prog.lessonScores[lessonId].best) prog.lessonScores[lessonId].best = attempt.score;

        prog.activityLog = prog.activityLog || [];
        prog.activityLog.push({ type: "quiz", lessonId, score: attempt.score, pass: attempt.pass, isRepeat: !!attempt.isRepeat, at: Date.now() });
        if (prog.activityLog.length > 200) prog.activityLog = prog.activityLog.slice(-200);

        return this.saveProgress(sid, prog).then(() => prog);
      });
    },

    touchActivity: function (sid, action) {
      const now = Date.now();
      // تحديث خفيف لـ lastSeen فقط — بدون إعادة قراءة كامل التقدم في كل دقيقة
      if (!action) {
        return db.collection("progress").doc(sid).set({
          lastSeen: now,
          lastActivity: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      }
      return this.loadProgress(sid).then(prog => {
        prog.lastSeen = now;
        prog.lastActivity = new Date().toISOString();
        prog.activityLog = prog.activityLog || [];
        prog.activityLog.push({ type: action, at: now });
        if (prog.activityLog.length > 200) prog.activityLog = prog.activityLog.slice(-200);
        return this.saveProgress(sid, prog);
      }).catch(() => {});
    },

    /* ===== STREAK + WEEKLY ===== */
    updateStreakAndWeekly: function (sid) {
      const today = new Date().toISOString().slice(0, 10);
      const weekStart = (() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay()); return d.getTime(); })();
      return this.loadProgress(sid).then(prog => {
        prog.streak = prog.streak || 0;
        if (prog.lastStreakDate !== today) {
          const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          prog.streak = (prog.lastStreakDate === y) ? prog.streak + 1 : 1;
          prog.lastStreakDate = today;
        }
        if (!prog.weeklyResetAt || prog.weeklyResetAt < weekStart) { prog.weeklyPoints = 0; prog.weeklyResetAt = weekStart; }
        return this.saveProgress(sid, prog).then(() => prog);
      });
    },

    /* ===== STUDENTS ===== */
    getStudents: function () {
      return db.collection("students").where("active", "==", true).get()
        .then(snap => { const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); saveLocal("students", l); return l; })
        .catch(() => getLocal("students", []));
    },
    getAllStudents: function () {
      return db.collection("students").get()
        .then(snap => { const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); return l; })
        .catch(() => getLocal("students", []));
    },
    saveStudent: function (id, data) { return db.collection("students").doc(id).set(data, { merge: true }); },
    deleteStudent: function (id, hard) {
      if (hard) {
        return db.collection("students").doc(id).delete()
          .then(() => db.collection("progress").doc(id).delete().catch(() => {}))
          .then(() => {
            // مسح الكاش المحلي فوراً
            try {
              const all = loadAllLocal();
              delete all["prog_" + id];
              if (all.students) all.students = (all.students || []).filter(s => s.id !== id);
              localStorage.setItem(LS, JSON.stringify(all));
            } catch (e) {}
          });
      }
      return db.collection("students").doc(id).set({ active: false, deletedAt: Date.now() }, { merge: true });
    },
    findStudentByCode: function (code) {
      const c = (code || "").trim().toUpperCase();
      return db.collection("students").where("code", "==", c).limit(1).get()
        .then(snap => { if (snap.empty) return null; const d = snap.docs[0]; const data = Object.assign({ id: d.id }, d.data()); if (data.active === false) return null; return data; })
        .catch(err => { console.error(err); return null; });
    },

    /* ===== SUPERVISORS ===== */
    getSupervisors: function () {
      return db.collection("supervisors").where("active", "==", true).get()
        .then(snap => { const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); return l; });
    },
    findSupervisorByCode: function (code) {
      const c = (code || "").trim().toUpperCase();
      return db.collection("supervisors").where("code", "==", c).limit(1).get()
        .then(snap => { if (snap.empty) return null; const d = snap.docs[0]; const data = Object.assign({ id: d.id }, d.data()); if (data.active === false) return null; return data; })
        .catch(err => { console.error(err); return null; });
    },
    saveSupervisor: function (id, data) { return db.collection("supervisors").doc(id).set(data, { merge: true }); },

    /* ===== MODULES ===== */
    getModules: function () {
      return db.collection("modules").orderBy("order").get()
        .then(snap => { const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); saveLocal("modules", l); return l; })
        .catch(() => getLocal("modules", []));
    },
    getAllModulesAdmin: function () {
      return db.collection("modules").orderBy("order").get()
        .then(snap => { const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); return l; })
        .catch(() => db.collection("modules").get().then(snap => {
          const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data())));
          l.sort((a,b) => (a.order||0) - (b.order||0));
          return l;
        }).catch(() => []));
    },
    saveModule: function (id, data) {
      if (!id) id = db.collection("modules").doc().id;
      data.updatedAt = Date.now();
      return db.collection("modules").doc(id).set(data, { merge: true }).then(() => id);
    },
    deleteModule: function (id) {
      return db.collection("modules").doc(id).delete().then(() => {
        try {
          const mods = getLocal("modules", []);
          saveLocal("modules", mods.filter(m => m.id !== id));
        } catch (e) {}
      });
    },

    /* ===== LESSONS ===== */
    getLessons: function (forStudentId) {
      return db.collection("lessons").orderBy("order").get()
        .then(snap => {
          const list = [];
          snap.forEach(d => {
            const L = Object.assign({ id: d.id }, d.data());
            if (!L.published) return;
            if (L.targetStudents && L.targetStudents.length && forStudentId) {
              if (L.targetStudents.indexOf("all") === -1 && L.targetStudents.indexOf(forStudentId) === -1) return;
            }
            list.push(L);
          });
          saveLocal("lessons", list);
          return list;
        })
        .catch(() => getLocal("lessons", []));
    },
    getAllLessonsAdmin: function () {
      return db.collection("lessons").orderBy("order").get()
        .then(snap => { const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); return l; })
        .catch(() => db.collection("lessons").get().then(snap => {
          const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data())));
          l.sort((a,b) => (a.order||0) - (b.order||0));
          return l;
        }).catch(() => []));
    },
    saveLesson: function (id, data) {
      if (!id) id = db.collection("lessons").doc().id;
      data.updatedAt = Date.now();
      data.version = (data.version || 0) + 1;
      return db.collection("lessons").doc(id).set(data, { merge: true }).then(() => id);
    },
    deleteLesson: function (id) {
      return db.collection("lessons").doc(id).delete().then(() => {
        try {
          const lessons = getLocal("lessons", []);
          saveLocal("lessons", lessons.filter(l => l.id !== id));
        } catch (e) {}
      });
    },
    bulkSaveLessons: async function (lessons) {
      const results = [];
      for (const L of lessons) {
        const id = await this.saveLesson(L.id || null, L);
        results.push(id);
      }
      return results;
    },
    watchLessons: function (cb) {
      return db.collection("lessons").orderBy("order").onSnapshot(
        snap => { const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); cb(l); },
        err => console.warn(err)
      );
    },

    /* ===== POSTS ===== */
    addPost: function (post) {
      const id = db.collection("posts").doc().id;
      const data = Object.assign({ id, createdAt: Date.now(), updatedAt: Date.now(), published: true }, post);
      return db.collection("posts").doc(id).set(data).then(() => id);
    },
    deletePost: function (id) { return db.collection("posts").doc(id).delete(); },
    getPosts: function (limit) {
      return db.collection("posts").orderBy("createdAt", "desc").limit(limit || 50).get()
        .then(snap => { const l = []; snap.forEach(d => { const p = Object.assign({ id: d.id }, d.data()); if (p.published !== false) l.push(p); }); return l; })
        .catch(() => []);
    },
    getAllPostsAdmin: function () {
      return db.collection("posts").orderBy("createdAt", "desc").limit(100).get()
        .then(snap => { const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); return l; })
        .catch(() => []);
    },
    watchPosts: function (cb) {
      return db.collection("posts").orderBy("createdAt", "desc").limit(30).onSnapshot(
        snap => { const l = []; snap.forEach(d => { const p = Object.assign({ id: d.id }, d.data()); if (p.published !== false) l.push(p); }); cb(l); },
        err => console.warn(err)
      );
    },

    /* ===== NOTIFICATIONS ===== */
    addNotification: function (targetId, type, title, body, meta) {
      return db.collection("notifications").add({ targetId, type: type || "info", title, body: body || "", meta: meta || {}, read: false, createdAt: Date.now() });
    },
    broadcastNotification: function (targetIds, type, title, body, meta) {
      return Promise.all((targetIds || []).map(tid => this.addNotification(tid, type, title, body, meta)));
    },
    getNotifications: function (targetId) {
      return db.collection("notifications").where("targetId", "==", targetId).orderBy("createdAt", "desc").limit(60).get()
        .then(snap => { const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); return l; })
        .catch(() => []);
    },
    watchNotifications: function (targetId, cb) {
      return db.collection("notifications").where("targetId", "==", targetId).orderBy("createdAt", "desc").limit(60).onSnapshot(
        snap => { const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); cb(l); },
        () => cb([])
      );
    },
    markNotifRead: function (id) { return db.collection("notifications").doc(id).update({ read: true }); },
    markAllNotifsRead: function (targetId) {
      return this.getNotifications(targetId).then(list => Promise.all(list.filter(n => !n.read).map(n => db.collection("notifications").doc(n.id).update({ read: true }))));
    },

    /* ===== CERTIFICATES ===== */
    issueCertificate: function (sid, data) {
      const id = 'cert_' + sid + '_' + (data.refId || data.lessonId || 'general');
      const cert = Object.assign({
        studentId: sid, issuedAt: Date.now(),
        certId: 'KEA-' + Date.now().toString(36).toUpperCase()
      }, data);
      return db.collection("certificates").doc(id).set(cert).then(() => cert);
    },
    getCertificates: function (sid) {
      return db.collection("certificates").where("studentId", "==", sid).get()
        .then(snap => { const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); l.sort((a,b)=>b.issuedAt-a.issuedAt); return l; })
        .catch(() => []);
    },
    findCertificate: function (certId) {
      const c = (certId || "").trim().toUpperCase();
      return db.collection("certificates").where("certId", "==", c).limit(1).get()
        .then(snap => { if (snap.empty) return null; return snap.docs[0].data(); })
        .catch(() => null);
    },
    watchCertificates: function (sid, cb) {
      return db.collection("certificates").where("studentId", "==", sid).onSnapshot(
        snap => { const l = []; snap.forEach(d => l.push(Object.assign({ id: d.id }, d.data()))); l.sort((a,b)=>b.issuedAt-a.issuedAt); cb(l); },
        () => cb([])
      );
    },

    /* ===== ATTENDANCE ===== */
    recordAttendance: function (sid, type) {
      const key = new Date().toISOString().slice(0, 10);
      return db.collection("attendance").doc(sid + '_' + key).set({
        studentId: sid, date: key, lastType: type || 'login', lastAt: Date.now(),
        count: firebase.firestore.FieldValue.increment(1)
      }, { merge: true }).catch(() => {});
    },

    /* ===== PUBLIC STATS (مع كاش 5 دقائق) ===== */
    getPublicStats: function () {
      const cached = getLocal("public_stats", null);
      const now = Date.now();
      if (cached && cached.at && (now - cached.at) < 5 * 60 * 1000) {
        return Promise.resolve({
          students: cached.students || 0,
          lessons: cached.lessons || 0,
          certificates: cached.certificates || 0
        });
      }
      return Promise.all([
        db.collection("students").where("active", "==", true).limit(100).get().catch(() => ({ size: 0 })),
        db.collection("lessons").limit(200).get().catch(() => ({ size: 0 })),
        db.collection("certificates").limit(100).get().catch(() => ({ size: 0 }))
      ]).then(r => {
        const stats = {
          students: r[0].size || 0,
          lessons: r[1].size || 0,
          certificates: r[2].size || 0,
          at: now
        };
        saveLocal("public_stats", stats);
        return stats;
      });
    },

    /* ===== LOGIN ATTEMPTS ===== */
    logLoginAttempt: function (role, code, success, extra) {
      return db.collection("loginAttempts").add({
        role, codeHint: (code || "").slice(0, 4) + "***", success: !!success, extra: extra || "", at: Date.now(), ua: navigator.userAgent.slice(0, 120)
      }).catch(() => {});
    },

    /* ===== SEED ===== */
    seedIfEmpty: async function () {
      const sSnap = await db.collection("supervisors").limit(1).get();
      if (!sSnap.empty) return false;

      const supervisors = [
        { id: "abd", name: "خدومة عبد الباسط", role: "المشرف العام", code: "SUPER-ABD-2026", canSeeAll: true, students: ["baha","safiya","abdullah","mohamed","habib","aisha"], active: true },
        { id: "nadia", name: "سليمان نادية", role: "مشرفة", code: "NADIA-SU-88", canSeeAll: false, students: ["habib","baha","aisha"], active: true },
        { id: "samia", name: "حمادي سامية", role: "مشرفة", code: "SAMIA-HA-77", canSeeAll: false, students: ["mohamed","abdullah","safiya"], active: true }
      ];
      const students = [
        { id: "baha", name: "خدومة بهاء الدين", first: "بهاء الدين", age: 7, avatar: "🧒", code: "STU-BAHA-07", color: "#22c55e", active: true, kidsMode: true },
        { id: "safiya", name: "خدومة صفية", first: "صفية", age: 9, avatar: "👧", code: "STU-SAFIYA-09", color: "#ec4899", active: true, kidsMode: true },
        { id: "abdullah", name: "خدومة عبد الله", first: "عبد الله", age: 10, avatar: "👦", code: "STU-ABD-10", color: "#f59e0b", active: true, kidsMode: false },
        { id: "mohamed", name: "خدومة محمد", first: "محمد", age: 13, avatar: "🧑", code: "STU-MOH-13", color: "#3b82f6", active: true, kidsMode: false },
        { id: "habib", name: "خدومة حبيب", first: "حبيب", age: 13, avatar: "👨‍🎓", code: "STU-HAB-13", color: "#8b5cf6", active: true, kidsMode: false },
        { id: "aisha", name: "خدومة عائشة", first: "عائشة", age: 15, avatar: "👩‍🎓", code: "STU-AIS-15", color: "#ef4444", active: true, kidsMode: false }
      ];

      for (const s of supervisors) await db.collection("supervisors").doc(s.id).set(s);
      for (const s of students) await db.collection("students").doc(s.id).set(s);

      // Modules
      const modules = [
        { id: "m-a1-1", title: "الأساسيات: الحروف والأصوات", titleEn: "Fundamentals: Letters & Sounds", level: "A1", order: 1, published: true },
        { id: "m-a1-2", title: "المفردات اليومية", titleEn: "Daily Vocabulary", level: "A1", order: 2, published: true },
        { id: "m-a2-1", title: "الأزمنة الأساسية", titleEn: "Basic Tenses", level: "A2", order: 3, published: true }
      ];
      for (const m of modules) await db.collection("modules").doc(m.id).set(m);

      // Sample lessons
      const lessons = [
        {
          id: "lesson1", title: "الحروف A–M والأصوات", titleEn: "Letters A–M & Sounds", order: 1,
          moduleId: "m-a1-1", level: "A1", goal: "التعرف على شكل الحرف واسمه وصوته",
          published: true, targetStudents: ["all"],
          videoText: "A apple /æ/ — B ball /b/ — C cat /k/",
          videoArabic: "نتعلم اسم الحرف وصوته، وليس فقط أغنية ABC.",
          videos: [{ id: "idsfHDD-fPk", t: "الحروف وطريقة نطقها", ar: true }],
          listen: "Apple Ball Cat Dog Elephant", listenAr: "تفاحة كرة قطة كلب فيل",
          practice: { type: "list", items: ["A /æ/ Apple", "B /b/ Ball", "C /k/ Cat"] },
          quiz: [
            { type: "mcq", q: "صوت حرف A في Apple؟", options: ["/æ/", "/eɪ/", "/ɪ/"], correct: 0 },
            { type: "mcq", q: "Ball تبدأ بحرف؟", options: ["A", "B", "C"], correct: 1 },
            { type: "fill", q: "أكمل: A is for ___", answer: "apple" }
          ],
          createdBy: "abd", createdAt: Date.now()
        },
        {
          id: "lesson2", title: "الحروف N–Z والأصوات", titleEn: "Letters N–Z & Sounds", order: 2,
          moduleId: "m-a1-1", level: "A1", published: true, targetStudents: ["all"],
          videoText: "N nose /n/ — O orange /ɒ/ — P pen /p/",
          listen: "Nose Orange Pen Queen", listenAr: "أنف برتقال قلم ملكة",
          practice: { type: "list", items: ["N /n/ Nose", "O /ɒ/ Orange", "P /p/ Pen"] },
          quiz: [
            { type: "mcq", q: "صوت O في Orange؟", options: ["/oʊ/", "/ɒ/", "/uː/"], correct: 1 },
            { type: "fill", q: "N is for ___", answer: "nose" }
          ],
          createdBy: "abd", createdAt: Date.now()
        }
      ];
      for (const L of lessons) await db.collection("lessons").doc(L.id).set(L);

      await db.collection("posts").doc("welcome").set({
        title: "مرحباً بكم في أكاديمية خدومة",
        body: "منصة تعليمية رسمية بدروس لا نهائية. تابع المنشورات والإشعارات باستمرار.",
        authorId: "abd", authorName: "خدومة عبد الباسط", type: "news", published: true,
        createdAt: Date.now(), updatedAt: Date.now()
      });

      console.log("Seeded v7");
      return true;
    }
  };
})();