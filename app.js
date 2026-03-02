// 全局变量
let uploadedFiles = [];
let translationData = { 
    original: '', 
    translated: '', 
    subtitles: [],
    mediaInfo: {}
};
let isTranslating = false;
let abortController = null;

// DOM 元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const sttProviderSelect = document.getElementById('sttProvider');
const sttKeyInput = document.getElementById('sttKey');
const sttRegionInput = document.getElementById('sttRegion');
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
const subtitlesText = document.getElementById('subtitlesText');
const audioPlayerContainer = document.getElementById('audioPlayerContainer');
const audioPlayer = document.getElementById('audioPlayer');
const exportTxtBtn = document.getElementById('exportTxt');
const exportSrtBtn = document.getElementById('exportSrt');
const exportVttBtn = document.getElementById('exportVtt');
const exportJsonBtn = document.getElementById('exportJson');
const exportAssBtn = document.getElementById('exportAss');
const tabBtns = document.querySelectorAll('.tab-btn');

// 语言映射
const langMap = {
    'auto': '自动检测', 'en': '英语', 'ja': '日语', 'ko': '韩语',
    'fr': '法语', 'de': '德语', 'es': '西班牙语', 'ru': '俄语',
    'pt': '葡萄牙语', 'it': '意大利语', 'th': '泰语', 'vi': '越南语', 'zh': '中文'
};

// 文件类型映射
const fileTypes = {
    video: ['.mp4', '.avi', '.mov', '.webm', '.mkv', '.flv'],
    audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
    text: ['.txt', '.srt', '.vtt', '.json']
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadSavedConfig();
});

// 事件监听器
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
    exportVttBtn.addEventListener('click', () => exportFile('vtt'));
    exportJsonBtn.addEventListener('click', () => exportFile('json'));
    exportAssBtn.addEventListener('click', () => exportFile('ass'));
    tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    apiKeyInput.addEventListener('change', saveConfig);
    apiEndpointInput.addEventListener('change', saveConfig);
    sttKeyInput.addEventListener('change', saveConfig);
    sttRegionInput.addEventListener('change', saveConfig);
    sttProviderSelect.addEventListener('change', saveConfig);
}

// 文件选择处理
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
}

// 拖拽处理
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
}

// 添加文件
function addFiles(files) {
    files.forEach(file => {
        const fileInfo = analyzeFile(file);
        if (fileInfo.valid) {
            uploadedFiles.push({
                file: file,
                type: fileInfo.type,
                status: 'pending',
                text: null,
                audioBlob: null
            });
            renderFileList();
        } else {
            alert(`不支持的文件格式：${file.name}\n支持：${[...fileTypes.video, ...fileTypes.audio, ...fileTypes.text].join(', ')}`);
        }
    });
}

// 分析文件类型
function analyzeFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    if (fileTypes.video.some(e => ext === e)) {
        return { valid: true, type: 'video', ext: ext };
    } else if (fileTypes.audio.some(e => ext === e)) {
        return { valid: true, type: 'audio', ext: ext };
    } else if (fileTypes.text.some(e => ext === e)) {
        return { valid: true, type: 'text', ext: ext };
    }
    
    return { valid: false, type: 'unknown', ext: ext };
}

// 渲染文件列表
function renderFileList() {
    fileList.innerHTML = '';
    uploadedFiles.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'file-item';
        
        const icon = getFileIcon(item.type);
        const statusClass = item.status;
        const statusText = getStatusText(item.status);
        
        div.innerHTML = `
            <span class="file-type-icon">${icon}</span>
            <div class="file-info">
                <div class="file-name">${item.file.name}</div>
                <div class="file-size">${formatFileSize(item.file.size)} • ${item.type.toUpperCase()}</div>
            </div>
            <span class="file-status ${statusClass}">${statusText}</span>
            <button class="remove-btn" onclick="removeFile(${index})">删除</button>
        `;
        fileList.appendChild(div);
    });
}

// 获取文件图标
function getFileIcon(type) {
    switch(type) {
        case 'video': return '🎬';
        case 'audio': return '🎵';
        case 'text': return '📄';
        default: return '📁';
    }
}

// 获取状态文本
function getStatusText(status) {
    const texts = {
        'pending': '待处理',
        'processing': '处理中',
        'done': '完成',
        'error': '错误'
    };
    return texts[status] || status;
}

