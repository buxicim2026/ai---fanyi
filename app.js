let uploadedFiles = [];
let translationData = { original: '', translated: '', subtitles: [] };
let isTranslating = false;
let abortController = null;

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const apiKeyInput = document.getElementById('apiKey');
const apiEndpointInput = document.getElementById('apiEndpoint');
const sourceLangSelect = document.getElementById('sourceLang');
const startBtn = document.getElementById('startTranslate');
const stopBtn = document.getElementById('stopTranslate');
const progressBar = document.getElementById('progressBar');
const statusText = document.getElementById('statusText');
const originalText = document.getElementById('originalText');
const translatedText = document.getElementById('translatedText');
const bilingualText = document.getElementById('bilingualText');
const exportTxtBtn = document.getElementById('exportTxt');
const exportSrtBtn = document.getElementById('exportSrt');
const exportJsonBtn = document.getElementById('exportJson');
const tabBtns = document.querySelectorAll('.tab-btn');

const langMap = { 'auto': '自动检测', 'en': '英语', 'ja': '日语', 'ko': '韩语', 'fr': '法语', 'de': '德语', 'es': '西班牙语', 'ru': '俄语', 'pt': '葡萄牙语', 'it': '意大利语' };

document.addEventListener('DOMContentLoaded', () => { initEventListeners(); loadSavedConfig(); });

function initEventListeners() {
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    startBtn.addEventListener('click', startTranslation);
    stopBtn.addEventListener('click', stopTranslation);
    exportTxtBtn.addEventListener('click', () => exportFile('txt'));
    exportSrtBtn.addEventListener('click', () => exportFile('srt'));
    exportJsonBtn.addEventListener('click', () => exportFile('json'));
    tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    apiKeyInput.addEventListener('change', saveConfig);
    apiEndpointInput.addEventListener('change', saveConfig);
}

function handleFileSelect(e) { addFiles(Array.from(e.target.files)); }
function handleDragOver(e) { e.preventDefault(); uploadArea.classList.add('dragover'); }
function handleDragLeave(e) { e.preventDefault(); uploadArea.classList.remove('dragover'); }
function handleDrop(e) { e.preventDefault(); uploadArea.classList.remove('dragover'); addFiles(Array.from(e.dataTransfer.files)); }

function addFiles(files) {
    files.forEach(file => {
        const validExtensions = ['.txt', '.srt', '.json'];
        if (file.type.startsWith('text/') || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
            uploadedFiles.push(file);
            renderFileList();
        } else { alert(`不支持的文件格式：${file.name}`); }
    });
}

function renderFileList() {
    fileList.innerHTML = '';
    uploadedFiles.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerHTML = `<span>📄 ${file.name} (${formatFileSize(file.size)})</span><button class="remove-btn" onclick="removeFile(${index})">删除</button>`;
        fileList.appendChild(div);
    });
}

function removeFile(index) { uploadedFiles.splice(index, 1); renderFileList(); }
function formatFileSize(bytes) { if (bytes < 1024) return bytes + ' B'; if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'; return (bytes / (1024 * 1024)).toFixed(2) + ' MB'; }

async function startTranslation() {
    if (uploadedFiles.length === 0) { alert('请先上传文件！'); return; }
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) { alert('请输入 API Key！'); return; }
    isTranslating = true;
    abortController = new AbortController();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = '正在处理...';
    statusText.classList.add('processing');
    try {
        for (let i = 0; i < uploadedFiles.length; i++) {
            if (!isTranslating) break;
            const file = uploadedFiles[i];
            updateProgress((i / uploadedFiles.length) * 100);
            statusText.textContent = `正在处理：${file.name}`;
            const text = await readFileAsText(file);
            translationData.original = text;
            statusText.textContent = `正在翻译：${file.name}...`;
            const translated = await translateText(text, apiKey, abortController.signal);
            translationData.translated = translated;
            translationData.subtitles = generateSubtitles(text, translated);
            displayResults();
        }
        if (isTranslating) { updateProgress(100); statusText.textContent = '✅ 翻译完成！'; enableExportButtons(); }
    } catch (error) {
        if (error.name !== 'AbortError') { statusText.textContent = `❌ 错误：${error.message}`; alert(`翻译失败：${error.message}`); }
        else { statusText.textContent = '已停止翻译'; }
    } finally { isTranslating = false; abortController = null; startBtn.disabled = false; stopBtn.disabled = true; statusText.classList.remove('processing'); }
}

