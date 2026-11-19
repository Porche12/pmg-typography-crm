// Client-side Security & Input Sanitization Module for IPK Yuzhny Ural
(function() {
  window.URAL_SECURITY = {
    // Escape HTML to prevent XSS in DOM injection
    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    // Sanitize string input before sending to API
    sanitize(str) {
      if (typeof str !== 'string') return '';
      return str.replace(/<[^>]*>?/gm, '').trim();
    },

    // Format Russian phone number as +7 (XXX) XXX-XX-XX
    formatPhone(input) {
      let digits = input.replace(/\D/g, '');
      if (digits.startsWith('8')) digits = '7' + digits.slice(1);
      if (!digits.startsWith('7')) digits = '7' + digits;

      let formatted = '+7';
      if (digits.length > 1) formatted += ' (' + digits.substring(1, 4);
      if (digits.length >= 5) formatted += ') ' + digits.substring(4, 7);
      if (digits.length >= 8) formatted += '-' + digits.substring(7, 9);
      if (digits.length >= 10) formatted += '-' + digits.substring(9, 11);
      return formatted;
    },

    // Auto-bind phone inputs
    bindPhoneInputs() {
      document.querySelectorAll('input[type="tel"]').forEach(input => {
        input.addEventListener('input', (e) => {
          const val = e.target.value;
          if (val.length > 3) {
            e.target.value = this.formatPhone(val);
          }
        });
      });
    }
  };
})();