// 删除文件
function removeFile(index) {
    uploadedFiles.splice(index, 1);
    renderFileList();
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// 开始翻译
async function startTranslation() {
    if (uploadedFiles.length === 0) {
        alert('请先上传文件！');
        return;
    }
    
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert('请输入翻译 API Key！');
        return;
    }
    
    // 检查是否有音视频文件需要语音识别
    const hasMediaFiles = uploadedFiles.some(item => item.type === 'video' || item.type === 'audio');
    const sttProvider = sttProviderSelect.value;
    
    if (hasMediaFiles && sttProvider === 'none') {
        const continueAnyway = confirm('检测到音视频文件，但未配置语音识别 API。\n\n点击"确定"仅处理文本文件，或点击"取消"配置语音识别 API。');
        if (!continueAnyway) return;
    }
    
    isTranslating = true;
    abortController = new AbortController();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = '正在处理...';
    statusText.classList.add('processing');
    
    let processedCount = 0;
    let allOriginalText = '';
    let allTranslatedText = '';
    let allSubtitles = [];
    
    try {
        for (let i = 0; i < uploadedFiles.length; i++) {
            if (!isTranslating) break;
            
            const item = uploadedFiles[i];
            item.status = 'processing';
            renderFileList();
            
            updateProgress((i / uploadedFiles.length) * 100);
            statusText.textContent = `正在处理：${item.file.name} (${i + 1}/${uploadedFiles.length})`;
            
            try {
                let text = '';
                
                // 处理不同类型的文件
                if (item.type === 'text') {
                    text = await readTextFile(item.file);
                } else if (item.type === 'audio') {
                    text = await processAudioFile(item.file, sttProvider);
                    item.audioBlob = item.file;
                } else if (item.type === 'video') {
                    const audioBlob = await extractAudioFromVideo(item.file);
                    item.audioBlob = audioBlob;
                    text = await processAudioFile(audioBlob, sttProvider);
                    
                    // 显示音频播放器
                    if (audioBlob) {
                        showAudioPlayer(audioBlob);
                    }
                }
                
                if (text) {
                    item.text = text;
                    item.status = 'done';
                    
                    // 翻译文本
                    statusText.textContent = `正在翻译：${item.file.name}...`;
                    const translated = await translateText(text, apiKey, abortController.signal);
                    
                    allOriginalText += `=== ${item.file.name} ===\n${text}\n\n`;
                    allTranslatedText += `=== ${item.file.name} ===\n${translated}\n\n`;
                    
                    // 生成字幕（带时间轴）
                    const subtitles = await generateSubtitlesWithTiming(item.file, text, translated);
                    allSubtitles.push(...subtitles);
                    
                    translationData = {
                        original: allOriginalText,
                        translated: allTranslatedText,
                        subtitles: allSubtitles,
                        mediaInfo: item
                    };
                    
                    displayResults();
                    processedCount++;
                } else {
                    item.status = 'error';
                }
            } catch (error) {
                console.error(`处理 ${item.file.name} 失败:`, error);
                item.status = 'error';
                statusText.textContent = `❌ ${item.file.name}: ${error.message}`;
            }
            
            renderFileList();
        }
        
        if (isTranslating && processedCount > 0) {
            updateProgress(100);
            statusText.textContent = `✅ 翻译完成！处理了 ${processedCount}/${uploadedFiles.length} 个文件`;
            enableExportButtons();
        } else if (processedCount === 0) {
            statusText.textContent = '❌ 没有文件被成功处理';
        }
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('翻译错误:', error);
            statusText.textContent = `❌ 错误：${error.message}`;
            alert(`翻译失败：${error.message}`);
        } else {
            statusText.textContent = '已停止翻译';
        }
    } finally {
        isTranslating = false;
        abortController = null;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        statusText.classList.remove('processing');
    }
}

// 停止翻译
function stopTranslation() {
    isTranslating = false;
    if (abortController) abortController.abort();
    statusText.textContent = '已停止';
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

// 读取文本文件
function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

// 从视频提取音频
async function extractAudioFromVideo(videoFile) {
    return new Promise((resolve, reject) => {
        statusText.textContent = `正在从 ${videoFile.name} 提取音频...`;
        
        // 使用 Web Audio API 处理
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                // 转换为 WAV blob
                const wavBlob = audioBufferToWav(audioBuffer);
                resolve(wavBlob);
            } catch (error) {
                // 如果解码失败，直接返回原文件（可能是纯音频）
                console.warn('视频音频提取失败，尝试直接使用:', error);
                resolve(videoFile);
            }
        };
        
        reader.onerror = reject;
        reader.readAsArrayBuffer(videoFile);
    });
}

// AudioBuffer 转 WAV
function audioBufferToWav(audioBuffer) {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // 写入 WAV 头
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // 文件长度 - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // 长度 = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this dem)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // 写入交错数据
    for(i = 0; i < audioBuffer.numberOfChannels; i++)
        channels.push(audioBuffer.getChannelData(i));

    while(pos < audioBuffer.length) {
        for(i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
            view.setInt16(44 + offset, sample, true);
            offset += 2;
        }
        pos++;
    }

    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

    return new Blob([buffer], { type: 'audio/wav' });
}

