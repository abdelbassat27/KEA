(function () {
  const DICT = {
    ar: {
      "nav.about":"من نحن","nav.features":"المميزات","nav.courses":"المسارات","nav.verify":"تحقق من شهادة","nav.contact":"تواصل","nav.login":"دخول المنصة",
      "hero.badge":"✦ منصة تعليمية رسمية معتمدة",
      "hero.title":"أتقن الإنجليزية مع <span class='grad'>أكاديمية خدومة</span>",
      "hero.sub":"دروس تفاعلية لا نهائية • وحدات متدرجة A1→C2 • اختبارات ذكية • شهادات PDF معتمدة عند إتمام كل وحدة ومستوى.",
      "hero.cta":"ابدأ الآن","hero.cta2":"اكتشف المميزات",
      "stats.stu":"طالب","stats.les":"درس","stats.cert":"شهادة",
      "about.title":"من نحن",
      "about.lead":"أكاديمية خدومة منصة رقمية متخصصة في تعليم اللغة الإنجليزية بمنهج لا نهائي ومتجدّد من الصفر إلى الإتقان، مع متابعة فردية، نظام تقييم شفاف، وشهادات معتمدة عند إتمام كل وحدة ومستوى.",
      "about.m":"رسالتنا","about.mt":"تمكين كل طالب من التحدث بثقة.",
      "about.v":"رؤيتنا","about.vt":"الأكاديمية الأولى عربيًا في التعليم التفاعلي.",
      "about.va":"قيمنا","about.vat":"الجودة • الشفافية • الالتزام • الاحترام.",
      "feat.title":"لماذا أكاديمية خدومة؟",
      "feat.1t":"دروس لا نهائية","feat.1d":"منهج متجدّد باستمرار — يتوسّع بلا حدود.",
      "feat.2t":"وحدات ومستويات","feat.2d":"A1 → C2 مع تدرّج منطقي واضح.",
      "feat.3t":"اختبارات ذكية","feat.3d":"تقييم فوري وتحليل دقيق للأخطاء.",
      "feat.4t":"مضاد للغش","feat.4d":"مراقبة التبويب والصوت والاختصارات.",
      "feat.5t":"شهادات ديناميكية","feat.5d":"لكل وحدة ولكل مستوى ولكل معلم (25/50/100...).",
      "feat.6t":"Streak يومي","feat.6d":"مكافآت للأيام المتتالية ولوحة صدارة أسبوعية.",
      "crs.title":"المسارات والمستويات","cont.title":"تواصل معنا",
      "verify.title":"التحقق من شهادة","verify.lead":"أدخل رقم الشهادة (مثل: KEA-XXXXXX) للتحقق من صحتها.","verify.btn":"تحقق",
      "foot.tag":"تعلّم الإنجليزية باحترافية، واحصل على شهادة معتمدة.","foot.legal":"قانوني","foot.terms":"شروط الاستخدام","foot.priv":"سياسة الخصوصية","foot.ac":"سياسة منع الغش","foot.links":"روابط","foot.portal":"منصة الطالب","foot.rights":"جميع الحقوق محفوظة",
      "login.sub":"نظام تعليمي رسمي من الصفر إلى الاحتراف","login.stu":"طالب","login.sup":"مشرف","login.code":"أدخل رمزك التعليمي","login.supcode":"أدخل رمز الإشراف","login.enter":"دخول إلى صفحتي","login.supenter":"دخول لوحة الإشراف","login.hint":"الرموز سرية — اطلبها من المشرف العام."
    },
    en: {
      "nav.about":"About","nav.features":"Features","nav.courses":"Tracks","nav.verify":"Verify Certificate","nav.contact":"Contact","nav.login":"Login",
      "hero.badge":"✦ Official Certified Learning Platform",
      "hero.title":"Master English with <span class='grad'>Khadouma Academy</span>",
      "hero.sub":"Infinite interactive lessons • A1→C2 modules • Smart quizzes • Certified PDFs per module and level.",
      "hero.cta":"Start Now","hero.cta2":"Explore Features",
      "stats.stu":"Students","stats.les":"Lessons","stats.cert":"Certificates",
      "about.title":"About Us",
      "about.lead":"Khadouma Academy is a digital platform specialized in teaching English with an infinite, evolving curriculum from zero to mastery, with close tracking and certified certificates per module and level.",
      "about.m":"Mission","about.mt":"Empower every student to speak confidently.",
      "about.v":"Vision","about.vt":"Leading Arab academy in interactive learning.",
      "about.va":"Values","about.vat":"Quality • Transparency • Commitment • Respect.",
      "feat.title":"Why Khadouma Academy?",
      "feat.1t":"Infinite Lessons","feat.1d":"Evolving curriculum — scales without limits.",
      "feat.2t":"Modules & Levels","feat.2d":"A1 → C2 with clear progression.",
      "feat.3t":"Smart Quizzes","feat.3d":"Instant assessment with error analysis.",
      "feat.4t":"Anti-Cheat","feat.4d":"Tab, audio & shortcut monitoring.",
      "feat.5t":"Dynamic Certificates","feat.5d":"Per module, per level, and milestones (25/50/100...).",
      "feat.6t":"Daily Streak","feat.6d":"Consecutive-day rewards & weekly leaderboard.",
      "crs.title":"Tracks & Levels","cont.title":"Contact Us",
      "verify.title":"Verify Certificate","verify.lead":"Enter certificate ID (e.g. KEA-XXXXXX) to verify.","verify.btn":"Verify",
      "foot.tag":"Learn English professionally, earn a certified certificate.","foot.legal":"Legal","foot.terms":"Terms of Use","foot.priv":"Privacy Policy","foot.ac":"Anti-Cheat Policy","foot.links":"Links","foot.portal":"Student Portal","foot.rights":"All rights reserved",
      "login.sub":"Official learning system from zero to mastery","login.stu":"Student","login.sup":"Supervisor","login.code":"Enter your code","login.supcode":"Enter supervisor code","login.enter":"Enter My Portal","login.supenter":"Enter Supervisor Panel","login.hint":"Codes are private — request from admin."
    }
  };

  function apply(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const dict = DICT[lang] || DICT.ar;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n;
      if (dict[k] !== undefined) el.innerHTML = dict[k];
    });
    localStorage.setItem('kea_lang', lang);
    const b = document.getElementById('lang-btn');
    if (b) b.textContent = lang === 'ar' ? 'EN' : 'ع';
  }

  window.KEA_I18N = { apply, toggle: () => apply((localStorage.getItem('kea_lang') || 'ar') === 'ar' ? 'en' : 'ar') };

  document.addEventListener('DOMContentLoaded', () => {
    apply(localStorage.getItem('kea_lang') || 'ar');
    document.getElementById('lang-btn')?.addEventListener('click', window.KEA_I18N.toggle);
    document.getElementById('lang-btn-sup')?.addEventListener('click', window.KEA_I18N.toggle);
  });
})();