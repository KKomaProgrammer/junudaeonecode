(() => {
  "use strict";

  const languagePicker = document.getElementById("languagePicker");
  const languageTrigger = document.getElementById("languageTrigger");
  const languageTriggerText = document.getElementById("languageTriggerText");
  const recognizedBadge = document.getElementById("recognizedBadge");
  const languageMenu = document.getElementById("languageMenu");
  const languageSearch = document.getElementById("languageSearch");
  const languageOptions = document.getElementById("languageOptions");
  const copyBtn = document.getElementById("copyBtn");
  const messageShareBtn = document.getElementById("messageShareBtn");
  const shareBtn = document.getElementById("shareBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const shareTag = document.getElementById("shareTag");
  const codeStats = document.getElementById("codeStats");
  const draftState = document.getElementById("draftState");
  const accessState = document.getElementById("accessState");
  const shareDialog = document.getElementById("shareDialog");
  const shareVisibility = document.getElementById("shareVisibility");
  const shareResult = document.getElementById("shareResult");
  const shareUrl = document.getElementById("shareUrl");
  const shareError = document.getElementById("shareError");
  const createShareBtn = document.getElementById("createShareBtn");
  const copyShareUrlBtn = document.getElementById("copyShareUrlBtn");
  const messageGuideDialog = document.getElementById("messageGuideDialog");
  const messageShareDialog = document.getElementById("messageShareDialog");
  const guideConfirmBtn = document.getElementById("guideConfirmBtn");
  const guideShareBtn = document.getElementById("guideShareBtn");
  const messageInfoBtn = document.getElementById("messageInfoBtn");
  const messageCloseBtn = document.getElementById("messageCloseBtn");
  const messageDownloadBtn = document.getElementById("messageDownloadBtn");
  const deviceShareBtn = document.getElementById("deviceShareBtn");
  const messageFileName = document.getElementById("messageFileName");
  const toast = document.getElementById("toast");

  const DRAFT_PREFIX = "junudaeonecode:draft:";
  const MESSAGE_GUIDE_KEY = "junudaeonecode:message-guide-seen";

  const LANGUAGES = [
    { value: "auto", label: "자동 인식", keywords: "auto 자동 감지 인식" },
    { value: "plaintext", label: "Plain Text", keywords: "text txt 텍스트 일반" },
    { value: "javascript", label: "JavaScript", keywords: "js 자바스크립트" },
    { value: "typescript", label: "TypeScript", keywords: "ts 타입스크립트" },
    { value: "json", label: "JSON", keywords: "json 제이슨" },
    { value: "html", label: "HTML", keywords: "html 웹 마크업" },
    { value: "xml", label: "XML", keywords: "xml" },
    { value: "css", label: "CSS", keywords: "css 스타일" },
    { value: "python", label: "Python", keywords: "py 파이썬" },
    { value: "java", label: "Java", keywords: "자바" },
    { value: "c", label: "C", keywords: "c언어" },
    { value: "cpp", label: "C++", keywords: "cpp cplusplus 씨플플" },
    { value: "csharp", label: "C#", keywords: "csharp cs 씨샵" },
    { value: "kotlin", label: "Kotlin", keywords: "코틀린" },
    { value: "swift", label: "Swift", keywords: "스위프트" },
    { value: "php", label: "PHP", keywords: "php" },
    { value: "ruby", label: "Ruby", keywords: "rb 루비" },
    { value: "go", label: "Go", keywords: "golang 고랭" },
    { value: "rust", label: "Rust", keywords: "러스트" },
    { value: "shell", label: "Shell", keywords: "bash sh zsh 쉘 배시" },
    { value: "sql", label: "SQL", keywords: "sql 데이터베이스" },
    { value: "markdown", label: "Markdown", keywords: "md 마크다운" },
    { value: "yaml", label: "YAML", keywords: "yaml yml 야믈" }
  ];

  const LABEL_BY_VALUE = Object.fromEntries(LANGUAGES.map((item) => [item.value, item.label]));

  const MODE_CONFIG = {
    plaintext: { mode: null },
    javascript: { mode: "javascript" },
    typescript: { mode: { name: "javascript", typescript: true } },
    json: { mode: { name: "javascript", json: true } },
    html: { mode: "htmlmixed" },
    xml: { mode: "xml" },
    css: { mode: "css" },
    python: { mode: "python", load: "python" },
    java: { mode: "text/x-java" },
    c: { mode: "text/x-csrc" },
    cpp: { mode: "text/x-c++src" },
    csharp: { mode: "text/x-csharp" },
    kotlin: { mode: "text/x-kotlin" },
    swift: { mode: "swift", load: "swift" },
    php: { mode: "application/x-httpd-php", load: "php" },
    ruby: { mode: "ruby", load: "ruby" },
    go: { mode: "go", load: "go" },
    rust: { mode: "rust", load: "rust" },
    shell: { mode: "shell", load: "shell" },
    sql: { mode: "text/x-sql", load: "sql" },
    markdown: { mode: "markdown", load: "markdown" },
    yaml: { mode: "yaml", load: "yaml" }
  };

  const HLJS_MAP = {
    javascript: "javascript", js: "javascript", typescript: "typescript", ts: "typescript",
    json: "json", xml: "html", html: "html", css: "css", python: "python", py: "python",
    java: "java", c: "c", cpp: "cpp", "c++": "cpp", csharp: "csharp", cs: "csharp",
    kotlin: "kotlin", swift: "swift", php: "php", ruby: "ruby", rb: "ruby", go: "go",
    rust: "rust", bash: "shell", shell: "shell", sh: "shell", sql: "sql",
    markdown: "markdown", md: "markdown", yaml: "yaml", yml: "yaml"
  };

  CodeMirror.modeURL = "https://cdn.jsdelivr.net/npm/codemirror@5.65.21/mode/%N/%N.js";

  const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    lineWrapping: false,
    tabSize: 2,
    indentUnit: 2,
    indentWithTabs: false,
    mode: null,
    placeholder: "코드를 붙여넣거나 입력하세요..."
  });

  const state = {
    languageChoice: "auto",
    detectedLanguage: "plaintext",
    languageSource: "detected",
    passwordRequired: false,
    authenticated: true,
    shareId: null,
    loading: false,
    detectionTimer: null,
    draftTimer: null,
    draftStatusTimer: null,
    toastTimer: null,
    pickerOpen: false
  };

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    }
  }

  function updateStats() {
    const code = editor.getValue();
    const lines = code.length ? code.split("\n").length : 1;
    codeStats.textContent = `${code.length.toLocaleString()}자 · ${lines.toLocaleString()}줄`;
  }

  function setDraftStatus(text, temporary = false) {
    draftState.textContent = text;
    clearTimeout(state.draftStatusTimer);
    if (temporary) {
      state.draftStatusTimer = setTimeout(() => {
        draftState.textContent = "자동 임시저장";
      }, 1300);
    }
  }

  function getShareIdFromPath() {
    const match = location.pathname.match(/^\/share\/([A-Za-z0-9]{4})\/?$/);
    return match ? match[1].toUpperCase() : null;
  }

  function getDraftKey() {
    const id = state.shareId || getShareIdFromPath();
    return `${DRAFT_PREFIX}${id ? `share:${id}` : "main"}`;
  }

  function saveDraftNow() {
    if (state.loading) return;
    try {
      const payload = {
        version: 1,
        code: editor.getValue(),
        languageChoice: state.languageChoice,
        detectedLanguage: state.detectedLanguage,
        savedAt: Date.now()
      };
      localStorage.setItem(getDraftKey(), JSON.stringify(payload));
      setDraftStatus("임시저장됨", true);
    } catch {
      setDraftStatus("임시저장 실패");
    }
  }

  function scheduleDraftSave() {
    clearTimeout(state.draftTimer);
    setDraftStatus("저장 중...");
    state.draftTimer = setTimeout(saveDraftNow, 450);
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(getDraftKey());
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && data.version === 1 && typeof data.code === "string" ? data : null;
    } catch {
      return null;
    }
  }

  function restoreDraft(showMessage = true) {
    const draft = readDraft();
    if (!draft) return false;
    state.loading = true;
    editor.setValue(draft.code);
    state.languageChoice = draft.languageChoice === "auto" || MODE_CONFIG[draft.languageChoice]
      ? draft.languageChoice
      : "auto";
    state.detectedLanguage = MODE_CONFIG[draft.detectedLanguage] ? draft.detectedLanguage : "plaintext";
    state.languageSource = state.languageChoice === "auto" ? "detected" : "manual";
    applyLanguageState();
    state.loading = false;
    updateStats();
    if (state.languageChoice === "auto") runDetection();
    if (showMessage) showToast("임시저장된 코드를 불러왔습니다.");
    return true;
  }

  function setEditorMode(language) {
    const config = MODE_CONFIG[language] || MODE_CONFIG.plaintext;
    editor.setOption("mode", config.mode);
    if (config.load && typeof CodeMirror.autoLoadMode === "function") {
      CodeMirror.autoLoadMode(editor, config.load);
    }
  }

  function effectiveLanguage() {
    return state.languageChoice === "auto" ? state.detectedLanguage : state.languageChoice;
  }

  function applyLanguageState() {
    const effective = effectiveLanguage();
    setEditorMode(effective);
    if (state.languageChoice === "auto") {
      const hasCode = editor.getValue().trim().length > 0;
      languageTriggerText.textContent = hasCode
        ? `자동 인식 · ${LABEL_BY_VALUE[effective] || "Plain Text"}`
        : "자동 인식";
      recognizedBadge.hidden = !hasCode;
      state.languageSource = "detected";
    } else {
      languageTriggerText.textContent = LABEL_BY_VALUE[state.languageChoice] || "Plain Text";
      recognizedBadge.hidden = true;
      state.languageSource = "manual";
    }
    renderLanguageOptions(languageSearch.value);
  }

  function chooseLanguage(value) {
    state.languageChoice = value === "auto" || MODE_CONFIG[value] ? value : "auto";
    if (state.languageChoice === "auto") {
      runDetection();
    } else {
      applyLanguageState();
    }
    closeLanguagePicker();
    scheduleDraftSave();
  }

  function renderLanguageOptions(query = "") {
    const normalized = query.trim().toLocaleLowerCase("ko");
    const filtered = LANGUAGES.filter((item) => {
      const haystack = `${item.label} ${item.value} ${item.keywords}`.toLocaleLowerCase("ko");
      return !normalized || haystack.includes(normalized);
    });

    languageOptions.replaceChildren();
    for (const item of filtered) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "language-option";
      button.dataset.value = item.value;
      button.setAttribute("role", "option");
      const selected = state.languageChoice === item.value;
      button.setAttribute("aria-selected", String(selected));
      if (selected) button.classList.add("selected");

      const label = document.createElement("span");
      label.textContent = item.label;
      button.appendChild(label);

      if (item.value === "auto" && state.languageChoice === "auto" && editor.getValue().trim()) {
        const detected = document.createElement("span");
        detected.className = "option-detected";
        detected.textContent = `${LABEL_BY_VALUE[state.detectedLanguage]} · 인식됨`;
        button.appendChild(detected);
      }

      button.addEventListener("click", () => chooseLanguage(item.value));
      languageOptions.appendChild(button);
    }

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "language-empty";
      empty.textContent = "검색 결과가 없습니다.";
      languageOptions.appendChild(empty);
    }
  }

  function openLanguagePicker() {
    state.pickerOpen = true;
    languageMenu.hidden = false;
    languageTrigger.setAttribute("aria-expanded", "true");
    languagePicker.classList.add("open");
    languageSearch.value = "";
    renderLanguageOptions();
    setTimeout(() => languageSearch.focus(), 0);
  }

  function closeLanguagePicker() {
    if (!state.pickerOpen) return;
    state.pickerOpen = false;
    languageMenu.hidden = true;
    languageTrigger.setAttribute("aria-expanded", "false");
    languagePicker.classList.remove("open");
    languageSearch.value = "";
  }

  function detectByHeuristics(code) {
    const text = code.trim();
    if (!text) return "plaintext";
    if (/^<\?php\b/i.test(text)) return "php";
    if (/^#!.*\b(?:bash|sh|zsh)\b/.test(text)) return "shell";
    if (/^[\[{]/.test(text)) {
      try { JSON.parse(text); return "json"; } catch {}
    }
    if (/<!doctype\s+html|<html\b|<(?:div|span|script|style|body|head|main|section|button|input)\b/i.test(text)) return "html";
    if (/^<\?xml\b|^<[A-Za-z_][\w:.-]*(?:\s[^>]*)?>[\s\S]*<\//.test(text)) return "xml";
    if (/^\s*#include\s*[<"]/.test(text)) return /\bstd::|\bcout\b|\bcin\b|<iostream>|\bvector\s*</.test(text) ? "cpp" : "c";
    if (/\busing\s+System\s*;|\bConsole\.Write(Line)?\s*\(|\bnamespace\s+\w+\s*\{/.test(text)) return "csharp";
    if (/\bpublic\s+static\s+void\s+main\s*\(|\bSystem\.out\.print/.test(text)) return "java";
    if (/\bpackage\s+main\b|\bfunc\s+main\s*\(|\bfmt\.Print/.test(text)) return "go";
    if (/\bfn\s+main\s*\(|\bprintln!\s*\(|\blet\s+mut\b/.test(text)) return "rust";
    if (/\bfun\s+main\s*\(|\bprintln\s*\(|\bdata\s+class\b/.test(text)) return "kotlin";
    if (/\bimport\s+SwiftUI\b|\bimport\s+Foundation\b|\bguard\s+let\b/.test(text)) return "swift";
    if (/^(?:\s*)(?:def\s+\w+|from\s+\w[\w.]*\s+import\s+|import\s+\w[\w.]*|print\s*\()/m.test(text)) return "python";
    if (/^(?:\s*)(?:def\s+\w+[!?=]?|puts\s+|require\s+["'])/m.test(text) && /\bend\b/.test(text)) return "ruby";
    if (/\b(?:interface|enum)\s+\w+\s*\{|\btype\s+\w+\s*=|:\s*(?:string|number|boolean|unknown|never)(?:\[\])?\b/.test(text)) return "typescript";
    if (/\b(?:const|let|var)\s+\w+|=>|\bfunction\s+\w*\s*\(|\bconsole\.log\s*\(|\bdocument\./.test(text)) return "javascript";
    if (/\b(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/i.test(text)) return "sql";
    if (/^(?:#{1,6}\s+|```|>\s+|[-*+]\s+)/m.test(text)) return "markdown";
    if (/(?:^|\n)\s*[.#]?[A-Za-z][^{\n]*\{[^{}]*:[^{};]+;?[^{}]*\}/m.test(text) && !/\b(?:function|const|let|var)\b/.test(text)) return "css";
    const yamlLines = text.split("\n").filter((line) => /^\s*[\w.-]+\s*:\s*.+$/.test(line));
    if (yamlLines.length >= 2) return "yaml";
    return null;
  }

  function detectLanguage(code) {
    const heuristic = detectByHeuristics(code);
    if (heuristic) return heuristic;
    if (!window.hljs || typeof window.hljs.highlightAuto !== "function") return "plaintext";
    const aliases = ["javascript", "typescript", "json", "xml", "css", "python", "java", "c", "cpp", "csharp", "kotlin", "swift", "php", "ruby", "go", "rust", "bash", "sql", "markdown", "yaml"];
    const candidates = aliases.filter((name) => window.hljs.getLanguage(name));
    try {
      const result = window.hljs.highlightAuto(code.slice(0, 24000), candidates);
      return HLJS_MAP[result.language] || "plaintext";
    } catch {
      return "plaintext";
    }
  }

  function runDetection() {
    if (state.languageChoice !== "auto" || state.loading) return;
    const code = editor.getValue();
    state.detectedLanguage = code.trim() ? detectLanguage(code) : "plaintext";
    applyLanguageState();
  }

  function scheduleDetection() {
    clearTimeout(state.detectionTimer);
    state.detectionTimer = setTimeout(runDetection, 380);
  }

  function updateAccessUi() {
    logoutBtn.hidden = !(state.passwordRequired && state.authenticated);
    const canCreateShare = !state.passwordRequired || state.authenticated;
    shareBtn.disabled = !canCreateShare;
    shareBtn.title = canCreateShare ? "" : "새 공유 링크를 만들려면 접속 비밀번호 인증이 필요합니다.";
    if (state.passwordRequired && !state.authenticated && state.shareId) {
      accessState.textContent = "비밀번호 없이 보는 공유 링크";
    } else if (state.passwordRequired) {
      accessState.textContent = "비밀번호 보호됨";
    } else {
      accessState.textContent = "";
    }
  }

  async function loadSession() {
    try {
      const response = await fetch("/api/session", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      state.passwordRequired = Boolean(data.passwordRequired);
      state.authenticated = Boolean(data.authenticated);
      updateAccessUi();
    } catch {}
  }

  async function loadSharedCode() {
    const id = getShareIdFromPath();
    if (!id) return false;
    state.shareId = id;
    shareTag.textContent = `공유 ${id}`;
    shareTag.hidden = false;
    updateAccessUi();

    try {
      const response = await fetch(`/api/share/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        accessState.textContent = data.error || "공유 코드를 불러오지 못했습니다.";
        showToast(data.error || "공유 코드를 불러오지 못했습니다.");
        return false;
      }

      state.loading = true;
      editor.setValue(data.code || "");
      state.languageChoice = data.languageSource === "manual" && MODE_CONFIG[data.language] ? data.language : "auto";
      state.detectedLanguage = MODE_CONFIG[data.language] ? data.language : "plaintext";
      applyLanguageState();
      state.loading = false;
      updateStats();
      document.title = `${id} · 김대원 & 이준우의 코드 공유 사이트`;

      if (!restoreDraft(false) && state.languageChoice === "auto") runDetection();
      else if (readDraft()) showToast("이 공유 링크의 임시저장본을 불러왔습니다.");
      return true;
    } catch {
      state.loading = false;
      accessState.textContent = "공유 코드를 불러오지 못했습니다.";
      showToast("공유 코드를 불러오지 못했습니다.");
      return false;
    }
  }

  function openShareDialog() {
    if (shareBtn.disabled) {
      showToast("새 공유 링크를 만들려면 접속 비밀번호 인증이 필요합니다.");
      return;
    }
    shareVisibility.value = "protected";
    shareResult.hidden = true;
    shareError.textContent = "";
    shareUrl.value = "";
    createShareBtn.disabled = false;
    createShareBtn.textContent = "만들기";
    shareDialog.showModal();
  }

  async function createShare() {
    createShareBtn.disabled = true;
    createShareBtn.textContent = "만드는 중...";
    shareError.textContent = "";
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editor.getValue(),
          language: effectiveLanguage(),
          languageSource: state.languageChoice === "auto" ? "detected" : "manual",
          visibility: shareVisibility.value
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        shareError.textContent = data.error || "공유 링크를 만들지 못했습니다.";
        return;
      }
      const url = new URL(data.path, location.origin).href;
      shareUrl.value = url;
      shareResult.hidden = false;
      createShareBtn.textContent = "새 링크 만들기";
      showToast("공유 링크를 만들었습니다.");
    } catch {
      shareError.textContent = "공유 링크를 만들지 못했습니다.";
    } finally {
      createShareBtn.disabled = false;
      if (createShareBtn.textContent === "만드는 중...") createShareBtn.textContent = "만들기";
    }
  }

  function showFadeDialog(dialog) {
    if (dialog.open) return;
    dialog.showModal();
    requestAnimationFrame(() => dialog.classList.add("is-visible"));
  }

  function closeFadeDialog(dialog) {
    if (!dialog.open) return;
    dialog.classList.remove("is-visible");
    setTimeout(() => {
      if (dialog.open) dialog.close();
    }, 170);
  }

  function hasSeenMessageGuide() {
    try { return localStorage.getItem(MESSAGE_GUIDE_KEY) === "1"; } catch { return false; }
  }

  function markMessageGuideSeen() {
    try { localStorage.setItem(MESSAGE_GUIDE_KEY, "1"); } catch {}
  }

  function makeMessageFile() {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/T/, "-").slice(0, 13);
    const fileName = `code-${stamp}.png`;
    const blob = new Blob(["\uFEFF", editor.getValue()], { type: "image/png" });
    return new File([blob], fileName, { type: "image/png", lastModified: Date.now() });
  }

  function prepareMessageShareDialog() {
    const file = makeMessageFile();
    messageFileName.textContent = file.name;
    showFadeDialog(messageShareDialog);
  }

  function downloadMessageFile() {
    const file = makeMessageFile();
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("PNG 파일로 다운로드했습니다.");
  }

  async function shareMessageFile() {
    const file = makeMessageFile();
    if (!navigator.share) {
      showToast("이 브라우저는 기기 공유 창을 지원하지 않습니다.");
      prepareMessageShareDialog();
      return;
    }
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      showToast("이 기기에서는 이 파일을 바로 공유할 수 없습니다.");
      prepareMessageShareDialog();
      return;
    }
    try {
      await navigator.share({
        files: [file],
        title: "코드 공유",
        text: "받은 파일의 확장자를 .png에서 .txt로 변경해 주세요."
      });
    } catch (error) {
      if (error && error.name !== "AbortError") showToast("공유 창을 열지 못했습니다.");
    }
  }

  function startMessageShare() {
    if (hasSeenMessageGuide()) {
      prepareMessageShareDialog();
    } else {
      showFadeDialog(messageGuideDialog);
    }
  }

  editor.on("change", () => {
    updateStats();
    if (!state.loading) {
      if (state.languageChoice === "auto") scheduleDetection();
      scheduleDraftSave();
    }
  });

  languageTrigger.addEventListener("click", () => {
    state.pickerOpen ? closeLanguagePicker() : openLanguagePicker();
  });

  languageSearch.addEventListener("input", () => renderLanguageOptions(languageSearch.value));
  languageSearch.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeLanguagePicker();
      languageTrigger.focus();
    } else if (event.key === "Enter") {
      const first = languageOptions.querySelector(".language-option");
      if (first) {
        event.preventDefault();
        first.click();
      }
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (state.pickerOpen && !languagePicker.contains(event.target)) closeLanguagePicker();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.pickerOpen) closeLanguagePicker();
  });

  copyBtn.addEventListener("click", async () => {
    const copied = await copyText(editor.getValue());
    showToast(copied ? "코드를 복사했습니다." : "복사하지 못했습니다.");
  });

  messageShareBtn.addEventListener("click", startMessageShare);
  guideConfirmBtn.addEventListener("click", () => {
    markMessageGuideSeen();
    closeFadeDialog(messageGuideDialog);
    setTimeout(prepareMessageShareDialog, 190);
  });
  guideShareBtn.addEventListener("click", () => {
    markMessageGuideSeen();
    closeFadeDialog(messageGuideDialog);
    void shareMessageFile();
  });
  messageInfoBtn.addEventListener("click", () => {
    closeFadeDialog(messageShareDialog);
    setTimeout(() => showFadeDialog(messageGuideDialog), 190);
  });
  messageCloseBtn.addEventListener("click", () => closeFadeDialog(messageShareDialog));
  messageDownloadBtn.addEventListener("click", downloadMessageFile);
  deviceShareBtn.addEventListener("click", shareMessageFile);

  for (const dialog of [messageGuideDialog, messageShareDialog]) {
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeFadeDialog(dialog);
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeFadeDialog(dialog);
    });
  }

  shareBtn.addEventListener("click", openShareDialog);
  createShareBtn.addEventListener("click", createShare);

  copyShareUrlBtn.addEventListener("click", async () => {
    const copied = await copyText(shareUrl.value);
    showToast(copied ? "공유 주소를 복사했습니다." : "복사하지 못했습니다.");
  });

  logoutBtn.addEventListener("click", async () => {
    try { await fetch("/api/auth", { method: "DELETE" }); }
    finally { location.href = "/"; }
  });

  renderLanguageOptions();
  updateStats();
  applyLanguageState();

  Promise.all([loadSession(), loadSharedCode()]).then(([, sharedLoaded]) => {
    if (!sharedLoaded) restoreDraft(false);
    updateAccessUi();
    editor.refresh();
    editor.focus();
  });
})();