// 处理音频文件（语音识别）
async function processAudioFile(audioBlob, provider) {
    if (provider === 'none') {
        throw new Error('未配置语音识别 API');
    }
    
    statusText.textContent = '正在进行语音识别...';
    
    switch(provider) {
        case 'azure':
            return await speechToTextAzure(audioBlob);
        case 'google':
            return await speechToTextGoogle(audioBlob);
        case 'whisper':
            return await speechToTextWhisper(audioBlob);
        case 'aliyun':
            return await speechToTextAliyun(audioBlob);
        default:
            throw new Error('不支持的语音识别服务商');
    }
}

// Azure 语音识别
async function speechToTextAzure(audioBlob) {
    const key = sttKeyInput.value.trim();
    const region = sttRegionInput.value.trim() || 'eastasia';
    
    if (!key) throw new Error('请配置 Azure API Key');
    
    const endpoint = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=zh-CN`;
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': 'audio/wav'
        },
        body: audioBlob
    });
    
    if (!response.ok) {
        throw new Error(`Azure API 错误：${response.status}`);
    }
    
    const data = await response.json();
    return data.DisplayText || '语音识别失败';
}

// Google 语音识别
async function speechToTextGoogle(audioBlob) {
    const key = sttKeyInput.value.trim();
    
    if (!key) throw new Error('请配置 Google API Key');
    
    // Google Speech-to-Text API
    const endpoint = `https://speech.googleapis.com/v1/speech:recognize?key=${key}`;
    
    const base64Audio = await blobToBase64(audioBlob);
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'zh-CN',
                enableAutomaticPunctuation: true
            },
            audio: { content: base64Audio.split(',')[1] }
        })
    });
    
    if (!response.ok) {
        throw new Error(`Google API 错误：${response.status}`);
    }
    
    const data = await response.json();
    return data.results?.[0]?.alternatives?.[0]?.transcript || '语音识别失败';
}

// Whisper API
async function speechToTextWhisper(audioBlob) {
    const key = sttKeyInput.value.trim();
    
    if (!key) throw new Error('请配置 OpenAI API Key');
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', 'zh');
    formData.append('response_format', 'verbose_json');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}` },
        body: formData
    });
    
    if (!response.ok) {
        throw new Error(`Whisper API 错误：${response.status}`);
    }
    
    const data = await response.json();
    return data.text || '语音识别失败';
}

// 阿里云语音识别
async function speechToTextAliyun(audioBlob) {
    const key = sttKeyInput.value.trim();
    
    if (!key) throw new Error('请配置阿里云 API Key');
    
    // 阿里云智能语音交互 API
    // 这里需要实现阿里云的签名机制，建议使用官方 SDK
    throw new Error('阿里云 API 需要后端支持，请使用其他服务商或部署后端版本');
}

// Blob 转 Base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// 调用 Qwen API 翻译
async function translateText(text, apiKey, signal) {
    const endpoint = apiEndpointInput.value.trim();
    const sourceLang = sourceLangSelect.value;
    const langName = langMap[sourceLang] || '';
    
    const systemPrompt = '你是一个专业的翻译助手，擅长多语言翻译到中文。保持原意，输出准确流畅的中文翻译。只输出翻译结果，不要添加其他说明。';
    const userPrompt = `请将以下${langName ? langName + ' ' : ''}文本翻译成中文：\n\n${text}`;
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'qwen-turbo',
            input: {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            },
            parameters: {
                result_format: 'message'
            }
        }),
        signal: signal
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API 错误 ${response.status}: ${errorData.message || response.statusText}`);
    }
    
    const data = await response.json();
    return data.output?.choices?.[0]?.message?.content || '翻译失败';
}

// 生成带时间轴的字幕
async function generateSubtitlesWithTiming(file, original, translated) {
    // 如果有 Whisper API，可以获取详细的时间轴
    // 这里使用简化版本，按句子分割
    
    const originalSentences = splitIntoSentences(original);
    const translatedSentences = splitIntoSentences(translated);
    
    // 估算每句的时间（假设总时长 / 句子数）
    const totalDuration = file.size / 16000; // 粗略估算
    
    return originalSentences.map((sentence, i) => {
        const startTime = i * (totalDuration / originalSentences.length);
        const endTime = (i + 1) * (totalDuration / originalSentences.length);
        
        return {
            index: i + 1,
            startTime: formatTime(startTime * 1000),
            endTime: formatTime(endTime * 1000),
            original: sentence,
            translated: translatedSentences[i] || ''
        };
    });
}

// 分割句子
function splitIntoSentences(text) {
    return text.split(/[.!?.!?。！？\n]+/).filter(s => s.trim().length > 0);
}

// 显示音频播放器
function showAudioPlayer(audioBlob) {
    const url = URL.createObjectURL(audioBlob);
    audioPlayer.src = url;
    audioPlayerContainer.style.display = 'block';
}

