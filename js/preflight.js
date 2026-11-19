// Online Preflight Validation Engine for IPK Yuzhny Ural
(function() {
  const uploadedFilesState = [];

  function init() {
    const dropzone = document.getElementById('preflightDropzone');
    const fileInput = document.getElementById('preflightFileInput');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    });
  }

  async function handleFiles(fileList) {
    const formData = new FormData();
    const validFiles = [];

    const allowed = ['.pdf', '.tiff', '.tif', '.ai', '.cdr', '.psd', '.eps', '.jpg', '.jpeg', '.png'];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = '.' + file.name.split('.').pop().toLowerCase();

      if (!allowed.includes(ext)) {
        if (window.URAL_APP) {
          window.URAL_APP.showToast(`Файл ${file.name} не поддерживается. Загрузите PDF, TIFF, AI, CDR или PSD.`, 'error');
        }
        continue;
      }

      if (file.size > 50 * 1024 * 1024) {
        if (window.URAL_APP) {
          window.URAL_APP.showToast(`Файл ${file.name} превышает лимит 50 МБ.`, 'error');
        }
        continue;
      }

      formData.append('files', file);
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const listContainer = document.getElementById('preflightReportsList');
    if (listContainer) {
      listContainer.innerHTML = `<div class="p-3 text-center text-muted font-monospace">⏳ Выполняется препресс-анализ макетов...</div>`;
    }

    try {
      const response = await fetch('/api/preflight', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        renderReports(data.files);
        data.files.forEach(f => uploadedFilesState.push(f.originalName));
        if (window.URAL_APP) {
          window.URAL_APP.showToast('Файлы успешно проверены препресс-модулем!', 'success');
        }
      } else {
        throw new Error(data.error || 'Ошибка проверки макета');
      }
    } catch (err) {
      if (listContainer) {
        listContainer.innerHTML = `
          <div class="report-item" style="border-left: 4px solid #EF4444;">
            <div>
              <div class="font-bold text-red-600">Ошибка при проверке файла</div>
              <div class="text-sm text-muted">${err.message}</div>
            </div>
          </div>
        `;
      }
    }
  }

  function renderReports(files) {
    const listContainer = document.getElementById('preflightReportsList');
    if (!listContainer) return;

    listContainer.innerHTML = files.map(f => `
      <div class="report-item success">
        <div>
          <div style="font-weight: 700; font-size: 1rem; color: #14171A; display: flex; align-items: center; gap: 8px;">
            <span>📄 ${f.originalName}</span>
            <span style="font-family: var(--font-mono); font-size: 0.75rem; background: #DCFCE7; color: #15803D; padding: 2px 8px; border-radius: 4px;">ГОТОВ К ПЕЧАТИ</span>
          </div>
          <div style="font-size: 0.8125rem; color: #5C6470; margin-top: 4px; font-family: var(--font-mono);">
            Формат: ${f.format} | Размер: ${f.size} | ${f.preflightReport.resolution} | ${f.preflightReport.colorSpace}
          </div>
          ${f.preflightReport.recommendations.map(r => `
            <div style="font-size: 0.775rem; color: #166534; margin-top: 2px;">• ${r}</div>
          `).join('')}
        </div>
        <div>
          <button type="button" class="btn btn-sm btn-primary" onclick="window.URAL_APP?.openOrderModal({ files: ['${f.originalName}'] })">
            Запустить в печать
          </button>
        </div>
      </div>
    `).join('');
  }

  window.URAL_PREFLIGHT = {
    init,
    getUploadedFiles: () => [...uploadedFilesState]
  };
})();
