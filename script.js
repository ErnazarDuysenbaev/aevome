// script.js

let supabaseClient = null;
let currentStep = 1;
const totalSteps = 6;
const selectedExtraTags = new Set();
let countdownInterval = null;
let currentAnalyticsSessionId = null;

// Инициализация клиента Supabase через Netlify Function
async function initSupabase() {
    try {
        const response = await fetch('/.netlify/functions/supabase-config');
        if (!response.ok) throw new Error('Не удалось получить конфигурацию Supabase');
        const config = await response.json();

        supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
            auth: {
                persistSession: false
            }
        });
        return true;
    } catch (err) {
        console.warn("Ошибка при подключении к базе данных:", err);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    setupLanguageCheckboxListeners();
    updateStepUI();
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    const dbReady = await initSupabase();
    if (dbReady) {
        currentAnalyticsSessionId = getOrCreateSessionId();
        sendAnalyticsOnLoad(currentAnalyticsSessionId);
    }
});

function getOrCreateSessionId() {
    const storageKey = 'aevome_analytics_session_id';
    let sessId = null;
    try {
        sessId = localStorage.getItem(storageKey);
    } catch (e) {}
    if (!sessId) {
        sessId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        try {
            localStorage.setItem(storageKey, sessId);
        } catch (e) {}
    }
    return sessId;
}

async function sendAnalyticsOnLoad(sessionId) {
    if (!supabaseClient || !sessionId) return;
    try {
        const { data } = await supabaseClient
            .from('site_visitors')
            .select('session_id')
            .eq('session_id', sessionId);

        if (!data || data.length === 0) {
            const deviceInfo = navigator.userAgent || "Unknown Browser";
            await supabaseClient
                .from('site_visitors')
                .insert({
                    session_id: sessionId,
                    device_info: deviceInfo
                });
        }
    } catch (e) {
        console.warn("Ошибка записи сессии визита:", e);
    }
}

async function activateAnalyticsSession(sessionId) {
    if (!supabaseClient || !sessionId) return;
    try {
        const { data } = await supabaseClient
            .from('site_activations')
            .select('session_id')
            .eq('session_id', sessionId);

        if (!data || data.length === 0) {
            const deviceInfo = navigator.userAgent || "Unknown Browser";
            await supabaseClient
                .from('site_activations')
                .insert({
                    session_id: sessionId,
                    device_info: deviceInfo
                });
        }
    } catch (e) {
        console.warn("Ошибка обновления статуса аналитики:", e);
    }
}

function setupLanguageCheckboxListeners() {
    const checkboxes = ['IELTS', 'TOEFL', 'HSK', 'SAT', 'Other', 'Planning'];

    checkboxes.forEach(test => {
        const checkbox = document.getElementById(`lang-${test}`);
        if (!checkbox) return;

        checkbox.addEventListener('change', () => {
            if (test === 'Planning') {
                if (checkbox.checked) {
                    checkboxes.forEach(t => {
                        if (t !== 'Planning') {
                            const otherCheckbox = document.getElementById(`lang-${t}`);
                            const otherBox = document.getElementById(`score-box-${t}`);
                            if (otherCheckbox) otherCheckbox.checked = false;
                            if (otherBox) otherBox.classList.add('hidden');
                            const scoreInput = document.getElementById(`score-${t}`);
                            if (scoreInput) scoreInput.value = '';
                        }
                    });
                }
            } else {
                if (checkbox.checked) {
                    const planningCheckbox = document.getElementById('lang-Planning');
                    if (planningCheckbox) planningCheckbox.checked = false;
                }

                const scoreBox = document.getElementById(`score-box-${test}`);
                if (scoreBox) {
                    if (checkbox.checked) {
                        scoreBox.classList.remove('hidden');
                        scoreBox.classList.add('animate-fade-in-up');
                    } else {
                        scoreBox.classList.add('hidden');
                        scoreBox.classList.remove('animate-fade-in-up');
                        const scoreInput = document.getElementById(`score-${test}`);
                        if (scoreInput) scoreInput.value = '';
                    }
                }
            }
        });
    });
}