// 显示结果
function displayResults() {
    originalText.value = translationData.original;
    translatedText.value = translationData.translated;
    
    // 生成双语文本
    const bilingual = translationData.subtitles.map(sub => 
        `[${sub.startTime} --> ${sub.endTime}]\n原文：${sub.original}\n译文：${sub.translated}\n`
    ).join('\n');
    bilingualText.value = bilingual;
    
    // 生成 SRT 格式字幕
    subtitlesText.value = generateSRTContent();
    
    switchTab('bilingual');
}

// 格式化时间（毫秒 → SRT 格式）
function formatTime(ms) {
    const hours = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const minutes = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const seconds = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    const milliseconds = String(Math.floor(ms % 1000)).padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
}

// 切换标签
function switchTab(tabName) {
    tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
    document.querySelectorAll('.result-content textarea').forEach(textarea => {
        textarea.classList.toggle('active', textarea.id === `${tabName}Text`);
    });
}

// 更新进度条
function updateProgress(percent) {
    progressBar.style.width = `${percent}%`;
}

// 启用导出按钮
function enableExportButtons() {
    exportTxtBtn.disabled = false;
    exportSrtBtn.disabled = false;
    exportVttBtn.disabled = false;
    exportJsonBtn.disabled = false;
    exportAssBtn.disabled = false;
}

// 导出文件
function exportFile(type) {
    let content, filename, mimeType;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    switch(type) {
        case 'txt':
            content = bilingualText.value;
            filename = `双语翻译_${timestamp}.txt`;
            mimeType = 'text/plain;charset=utf-8';
            break;
        case 'srt':
            content = generateSRTContent();
            filename = `字幕_${timestamp}.srt`;
            mimeType = 'text/plain;charset=utf-8';
            break;
        case 'vtt':
            content = generateVTTContent();
            filename = `字幕_${timestamp}.vtt`;
            mimeType = 'text/vtt;charset=utf-8';
            break;
        case 'json':
            content = JSON.stringify(translationData, null, 2);
            filename = `翻译数据_${timestamp}.json`;
            mimeType = 'application/json;charset=utf-8';
            break;
        case 'ass':
            content = generateASSContent();
            filename = `字幕_${timestamp}.ass`;
            mimeType = 'text/plain;charset=utf-8';
            break;
    }
    
    downloadFile(content, filename, mimeType);
}

// 生成 SRT 内容
function generateSRTContent() {
    if (translationData.subtitles.length === 0) return '';
    
    return translationData.subtitles.map(sub =>
        `${sub.index}\n${sub.startTime} --> ${sub.endTime}\n${sub.translated}\n`
    ).join('\n');
}

// 生成 VTT 内容
function generateVTTContent() {
    if (translationData.subtitles.length === 0) return '';
    
    let vtt = 'WEBVTT\n\n';
    vtt += translationData.subtitles.map(sub => {
        const startVTT = sub.startTime.replace(',', '.');
        const endVTT = sub.endTime.replace(',', '.');
        return `${startVTT} --> ${endVTT}\n${sub.translated}\n`;
    }).join('\n');
    
    return vtt;
}

// 生成 ASS 内容
function generateASSContent() {
    if (translationData.subtitles.length === 0) return '';
    
    let ass = `[Script Info]
Title: AI 翻译字幕
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,20,20,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
    
    translationData.subtitles.forEach(sub => {
        const startASS = sub.startTime.replace(',', '.');
        const endASS = sub.endTime.replace(',', '.');
        ass += `Dialogue: 0,${startASS},${endASS},Default,,0,0,0,,${sub.translated}\n`;
    });
    
    return ass;
}

// 下载文件
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 保存配置
function saveConfig() {
    localStorage.setItem('translation_apiKey', apiKeyInput.value);
    localStorage.setItem('translation_apiEndpoint', apiEndpointInput.value);
    localStorage.setItem('translation_sourceLang', sourceLangSelect.value);
    localStorage.setItem('translation_sttProvider', sttProviderSelect.value);
    localStorage.setItem('translation_sttKey', sttKeyInput.value);
    localStorage.setItem('translation_sttRegion', sttRegionInput.value);
}

// 加载配置
function loadSavedConfig() {
    const configs = {
        'translation_apiKey': apiKeyInput,
        'translation_apiEndpoint': apiEndpointInput,
        'translation_sourceLang': sourceLangSelect,
        'translation_sttProvider': sttProviderSelect,
        'translation_sttKey': sttKeyInput,
        'translation_sttRegion': sttRegionInput
    };
    
    Object.entries(configs).forEach(([key, element]) => {
        const saved = localStorage.getItem(key);
        if (saved) element.value = saved;
    });
}

// 全局函数
window.removeFile = removeFile;