function stopTranslation() { isTranslating = false; if (abortController) abortController.abort(); statusText.textContent = '已停止'; startBtn.disabled = false; stopBtn.disabled = true; }
function readFileAsText(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.onerror = reject; reader.readAsText(file, 'UTF-8'); }); }

async function translateText(text, apiKey, signal) {
    const endpoint = apiEndpointInput.value.trim();
    const sourceLang = sourceLangSelect.value;
    const langName = langMap[sourceLang] || '';
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: 'qwen-turbo',
            input: { messages: [
                { role: 'system', content: '你是专业翻译助手，将多语言文本翻译成中文，只输出翻译结果。' },
                { role: 'user', content: `请将以下${langName ? langName : ''}文本翻译成中文：\n\n${text}` }
            ]},
            parameters: { result_format: 'message' }
        }),
        signal
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(`API 错误 ${response.status}: ${errorData.message || response.statusText}`); }
    const data = await response.json();
    return data.output?.choices?.[0]?.message?.content || '翻译失败';
}

function displayResults() {
    originalText.value = translationData.original;
    translatedText.value = translationData.translated;
    const originalLines = translationData.original.split('\n').filter(l => l.trim());
    const translatedLines = translationData.translated.split('\n').filter(l => l.trim());
    let bilingual = '';
    for (let i = 0; i < Math.max(originalLines.length, translatedLines.length); i++) {
        if (originalLines[i]) bilingual += `原文：${originalLines[i]}\n`;
        if (translatedLines[i]) bilingual += `译文：${translatedLines[i]}\n\n`;
    }
    bilingualText.value = bilingual;
    switchTab('bilingual');
}

function generateSubtitles(original, translated) {
    const originalLines = original.split('\n').filter(l => l.trim());
    const translatedLines = translated.split('\n').filter(l => l.trim());
    return originalLines.map((line, i) => ({ index: i + 1, startTime: formatTime(i * 3000), endTime: formatTime((i + 1) * 3000), original: line, translated: translatedLines[i] || '' }));
}

function formatTime(ms) {
    const hours = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const minutes = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const seconds = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    const milliseconds = String(ms % 1000).padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
}

function switchTab(tabName) {
    tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
    document.querySelectorAll('.result-content textarea').forEach(textarea => { textarea.classList.toggle('active', textarea.id === `${tabName}Text`); });
}

function updateProgress(percent) { progressBar.style.width = `${percent}%`; }
function enableExportButtons() { exportTxtBtn.disabled = false; exportSrtBtn.disabled = false; exportJsonBtn.disabled = false; }

function exportFile(type) {
    let content, filename, mimeType;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    switch(type) {
        case 'txt': content = bilingualText.value; filename = `双语翻译_${timestamp}.txt`; mimeType = 'text/plain;charset=utf-8'; break;
        case 'srt': content = generateSRTContent(); filename = `字幕_${timestamp}.srt`; mimeType = 'text/plain;charset=utf-8'; break;
        case 'json': content = JSON.stringify(translationData, null, 2); filename = `翻译数据_${timestamp}.json`; mimeType = 'application/json;charset=utf-8'; break;
    }
    downloadFile(content, filename, mimeType);
}

function generateSRTContent() {
    if (translationData.subtitles.length === 0) { const lines = translationData.translated.split('\n').filter(l => l.trim()); return lines.map((line, i) => `${i + 1}\n${formatTime(i * 3000)} --> ${formatTime((i + 1) * 3000)}\n${line}\n`).join('\n'); }
    return translationData.subtitles.map(sub => `${sub.index}\n${sub.startTime} --> ${sub.endTime}\n${sub.translated}\n`).join('\n');
}

function downloadFile(content, filename, mimeType) { const blob = new Blob([content], { type: mimeType }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
function saveConfig() { localStorage.setItem('translation_apiKey', apiKeyInput.value); localStorage.setItem('translation_apiEndpoint', apiEndpointInput.value); localStorage.setItem('translation_sourceLang', sourceLangSelect.value); }
function loadSavedConfig() { const savedKey = localStorage.getItem('translation_apiKey'); const savedEndpoint = localStorage.getItem('translation_apiEndpoint'); const savedLang = localStorage.getItem('translation_sourceLang'); if (savedKey) apiKeyInput.value = savedKey; if (savedEndpoint) apiEndpointInput.value = savedEndpoint; if (savedLang) sourceLangSelect.value = savedLang; }
window.removeFile = removeFile;