function updateStepUI() {
    document.querySelectorAll('.step-container').forEach(el => el.classList.add('hidden'));

    const activeContainer = document.getElementById(`form-step-${currentStep}`);
    if (activeContainer) {
        activeContainer.classList.remove('hidden');
        activeContainer.classList.add('animate-fade-in-up');
    }

    const percent = (currentStep / totalSteps) * 100;
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) progressBar.style.width = `${percent}%`;

    const stepNum = document.getElementById('progress-step-num');
    if (stepNum) stepNum.innerText = currentStep;

    const titles = {
        1: "Текущий статус",
        2: "Успеваемость (GPA)",
        3: "Языковой тест",
        4: "Внеучебная деятельность",
        5: "Страна и гранты",
        6: "Дополнительно"
    };
    const stepTitle = document.getElementById('progress-step-title');
    if (stepTitle) stepTitle.innerText = titles[currentStep];

    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');

    if (prevBtn) {
        if (currentStep === 1) {
            prevBtn.classList.add('opacity-0', 'pointer-events-none');
        } else {
            prevBtn.classList.remove('opacity-0', 'pointer-events-none');
        }
    }

    if (nextBtn && submitBtn) {
        if (currentStep === totalSteps) {
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        }
    }
}

function validateStep(step) {
    if (step === 2) {
        const gpaInput = document.getElementById('gpa');
        if (!gpaInput) return true;
        let gpaVal = parseFloat(gpaInput.value);
        const gpaError = document.getElementById('gpa-error');

        if (isNaN(gpaVal) || gpaVal < 1.0 || gpaVal > 5.0) {
            if (gpaError) gpaError.classList.remove('hidden');
            gpaInput.classList.add('border-red-500', 'focus:ring-red-500');
            return false;
        } else {
            if (gpaError) gpaError.classList.add('hidden');
            gpaInput.classList.remove('border-red-500', 'focus:ring-red-500');
            gpaInput.value = gpaVal.toFixed(1);
        }
    }
    return true;
}

function nextStep() {
    if (!validateStep(currentStep)) return;
    if (currentStep < totalSteps) {
        currentStep++;
        updateStepUI();
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepUI();
    }
}

function toggleExtraTag(tag) {
    const btn = document.getElementById(`tag-${tag}`);
    if (!btn) return;
    if (selectedExtraTags.has(tag)) {
        selectedExtraTags.delete(tag);
        btn.classList.remove('border-brand-500', 'bg-brand-50/50', 'text-brand-600');
    } else {
        selectedExtraTags.add(tag);
        btn.classList.add('border-brand-500', 'bg-brand-50/50', 'text-brand-600');
    }
}

function toggleFaq(id) {
    const content = document.getElementById(`faq-content-${id}`);
    const icon = document.getElementById(`faq-icon-${id}`);

    if (!content || !icon) return;

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.classList.add('rotate-180');
    } else {
        content.classList.add('hidden');
        icon.classList.remove('rotate-180');
    }
}

function parseInlineMarkdown(text) {
    let parsed = text
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-brand-600 hover:underline font-medium">$1</a>');
    return parsed;
}

