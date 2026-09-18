(function () {
  // Cache the Arabic font so we only download it once
  let arabicFontBase64 = null;
  let arabicFontLoading = null;

  async function ensureArabicFont(doc) {
    if (arabicFontBase64) {
      doc.addFileToVFS('NotoNaskhArabic-Regular.ttf', arabicFontBase64);
      doc.addFont('NotoNaskhArabic-Regular.ttf', 'NotoNaskhArabic', 'normal');
      return;
    }

    if (!arabicFontLoading) {
      arabicFontLoading = (async () => {
        try {
          const res = await fetch(
            'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoNaskhArabic/NotoNaskhArabic-Regular.ttf'
          );
          if (!res.ok) throw new Error('Font download failed');
          const buffer = await res.arrayBuffer();

          // Safe conversion for large files
          let binary = '';
          const bytes = new Uint8Array(buffer);
          const chunk = 0x8000;
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
          }
          arabicFontBase64 = btoa(binary);
        } catch (e) {
          console.warn('Could not load Arabic font, falling back to Helvetica', e);
          arabicFontBase64 = null;
        }
      })();
    }

    await arabicFontLoading;

    if (arabicFontBase64) {
      doc.addFileToVFS('NotoNaskhArabic-Regular.ttf', arabicFontBase64);
      doc.addFont('NotoNaskhArabic-Regular.ttf', 'NotoNaskhArabic', 'normal');
    }
  }

  function hasArabic(text) {
    return /[\u0600-\u06FF]/.test(text || '');
  }

  // تحميل jsPDF عند الحاجة فقط
  function loadJsPDF() {
    if (window.jspdf) return Promise.resolve(window.jspdf);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = function () { resolve(window.jspdf); };
      s.onerror = function () { reject(new Error('فشل تحميل مكتبة PDF')); };
      document.head.appendChild(s);
    });
  }

  window.KEA_Certificate = {
    generate: async function ({ studentName, courseTitle, level, date, score, certId, certType }) {
      try {
        await loadJsPDF();
      } catch (e) {
        alert('تعذر تحميل مكتبة PDF. تحقق من الاتصال بالإنترنت.');
        return null;
      }
      if (!window.jspdf) {
        alert('مكتبة PDF لم تُحمّل بعد');
        return null;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297, H = 210;

      // Load Arabic font if needed
      const needArabic = hasArabic(studentName) || hasArabic(courseTitle);
      if (needArabic) {
        await ensureArabicFont(doc);
      }

      // Background + borders
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, W, H, 'F');
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(3);
      doc.rect(10, 10, W - 20, H - 20);
      doc.setDrawColor(11, 30, 63);
      doc.setLineWidth(0.5);
      doc.rect(14, 14, W - 28, H - 28);

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(11, 30, 63);
      doc.text('KHADOUMA ENGLISH ACADEMY', W / 2, 26, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('OFFICIAL CERTIFICATE OF COMPLETION', W / 2, 32, { align: 'center' });

      // Logo circle
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(1.5);
      doc.circle(W / 2, 45, 8);
      doc.setFontSize(14);
      doc.setTextColor(212, 175, 55);
      doc.text('KEA', W / 2, 47.5, { align: 'center' });

      // Title
      doc.setFont('times', 'bold');
      doc.setFontSize(36);
      doc.setTextColor(11, 30, 63);
      doc.text('Certificate of Completion', W / 2, 75, { align: 'center' });

      // Presented to
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('This certificate is proudly presented to', W / 2, 92, { align: 'center' });

      // Student name (supports Arabic)
      const name = studentName || 'Student';
      if (hasArabic(name) && arabicFontBase64) {
        doc.setFont('NotoNaskhArabic', 'normal');
        doc.setFontSize(28);
      } else {
        doc.setFont('times', 'bolditalic');
        doc.setFontSize(32);
      }
      doc.setTextColor(11, 30, 63);
      doc.text(name, W / 2, 112, { align: 'center' });

      // Gold line under name
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.8);
      doc.line(W / 2 - 75, 116, W / 2 + 75, 116);

      // Course line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.text(
        certType === 'milestone' ? 'For achieving milestone' : 'For successfully completing',
        W / 2, 128, { align: 'center' }
      );

      // Course title (supports Arabic)
      const title = (courseTitle || '') + (level ? '  —  ' + level : '');
      if (hasArabic(title) && arabicFontBase64) {
        doc.setFont('NotoNaskhArabic', 'normal');
        doc.setFontSize(13);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
      }
      doc.setTextColor(11, 30, 63);
      doc.text(title, W / 2, 137, { align: 'center' });

      // Score
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Final Score: ${score}%`, W / 2, 145, { align: 'center' });

      // Date + Director
      doc.setFontSize(10);
      doc.setTextColor(11, 30, 63);
      doc.text(`Issued on: ${date}`, 40, 172);
      doc.line(35, 178, 100, 178);
      doc.text('Academy Director', 40, 183);

      // Official seal
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(1.2);
      doc.circle(W - 55, 172, 14);
      doc.setFontSize(8);
      doc.setTextColor(212, 175, 55);
      doc.text('OFFICIAL', W - 55, 170, { align: 'center' });
      doc.text('SEAL', W - 55, 175, { align: 'center' });

      // Certificate ID
      const finalId = certId || ('KEA-' + Date.now().toString(36).toUpperCase());
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Certificate ID: ${finalId}  |  Verify at khadouma-academy.com`,
        W / 2, H - 12, { align: 'center' }
      );

      // Safe filename (keeps Arabic letters)
      const safe = (studentName || 'Student')
        .replace(/\s+/g, '_')
        .replace(/[^\w\u0600-\u06FF_-]/g, '');
      doc.save(`Khadouma-Certificate-${safe}-${finalId}.pdf`);
      return finalId;
    }
  };
})();
