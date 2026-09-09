(() => {
  "use strict";

  const languageSelect = document.getElementById("languageSelect");
  const recognizedBadge = document.getElementById("recognizedBadge");
  const autoDetectBtn = document.getElementById("autoDetectBtn");
  const copyBtn = document.getElementById("copyBtn");
  const shareBtn = document.getElementById("shareBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const shareTag = document.getElementById("shareTag");
  const codeStats = document.getElementById("codeStats");
  const accessState = document.getElementById("accessState");
  const shareDialog = document.getElementById("shareDialog");
  const shareVisibility = document.getElementById("shareVisibility");
  const shareResult = document.getElementById("shareResult");
  const shareUrl = document.getElementById("shareUrl");
  const shareError = document.getElementById("shareError");
  const createShareBtn = document.getElementById("createShareBtn");
  const copyShareUrlBtn = document.getElementById("copyShareUrlBtn");
  const toast = document.getElementById("toast");

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
    javascript: "javascript",
    js: "javascript",
    typescript: "typescript",
    ts: "typescript",
    json: "json",
    xml: "html",
    html: "html",
    css: "css",
    python: "python",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    "c++": "cpp",
    csharp: "csharp",
    cs: "csharp",
    kotlin: "kotlin",
    swift: "swift",
    php: "php",
    ruby: "ruby",
    rb: "ruby",
    go: "go",
    rust: "rust",
    bash: "shell",
    shell: "shell",
    sh: "shell",
    sql: "sql",
    markdown: "markdown",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml"
  };

  const state = {
    autoDetection: true,
    languageSource: "detected",
    passwordRequired: false,
    authenticated: true,
    shareId: null,
    loadingShare: false,
    detectionTimer: null,
    toastTimer: null
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

  function setRecognizedVisible(visible) {
    recognizedBadge.hidden = !visible;
  }

  function setEditorMode(language) {
    const config = MODE_CONFIG[language] || MODE_CONFIG.plaintext;
    editor.setOption("mode", config.mode);
    if (config.load && typeof CodeMirror.autoLoadMode === "function") {
      CodeMirror.autoLoadMode(editor, config.load);
    }
  }

  function selectLanguage(language, source) {
    const validLanguage = MODE_CONFIG[language] ? language : "plaintext";
    languageSelect.value = validLanguage;
    state.languageSource = source === "manual" ? "manual" : "detected";
    setRecognizedVisible(
      state.languageSource === "detected" && editor.getValue().trim().length > 0
    );
    setEditorMode(validLanguage);
  }

  function detectByHeuristics(code) {
    const text = code.trim();
    if (!text) return "plaintext";

    if (/^<\?php\b/i.test(text)) return "php";
    if (/^#!.*\b(?:bash|sh|zsh)\b/.test(text)) return "shell";

    if (/^[\[{]/.test(text)) {
      try {
        JSON.parse(text);
        return "json";
      } catch {
        // Continue with language detection.
      }
    }

    if (/<!doctype\s+html|<html\b|<(?:div|span|script|style|body|head|main|section|button|input)\b/i.test(text)) {
      return "html";
    }

    if (/^<\?xml\b|^<[A-Za-z_][\w:.-]*(?:\s[^>]*)?>[\s\S]*<\//.test(text)) {
      return "xml";
    }

    if (/^\s*#include\s*[<"]/.test(text)) {
      return /\bstd::|\bcout\b|\bcin\b|#include\s*<iostream>|\bvector\s*</.test(text)
        ? "cpp"
        : "c";
    }

    if (/\busing\s+System\s*;|\bConsole\.Write(Line)?\s*\(|\bnamespace\s+\w+\s*\{/.test(text)) {
      return "csharp";
    }

    if (/\bpublic\s+static\s+void\s+main\s*\(|\bSystem\.out\.print/.test(text)) {
      return "java";
    }

    if (/\bpackage\s+main\b|\bfunc\s+main\s*\(|\bfmt\.Print/.test(text)) {
      return "go";
    }

    if (/\bfn\s+main\s*\(|\bprintln!\s*\(|\blet\s+mut\b/.test(text)) {
      return "rust";
    }

    if (/\bfun\s+main\s*\(|\bprintln\s*\(|\bdata\s+class\b/.test(text)) {
      return "kotlin";
    }

    if (/\bimport\s+SwiftUI\b|\bimport\s+Foundation\b|\bguard\s+let\b/.test(text)) {
      return "swift";
    }

    if (/^(?:\s*)(?:def\s+\w+|from\s+\w[\w.]*\s+import\s+|import\s+\w[\w.]*|print\s*\()/m.test(text)) {
      return "python";
    }

    if (/^(?:\s*)(?:def\s+\w+[!?=]?|puts\s+|require\s+["'])/m.test(text) && /\bend\b/.test(text)) {
      return "ruby";
    }

    if (/\b(?:interface|enum)\s+\w+\s*\{|\btype\s+\w+\s*=|:\s*(?:string|number|boolean|unknown|never)(?:\[\])?\b/.test(text)) {
      return "typescript";
    }

    if (/\b(?:const|let|var)\s+\w+|=>|\bfunction\s+\w*\s*\(|\bconsole\.log\s*\(|\bdocument\./.test(text)) {
      return "javascript";
    }

    if (/\b(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/i.test(text)) {
      return "sql";
    }

    if (/^(?:#{1,6}\s+|```|>\s+|[-*+]\s+)/m.test(text)) {
      return "markdown";
    }

    const cssBlock = /(?:^|\n)\s*[.#]?[A-Za-z][^{\n]*\{[^{}]*:[^{};]+;?[^{}]*\}/m;
    if (cssBlock.test(text) && !/\b(?:function|const|let|var)\b/.test(text)) {
      return "css";
    }

    const yamlLines = text.split("\n").filter((line) => /^\s*[\w.-]+\s*:\s*.+$/.test(line));
    if (yamlLines.length >= 2) return "yaml";

    return null;
  }

  function detectLanguage(code) {
    const heuristic = detectByHeuristics(code);
    if (heuristic) return heuristic;

    if (!window.hljs || typeof window.hljs.highlightAuto !== "function") {
      return "plaintext";
    }

    const aliases = [
      "javascript", "typescript", "json", "xml", "css", "python", "java",
      "c", "cpp", "csharp", "kotlin", "swift", "php", "ruby", "go",
      "rust", "bash", "sql", "markdown", "yaml"
    ];
    const candidates = aliases.filter((name) => window.hljs.getLanguage(name));

    try {
      const sample = code.slice(0, 24000);
      const result = window.hljs.highlightAuto(sample, candidates);
      return HLJS_MAP[result.language] || "plaintext";
    } catch {
      return "plaintext";
    }
  }

  function runDetection() {
    if (!state.autoDetection || state.loadingShare) return;
    const code = editor.getValue();
    if (!code.trim()) {
      selectLanguage("plaintext", "detected");
      setRecognizedVisible(false);
      return;
    }
    selectLanguage(detectLanguage(code), "detected");
  }

  function scheduleDetection() {
    clearTimeout(state.detectionTimer);
    state.detectionTimer = setTimeout(runDetection, 420);
  }

  function updateAccessUi() {
    logoutBtn.hidden = !(state.passwordRequired && state.authenticated);
    const canCreateShare = !state.passwordRequired || state.authenticated;
    shareBtn.disabled = !canCreateShare;
    shareBtn.title = canCreateShare
      ? ""
      : "새 공유 링크를 만들려면 접속 비밀번호 인증이 필요합니다.";

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
    } catch {
      // The editor remains usable even if the status request fails.
    }
  }

  function getShareIdFromPath() {
    const match = location.pathname.match(/^\/share\/([A-Za-z0-9]{4})\/?$/);
    return match ? match[1].toUpperCase() : null;
  }

  async function loadSharedCode() {
    const id = getShareIdFromPath();
    if (!id) return;

    state.shareId = id;
    shareTag.textContent = `공유 ${id}`;
    shareTag.hidden = false;
    updateAccessUi();

    try {
      const response = await fetch(`/api/share/${encodeURIComponent(id)}`, {
        cache: "no-store"
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        accessState.textContent = data.error || "공유 코드를 불러오지 못했습니다.";
        showToast(data.error || "공유 코드를 불러오지 못했습니다.");
        return;
      }

      state.loadingShare = true;
      editor.setValue(data.code || "");
      state.autoDetection = data.languageSource !== "manual";
      selectLanguage(data.language || "plaintext", data.languageSource);
      if (state.autoDetection && editor.getValue().trim()) {
        setRecognizedVisible(true);
      }
      state.loadingShare = false;
      updateStats();
      document.title = `${id} · 김대원 & 이준우의 코드 공유 사이트`;
    } catch {
      state.loadingShare = false;
      accessState.textContent = "공유 코드를 불러오지 못했습니다.";
      showToast("공유 코드를 불러오지 못했습니다.");
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
          language: languageSelect.value,
          languageSource: state.languageSource,
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
      if (createShareBtn.textContent === "만드는 중...") {
        createShareBtn.textContent = "만들기";
      }
    }
  }

  editor.on("change", () => {
    updateStats();
    if (state.autoDetection && !state.loadingShare) scheduleDetection();
  });

  languageSelect.addEventListener("change", () => {
    state.autoDetection = false;
    selectLanguage(languageSelect.value, "manual");
  });

  autoDetectBtn.addEventListener("click", () => {
    state.autoDetection = true;
    state.languageSource = "detected";
    runDetection();
    showToast("자동 감지를 사용합니다.");
  });

  copyBtn.addEventListener("click", async () => {
    const copied = await copyText(editor.getValue());
    showToast(copied ? "코드를 복사했습니다." : "복사하지 못했습니다.");
  });

  shareBtn.addEventListener("click", openShareDialog);
  createShareBtn.addEventListener("click", createShare);

  copyShareUrlBtn.addEventListener("click", async () => {
    const copied = await copyText(shareUrl.value);
    showToast(copied ? "공유 주소를 복사했습니다." : "복사하지 못했습니다.");
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } finally {
      location.href = "/";
    }
  });

  updateStats();
  setRecognizedVisible(false);
  setEditorMode("plaintext");

  Promise.all([loadSession(), loadSharedCode()]).then(() => {
    updateAccessUi();
    editor.refresh();
    editor.focus();
  });
})();