function convertMarkdownToHtml(markdown) {
    let cleaned = markdown.trim();
    cleaned = cleaned.replace(/^```markdown\s*/i, '');
    cleaned = cleaned.replace(/^```html\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/, '');
    cleaned = cleaned.replace(/```\s*$/, '');
    cleaned = cleaned.trim();

    cleaned = cleaned.replace(/<br\s*\/?>/gi, ' ');

    let htmlEscaped = cleaned
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    let lines = htmlEscaped.split('\n');
    let output = [];
    let inList = false;
    let inOrderedList = false;
    let inTable = false;
    let tableHeaderProcessed = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        if (line.startsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableHeaderProcessed = false;
                output.push('<div class="overflow-x-auto my-6 border border-slate-100 rounded-2xl shadow-sm"><table class="min-w-full divide-y divide-slate-150 text-sm text-left text-slate-600">');
            }

            if (line.match(/^\|[\s\-\|:]+\|?$/)) {
                continue;
            }

            let cells = line.split('|').map(c => c.trim());

            if (cells[0] === '') {
                cells.shift();
            }
            if (cells[cells.length - 1] === '') {
                cells.pop();
            }

            if (!tableHeaderProcessed) {
                output.push('<thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-700"><tr>');
                cells.forEach(cell => {
                    output.push(`<th class="px-4 py-3 font-semibold">${parseInlineMarkdown(cell)}</th>`);
                });
                output.push('</tr></thead><tbody class="divide-y divide-slate-100 bg-white">');
                tableHeaderProcessed = true;
            } else {
                output.push('<tr class="hover:bg-slate-50/50 transition-colors">');
                cells.forEach(cell => {
                    output.push(`<td class="px-4 py-3">${parseInlineMarkdown(cell)}</td>`);
                });
                output.push('</tr>');
            }
            continue;
        } else if (inTable) {
            inTable = false;
            output.push('</tbody></table></div>');
        }

        if (line.startsWith('###### ')) {
            closeOpenLists(output, inList, inOrderedList);
            inList = false; inOrderedList = false;
            output.push(`<h6 class="text-xs font-bold uppercase tracking-wider text-slate-500 mt-5 mb-2 font-display">${parseInlineMarkdown(line.substring(7))}</h6>`);
            continue;
        }
        if (line.startsWith('##### ')) {
            closeOpenLists(output, inList, inOrderedList);
            inList = false; inOrderedList = false;
            output.push(`<h5 class="text-sm font-bold uppercase tracking-wider text-slate-700 mt-5 mb-2 font-display">${parseInlineMarkdown(line.substring(6))}</h5>`);
            continue;
        }
        if (line.startsWith('#### ')) {
            closeOpenLists(output, inList, inOrderedList);
            inList = false; inOrderedList = false;
            output.push(`<h4 class="text-sm font-bold text-slate-900 mt-5 mb-2 font-display">${parseInlineMarkdown(line.substring(5))}</h4>`);
            continue;
        }
        if (line.startsWith('### ')) {
            closeOpenLists(output, inList, inOrderedList);
            inList = false; inOrderedList = false;
            output.push(`<h3 class="text-base font-bold text-slate-900 mt-6 mb-3 font-display">${parseInlineMarkdown(line.substring(4))}</h3>`);
            continue;
        }
        if (line.startsWith('## ')) {
            closeOpenLists(output, inList, inOrderedList);
            inList = false; inOrderedList = false;
            output.push(`<h2 class="text-lg font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-2 font-display">${parseInlineMarkdown(line.substring(3))}</h2>`);
            continue;
        }
        if (line.startsWith('# ')) {
            closeOpenLists(output, inList, inOrderedList);
            inList = false; inOrderedList = false;
            output.push(`<h2 class="text-xl font-bold text-slate-900 mt-8 mb-4 font-display">${parseInlineMarkdown(line.substring(2))}</h2>`);
            continue;
        }

        let numMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
            closeOpenLists(output, inList, inOrderedList);
            inList = false; inOrderedList = false;
            output.push(`<div class="my-3 text-slate-600 leading-relaxed"><span class="font-bold text-slate-900">${numMatch[1]}. </span>${parseInlineMarkdown(numMatch[2])}</div>`);
            continue;
        }

        let bulletMatch = line.match(/^[\-\*\+]\s+(.*)$/);
        if (bulletMatch) {
            if (inOrderedList) {
                output.push('</ol>');
                inOrderedList = false;
            }
            if (!inList) {
                inList = true;
                output.push('<ul class="list-disc pl-5 my-4 space-y-2 text-slate-600">');
            }
            output.push(`<li class="list-item-bullet">${parseInlineMarkdown(bulletMatch[1])}</li>`);
            continue;
        }

        if (line === '') {
            closeOpenLists(output, inList, inOrderedList);
            inList = false; inOrderedList = false;
            continue;
        }

        closeOpenLists(output, inList, inOrderedList);
        inList = false; inOrderedList = false;
        output.push(`<p class="my-3 text-slate-600 leading-relaxed">${parseInlineMarkdown(line)}</p>`);
    }

    if (inTable) output.push('</tbody></table></div>');
    closeOpenLists(output, inList, inOrderedList);

    return output.join('\n');
}

function closeOpenLists(output, inList, inOrderedList) {
    if (inList) output.push('</ul>');
    if (inOrderedList) output.push('</ol>');
}

function generateSessionToken() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'web_';
    for (let i = 0; i < 8; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function startCountdownTimer(secondsLeft) {
    if (countdownInterval) clearInterval(countdownInterval);

    const clockSpan = document.getElementById('countdown-clock');

    countdownInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
            clearInterval(countdownInterval);
            if (clockSpan) clockSpan.innerText = "00:00";
            document.getElementById('telegram-cta-container').classList.add('opacity-50', 'pointer-events-none');
            alert("Срок действия сессии на сайте изменился. Пожалуйста, пройдите сканирование заново.");
            return;
        }

        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;

        if (clockSpan) clockSpan.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, 1000);
}

function showAiWarning(message) {
    const warningMsg = document.getElementById('ai-warning-msg');
    const warningText = document.getElementById('ai-warning-text');
    if (warningMsg) {
        if (warningText) {
            warningText.innerText = message;
        }
        warningMsg.classList.remove('hidden');
    }
}

function hideAiWarning() {
    const warningMsg = document.getElementById('ai-warning-msg');
    if (warningMsg) {
        warningMsg.classList.add('hidden');
    }
}

async function submitScanner(event) {
    if (event) {
        event.preventDefault();
    }

    hideAiWarning();

    const classInput = document.querySelector('input[name="class_status"]:checked');
    const classStatus = classInput ? classInput.value : 'Не указан';
    const gpa = document.getElementById('gpa').value;
    const goals = document.getElementById('goals').value || 'Не указаны';
    const customExtra = document.getElementById('custom_extracurriculars').value;
    const userLocation = document.getElementById('user_location').value || 'Не указан';
    const aboutSelf = document.getElementById('about_self').value || 'Не указана';

    const selectedLanguages = [];
    const languageKeys = ['IELTS', 'TOEFL', 'HSK', 'SAT', 'Other'];
    languageKeys.forEach(test => {
        const checkbox = document.getElementById(`lang-${test}`);
        if (checkbox && checkbox.checked) {
            const scoreInput = document.getElementById(`score-${test}`);
            const scoreVal = scoreInput ? scoreInput.value : 'Не указан';
            selectedLanguages.push(`${test} (балл: ${scoreVal})`);
        }
    });
    if (document.getElementById('lang-Planning')?.checked) {
        selectedLanguages.push("Только планирует сдавать экзамены");
    }
    const languagesString = selectedLanguages.length > 0 ? selectedLanguages.join(", ") : "Не указаны";

    const tagNames = {
        it: "IT/Программирование",
        sport: "Спорт",
        volunteer: "Волонтерство",
        art: "Искусство",
        science: "Наука",
        olympiad: "Олимпиады"
    };
    const activeTags = [];
    selectedExtraTags.forEach(tag => {
        if (tagNames[tag]) activeTags.push(tagNames[tag]);
    });
    const extraString = [
        activeTags.length > 0 ? "Направления: " + activeTags.join(", ") : "",
        customExtra ? "Детали: " + customExtra : ""
    ].filter(Boolean).join(". ") || "Не указаны";

    const loader = document.getElementById('scanner-loader');
    if (loader) loader.classList.remove('hidden');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error("Timeout")), 60000);

    try {
        const systemPrompt1 = `Ты — Aevome AI, продвинутый ИИ-навигатор по международному образованию и грантам. Твоя цель — проанализировать профиль студента и выдать честный, глубокий, экспертный и мотивирующий фидбек.

        ВНИМАНИЕ! СТРОГИЕ ПРАВИЛА И ОГРАНИЧЕНИЯ ДЛЯ СКОРОСТИ ГЕНЕРАЦИИ И ЛОГИКИ (БЕЗ ФАНТАЗИЙ И ЛОГИЧЕСКИХ ОШИБОК):
        1. Текущая дата: июль 2026 года. Все учебные RoadMap, графики поступления, дедлайны и таймлайны рассчитывай строго исходя из того, что сейчас июль 2026 года (не 2024 и не любой другой год).
        2. СТРОГО запрещено придумывать, преувеличивать или дописывать факты, которых нет в исходном профиле абитуриента. Анализируй только то, что указал пользователь.
        3. НЕ предполагай автоматически, что пользователь является гражданином или резидентом России или др стран, если он этого прямо не указал.
        4. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать HTML-теги (такие как <br>, <div>, <span>) внутри Markdown-отчета и таблиц.
        5. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО упоминать сторонние ИИ-модели (такие как Gemini, ChatGPT, Claude, OpenAI). Любые упоминания ИИ должны строго именоваться как "Aevome AI".
        6. СТРОГАЯ МАТЕМАТИЧЕСКАЯ И КОНТЕКСТНАЯ ЛОГИКА ОЦЕНКИ ТЕСТОВЫХ ПОКАЗАТЕЛЕЙ:
           - Всегда сравнивай фактический балл пользователя с проходными требованиями по правилам строгой математики. Категорически запрещено писать, что балла (например, SAT 1590) недостаточно, потому что требуются баллы 1550+. Если балл пользователя равен или выше требуемого ориентира, пиши, что этот показатель идеален, полностью превосходит стандартные требования и делает профиль максимально конкурентоспособным.
           - Оценивай шкалу тестов адекватно: SAT 1590 — это 99-й+ процентиль (практически безупречный балл), который открывает двери в Лигу Плюща и топ-вузы США.
           - Различай ступени обучения (Undergraduate vs Graduate): SAT — это тест исключительно для бакалавриата. Категорически запрещено при оценке SAT упоминать гранты магистратуры и аспирантуры, которые не имеют никакого отношения к бакалавриату (такие как Fulbright, Chevening, DAAD). Для бакалавриата упоминай Merit-based стипендии самих американских вузов (например, Need-blind/Need-based full financial aid в Harvard/MIT/Yale или полные Merit-гранты в других престижных вузах).
        7. УВАЖЕНИЕ К ЦЕЛЯМ И ВЫБРАННЫМ СТРАНАМ ПОЛЬЗОВАТЕЛЯ (СТРОГАЯ ГЕО-ЛОГИКА):
           - Категорически запрещено отвергать или критиковать выбранные пользователем цели/страны как «нереалистичные» или «невыгодные». Если пользователь указал конкретную страну поступления (например, Узбекистан), твоя подборка вузов, разбор грантов и дорожная карта должны быть ориентированы в первую очередь на поступление в ведущие вузы именно этой страны (например, для Узбекистана — Университет Новый Узбекистан (New Uzbekistan University), Вестминстерский университет (WIUT), Университет Инха в Ташкенте (IUT), Туринский политехнический университет (TTPU) и др.).
           - Опиши траекторию поступления, экзамены, внутренние гранты и особенности выбранной страны.
           - И только в самом конце отчета, в качестве мягкой дополнительной рекомендации, аккуратно добавь: "Поскольку ваш академический профиль (SAT 1590, GPA 4.9) является выдающимся на мировом уровне, мы также рекомендуем рассмотреть параллельную подачу в ведущие мировые вузы (США, Лига Плюща, престижные вузы Европы и Азии)..." в качестве альтернативного пути, если профиль позволяет.`;

        const userPrompt1 = `Профиль абитуриента:
        - Академический статус: ${classStatus}
        - GPA (успеваемость): ${gpa}/5.0
        - Языковые тесты и баллы: ${languagesString}
        - Внеучебная деятельность: ${extraString}
        - Пожелания по странам и грантам: ${goals}
        - География проживания (город, страна): ${userLocation}
        - Дополнительная информация о себе от пользователя: ${aboutSelf}`;

        // Запрос через безопасную прокси-функцию Netlify
        const response1 = await fetch(`/.netlify/functions/proxy-mistral`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "mistral-small-2603",
                messages: [
                    { role: "system", content: systemPrompt1 },
                    { role: "user", content: userPrompt1 }
                ],
                temperature: 0.9,
                stream: true
            })
        });

        clearTimeout(timeoutId);

        if (!response1.ok) {
            throw new Error(`Ошибка ответа API. Статус: ${response1.status}`);
        }

        if (loader) loader.classList.add('hidden');
        const resultsSection = document.getElementById('results-section');
        const outputElement = document.getElementById('markdown-report-output');

        if (outputElement) {
            outputElement.innerHTML = "";
        }

        if (resultsSection) {
            resultsSection.classList.remove('hidden');
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        const reader = response1.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let aiReportMarkdown = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop();

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                if (line === "data: [DONE]") continue;
                if (line.startsWith("data: ")) {
                    try {
                        const parsed = JSON.parse(line.substring(6));
                        const content = parsed.choices?.[0]?.delta?.content || "";
                        if (content) {
                            aiReportMarkdown += content;
                            outputElement.innerHTML = convertMarkdownToHtml(aiReportMarkdown);
                        }
                    } catch (e) {
                    }
                }
            }
        }

        if (buffer && buffer.startsWith("data: ")) {
            try {
                const parsed = JSON.parse(buffer.substring(6));
                const content = parsed.choices?.[0]?.delta?.content || "";
                if (content) {
                    aiReportMarkdown += content;
                    outputElement.innerHTML = convertMarkdownToHtml(aiReportMarkdown);
                }
            } catch (e) {}
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        activateAnalyticsSession(currentAnalyticsSessionId);

        executeBackgroundDossierCompilation(classStatus, gpa, languagesString, extraString, goals, userLocation, aboutSelf, aiReportMarkdown);

    } catch (err) {
        clearTimeout(timeoutId);
        if (loader) loader.classList.add('hidden');
        console.error(err);

        if (err.name === 'AbortError' || err.message === 'Timeout') {
            showAiWarning("⏳ Ответ ИИ-сервера занял слишком много времени (превышен таймаут). Пожалуйста, попробуйте отправить анкету еще раз.");
        } else {
            showAiWarning("⏳ Система Aevome AI сейчас сильно загружена запросами или соединение заблокировано. Пожалуйста, подождите пару секунд и повторите.");
        }
    }
}

async function executeBackgroundDossierCompilation(classStatus, gpa, languagesString, extraString, goals, userLocation, aboutSelf, firstReportText) {
    if (!supabaseClient) {
        console.warn("Пропуск фонового сохранения в Supabase: клиент не инициализирован.");
        return;
    }

    const systemPrompt2 = `Ты — системный аналитик ИИ-платформы Aevome. Твоя задача — проанализировать все данные анкеты, которые заполнил пользователь, и созданный для него отчет. Сформируй единый, плотный, текстовый паспорт ('Досье абитуриента') для базы данных.

    ВНИМАНИЕ! КАТЕГОРИЧЕСКИЕ ТРЕБОВАНИЯ К ФАКТОЛОГИЧЕСКОЙ ТОЧНОСТИ (ZERO HALLUCINATION):
    1. Опирайся СТРОГО на исходные данные пользователя (User Input). Тебе категорически запрещено додумывать, экстраполировать или искусственно преувеличивать сильные стороны, цели и бэкграунд пользователя.
    2. Разделяй исходные данные пользователя и рекомендации системы! Если в дорожной карте (Roadmap) ИИ порекомендовал топовые вузы (например, топ-50), это НЕ означает, что пользователь сам заявлял цель поступить в топ-50. Не приписывай пользователю цели, требования или достижения, которых он сам изначально не заявлял.
    3. Если пользователь написал 'США, STEM', пиши ровно 'Желаемое направление: США, STEM'. Тебе запрещено заменять это на 'США топ-50', 'Ivy League', 'MIT' или любые другие домыслы.
    4. Будь предельно сух, прагматичен и нейтрален. Пиши паспорт без пафосных эпитетов, без рекламного или мотивирующего тона. Никаких субъективных оценок вроде 'амбициозный абитуриент', 'выдающийся GPA', 'высокие шансы' — только сухие факты и честные риски.
    5. Текущая дата: июль 2026 года. Рассчитывай таймлайны, дедлайны и календарные отметки только на основе этого года.
    6. НЕ предполагай автоматически, что пользователь из России, если он этого не указал. Используй только реальную географию проживания из профиля.
    7. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО упоминать сторонние ИИ-модели (такие как Gemini, ChatGPT, Claude, OpenAI). Любые упоминания ИИ должны строго именоваться как "Aevome AI".
    8. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать HTML-теги (такие как <br>, <div>, <span>). Выдавай чистый текстовый паспорт.

    Ты ОБЯЗАН включить в паспорт:
    - Базовые показатели (строго по анкете): Город/страна проживания, класс, GPA, все языковые тесты с баллами, а также блок дополнительной информации о себе.
    - Детальный список сильных сторон (только реальные факты из анкеты, без преувеличений).
    - СЛАБЫЕ СТОРОНЫ: реальные пробелы в портфолио, дедлайны и потенциальные риски при поступлении.

    Пиши строго по существу, плотно, без воды, вводных фраз и вступлений. Этот текст предназначен исключительно для дальнейшего чтения другими модели ИИ внутри Telegram-бота.`;

    const userPrompt2 = `Исходные данные пользователя:
    - Географическое положение (город, страна): ${userLocation}
    - Класс: ${classStatus}
    - GPA: ${gpa}/5.0
    - Языки: ${languagesString}
    - Активности: ${extraString}
    - Цели: ${goals}
    - О себе: ${aboutSelf}

    Созданный ранее roadmap:
    ${firstReportText}`;

    let studentDossier = "";
    let response2;
    let data2;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            response2 = await fetch(`/.netlify/functions/proxy-mistral`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "mistral-small-2603",
                    messages: [
                        { role: "system", content: systemPrompt2 },
                        { role: "user", content: userPrompt2 }
                    ],
                    temperature: 0.3,
                    stream: false
                })
            });

            if (response2.ok) {
                data2 = await response2.json();
                studentDossier = data2.choices?.[0]?.message?.content;
                if (studentDossier) {
                    break;
                }
            } else {
                console.warn(`Фоновая компиляция досье (попытка ${attempt}/${maxRetries}): статус ${response2.status}`);
            }
        } catch (fetchErr) {
            console.warn(`Сеть недоступна при фоновой компиляции (попытка ${attempt}/${maxRetries}):`, fetchErr);
        }

        if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    if (!studentDossier) {
        console.warn("Фоновое досье не сформировалось. Применяется резервный сценарий.");
        studentDossier = `Досье сгенерировано в резервном режиме из-за нестабильного сетевого подключения на клиенте.\n\nОсновной Roadmap:\n${firstReportText}`;
    }

    try {
        const sessionToken = generateSessionToken();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        const { error } = await supabaseClient
            .from('web_sessions')
            .insert([
                {
                    id: sessionToken,
                    user_profile_text: studentDossier,
                    ai_report: firstReportText,
                    expires_at: expiresAt
                }
            ]);

        if (error) {
            console.error("Ошибка сохранения сессии в Supabase:", error);
            return;
        }

        const tgLink = document.getElementById('telegram-bot-link');
        if (tgLink) tgLink.href = `https://t.me/aevome_bot?start=${sessionToken}`;

        const ctaContainer = document.getElementById('telegram-cta-container');
        if (ctaContainer) {
            ctaContainer.classList.remove('hidden');
            ctaContainer.classList.add('animate-fade-in-up');
        }

        startCountdownTimer(600);

    } catch (dbErr) {
        console.error("Критическая ошибка сохранения параметров сессии:", dbErr);
    }
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;

    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        menu.classList.add('animate-fade-in-up');
    } else {
        menu.classList.add('hidden');
        menu.classList.remove('animate-fade-in-up');
    }
}