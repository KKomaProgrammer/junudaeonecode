(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const refs = {
    languagePicker: $("languagePicker"), languageTrigger: $("languageTrigger"), languageTriggerText: $("languageTriggerText"),
    recognizedBadge: $("recognizedBadge"), languageMenu: $("languageMenu"), languageSearch: $("languageSearch"), languageOptions: $("languageOptions"),
    copyBtn: $("copyBtn"), messageShareBtn: $("messageShareBtn"), shareBtn: $("shareBtn"), logoutBtn: $("logoutBtn"),
    mySharesBtn: $("mySharesBtn"), identityBtn: $("identityBtn"), identityName: $("identityName"), shareTag: $("shareTag"),
    codeStats: $("codeStats"), draftState: $("draftState"), accessState: $("accessState"),
    shareInfoBar: $("shareInfoBar"), shareTitleText: $("shareTitleText"), shareAuthorText: $("shareAuthorText"), deleteCurrentShareBtn: $("deleteCurrentShareBtn"),
    shareDialog: $("shareDialog"), shareTitle: $("shareTitle"), shareVisibility: $("shareVisibility"), shareResult: $("shareResult"),
    shareUrl: $("shareUrl"), shareCreatorResult: $("shareCreatorResult"), shareError: $("shareError"), createShareBtn: $("createShareBtn"), copyShareUrlBtn: $("copyShareUrlBtn"),
    identityDialog: $("identityDialog"), networkIdText: $("networkIdText"), profileChoices: $("profileChoices"), identityError: $("identityError"),
    mySharesDialog: $("mySharesDialog"), mySharesSubtitle: $("mySharesSubtitle"), mySharesList: $("mySharesList"), mySharesError: $("mySharesError"),
    confirmDeleteDialog: $("confirmDeleteDialog"), deleteConfirmText: $("deleteConfirmText"), cancelDeleteBtn: $("cancelDeleteBtn"), confirmDeleteBtn: $("confirmDeleteBtn"),
    messageGuideDialog: $("messageGuideDialog"), guideConfirmBtn: $("guideConfirmBtn"), guideShareBtn: $("guideShareBtn"),
    messageShareDialog: $("messageShareDialog"), messageInfoBtn: $("messageInfoBtn"), messageFileName: $("messageFileName"),
    messageCloseBtn: $("messageCloseBtn"), messageDownloadBtn: $("messageDownloadBtn"), deviceShareBtn: $("deviceShareBtn"), toast: $("toast")
  };

  CodeMirror.modeURL = "https://cdn.jsdelivr.net/npm/codemirror@5.65.21/mode/%N/%N.js";
  const editor = CodeMirror.fromTextArea($("editor"), {
    lineNumbers: true, lineWrapping: false, tabSize: 2, indentUnit: 2, indentWithTabs: false,
    mode: null, placeholder: "코드를 붙여넣거나 입력하세요..."
  });

  const LANGUAGES = [
    { id: "auto", label: "자동 인식", aliases: ["auto", "자동", "자동감지", "자동인식"] },
    { id: "plaintext", label: "Plain Text", aliases: ["text", "txt", "텍스트"] },
    { id: "javascript", label: "JavaScript", aliases: ["js", "자바스크립트"] },
    { id: "typescript", label: "TypeScript", aliases: ["ts", "타입스크립트"] },
    { id: "json", label: "JSON", aliases: ["제이슨"] },
    { id: "html", label: "HTML", aliases: ["htm", "웹"] },
    { id: "xml", label: "XML", aliases: [] },
    { id: "css", label: "CSS", aliases: ["스타일"] },
    { id: "python", label: "Python", aliases: ["py", "파이썬"] },
    { id: "java", label: "Java", aliases: ["자바"] },
    { id: "c", label: "C", aliases: ["c언어"] },
    { id: "cpp", label: "C++", aliases: ["cpp", "cplusplus"] },
    { id: "csharp", label: "C#", aliases: ["cs", "csharp", "씨샵"] },
    { id: "kotlin", label: "Kotlin", aliases: ["코틀린"] },
    { id: "swift", label: "Swift", aliases: ["스위프트"] },
    { id: "php", label: "PHP", aliases: [] },
    { id: "ruby", label: "Ruby", aliases: ["rb", "루비"] },
    { id: "go", label: "Go", aliases: ["golang", "고"] },
    { id: "rust", label: "Rust", aliases: ["러스트"] },
    { id: "shell", label: "Shell", aliases: ["bash", "sh", "셸", "쉘"] },
    { id: "sql", label: "SQL", aliases: ["에스큐엘"] },
    { id: "markdown", label: "Markdown", aliases: ["md", "마크다운"] },
    { id: "yaml", label: "YAML", aliases: ["yml", "야믈"] }
  ];
  const LANGUAGE_MAP = Object.fromEntries(LANGUAGES.map((item) => [item.id, item]));
  const MODE_CONFIG = {
    plaintext: { mode: null }, javascript: { mode: "javascript" }, typescript: { mode: { name: "javascript", typescript: true } },
    json: { mode: { name: "javascript", json: true } }, html: { mode: "htmlmixed" }, xml: { mode: "xml" }, css: { mode: "css" },
    python: { mode: "python", load: "python" }, java: { mode: "text/x-java" }, c: { mode: "text/x-csrc" }, cpp: { mode: "text/x-c++src" },
    csharp: { mode: "text/x-csharp" }, kotlin: { mode: "text/x-kotlin" }, swift: { mode: "swift", load: "swift" },
    php: { mode: "application/x-httpd-php", load: "php" }, ruby: { mode: "ruby", load: "ruby" }, go: { mode: "go", load: "go" },
    rust: { mode: "rust", load: "rust" }, shell: { mode: "shell", load: "shell" }, sql: { mode: "text/x-sql", load: "sql" },
    markdown: { mode: "markdown", load: "markdown" }, yaml: { mode: "yaml", load: "yaml" }
  };
  const HLJS_MAP = { javascript:"javascript",js:"javascript",typescript:"typescript",ts:"typescript",json:"json",xml:"html",html:"html",css:"css",python:"python",py:"python",java:"java",c:"c",cpp:"cpp","c++":"cpp",csharp:"csharp",cs:"csharp",kotlin:"kotlin",swift:"swift",php:"php",ruby:"ruby",rb:"ruby",go:"go",rust:"rust",bash:"shell",shell:"shell",sh:"shell",sql:"sql",markdown:"markdown",md:"markdown",yaml:"yaml",yml:"yaml" };

  const state = {
    languageMode: "auto", manualLanguage: "plaintext", detectedLanguage: "plaintext",
    passwordRequired: false, authenticated: true, identity: { profile:"visitor", name:"방문자", networkId:"", canSwitch:false },
    shareId: getShareIdFromPath(), shareRecord: null, loading: false,
    detectionTimer: null, draftTimer: null, toastTimer: null, pendingDeleteId: null, pendingDeleteTitle: "",
    guideReturnToShare: false
  };

  function showToast(message) {
    refs.toast.textContent = message;
    refs.toast.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => refs.toast.classList.remove("show"), 1900);
  }

  function openDialog(dialog) { if (dialog && !dialog.open) dialog.showModal(); }
  function closeDialog(dialog) { if (dialog?.open) dialog.close(); }

  function getShareIdFromPath() {
    const match = location.pathname.match(/^\/share\/([A-Za-z0-9]{4})\/?$/);
    return match ? match[1].toUpperCase() : null;
  }

  function currentDraftKey() {
    return state.shareId ? `junudae_draft_share_${state.shareId}` : "junudae_draft_main";
  }

  function storageGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function storageSet(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }
  function storageRemove(key) { try { localStorage.removeItem(key); } catch {} }

  function updateStats() {
    const code = editor.getValue();
    const lines = code.length ? code.split("\n").length : 1;
    refs.codeStats.textContent = `${code.length.toLocaleString()}자 · ${lines.toLocaleString()}줄`;
  }

  function languageLabel(id) { return LANGUAGE_MAP[id]?.label || "Plain Text"; }

  function setEditorMode(language) {
    const config = MODE_CONFIG[language] || MODE_CONFIG.plaintext;
    editor.setOption("mode", config.mode);
    if (config.load && typeof CodeMirror.autoLoadMode === "function") CodeMirror.autoLoadMode(editor, config.load);
  }

  function activeLanguage() { return state.languageMode === "auto" ? state.detectedLanguage : state.manualLanguage; }

  function updateLanguageUi() {
    const codeExists = Boolean(editor.getValue().trim());
    if (state.languageMode === "auto") {
      refs.languageTriggerText.textContent = codeExists ? `자동 인식 · ${languageLabel(state.detectedLanguage)}` : "자동 인식";
      refs.recognizedBadge.hidden = !codeExists;
    } else {
      refs.languageTriggerText.textContent = languageLabel(state.manualLanguage);
      refs.recognizedBadge.hidden = true;
    }
    setEditorMode(activeLanguage());
    renderLanguageOptions(refs.languageSearch.value || "");
  }

  function chooseLanguage(id) {
    if (id === "auto") {
      state.languageMode = "auto";
      runDetection();
    } else if (MODE_CONFIG[id]) {
      state.languageMode = "manual";
      state.manualLanguage = id;
      updateLanguageUi();
    }
    closeLanguageMenu();
    scheduleDraftSave();
    editor.focus();
  }

  function renderLanguageOptions(query = "") {
    const normalized = query.trim().toLowerCase();
    const current = state.languageMode === "auto" ? "auto" : state.manualLanguage;
    const matches = LANGUAGES.filter((item) => {
      if (!normalized) return true;
      return [item.label, item.id, ...item.aliases].some((text) => String(text).toLowerCase().includes(normalized));
    });
    refs.languageOptions.innerHTML = "";
    if (!matches.length) {
      const empty = document.createElement("div"); empty.className = "language-empty"; empty.textContent = "검색 결과가 없습니다."; refs.languageOptions.appendChild(empty); return;
    }
    for (const item of matches) {
      const button = document.createElement("button");
      button.type = "button"; button.className = `language-option${item.id === current ? " active" : ""}`; button.dataset.language = item.id;
      const sub = item.id === "auto" && editor.getValue().trim() ? `현재 ${languageLabel(state.detectedLanguage)}` : item.aliases.slice(0,2).join(" · ");
      button.innerHTML = `<strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(sub)}</span>`;
      refs.languageOptions.appendChild(button);
    }
  }

  function openLanguageMenu() {
    refs.languageMenu.hidden = false; refs.languageTrigger.setAttribute("aria-expanded", "true"); refs.languageSearch.value = ""; renderLanguageOptions();
    requestAnimationFrame(() => refs.languageSearch.focus());
  }
  function closeLanguageMenu() { refs.languageMenu.hidden = true; refs.languageTrigger.setAttribute("aria-expanded", "false"); }

  function detectByHeuristics(code) {
    const text = code.trim(); if (!text) return "plaintext";
    if (/^<\?php\b/i.test(text)) return "php";
    if (/^#!.*\b(?:bash|sh|zsh)\b/.test(text)) return "shell";
    if (/^[\[{]/.test(text)) { try { JSON.parse(text); return "json"; } catch {} }
    if (/<!doctype\s+html|<html\b|<(?:div|span|script|style|body|head|main|section|button|input)\b/i.test(text)) return "html";
    if (/^<\?xml\b|^<[A-Za-z_][\w:.-]*(?:\s[^>]*)?>[\s\S]*<\//.test(text)) return "xml";
    if (/^\s*#include\s*[<"]/.test(text)) return /\bstd::|\bcout\b|\bcin\b|#include\s*<iostream>|\bvector\s*</.test(text) ? "cpp" : "c";
    if (/\busing\s+System\s*;|\bConsole\.Write(Line)?\s*\(|\bnamespace\s+\w+\s*\{/.test(text)) return "csharp";
    if (/\bpublic\s+static\s+void\s+main\s*\(|\bSystem\.out\.print/.test(text)) return "java";
    if (/\bpackage\s+main\b|\bfunc\s+main\s*\(|\bfmt\.Print/.test(text)) return "go";
    if (/\bfn\s+main\s*\(|\bprintln!\s*\(|\blet\s+mut\b/.test(text)) return "rust";
    if (/\bfun\s+main\s*\(|\bdata\s+class\b/.test(text)) return "kotlin";
    if (/\bimport\s+SwiftUI\b|\bimport\s+Foundation\b|\bguard\s+let\b/.test(text)) return "swift";
    if (/^(?:\s*)(?:def\s+\w+|from\s+\w[\w.]*\s+import\s+|import\s+\w[\w.]*|print\s*\()/m.test(text)) return "python";
    if (/\b(?:interface|enum)\s+\w+\s*\{|\btype\s+\w+\s*=|:\s*(?:string|number|boolean|unknown|never)(?:\[\])?\b/.test(text)) return "typescript";
    if (/\b(?:const|let|var)\s+\w+|=>|\bfunction\s+\w*\s*\(|\bconsole\.log\s*\(|\bdocument\./.test(text)) return "javascript";
    if (/\b(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)\b/i.test(text)) return "sql";
    if (/^(?:#{1,6}\s+|```|>\s+|[-*+]\s+)/m.test(text)) return "markdown";
    if (/(?:^|\n)\s*[.#]?[A-Za-z][^{\n]*\{[^{}]*:[^{};]+;?[^{}]*\}/m.test(text) && !/\b(?:function|const|let|var)\b/.test(text)) return "css";
    if (text.split("\n").filter((line) => /^\s*[\w.-]+\s*:\s*.+$/.test(line)).length >= 2) return "yaml";
    return null;
  }

  function detectLanguage(code) {
    const heuristic = detectByHeuristics(code); if (heuristic) return heuristic;
    if (!window.hljs?.highlightAuto) return "plaintext";
    const aliases = ["javascript","typescript","json","xml","css","python","java","c","cpp","csharp","kotlin","swift","php","ruby","go","rust","bash","sql","markdown","yaml"];
    const candidates = aliases.filter((name) => window.hljs.getLanguage(name));
    try { const result = window.hljs.highlightAuto(code.slice(0,24000), candidates); return HLJS_MAP[result.language] || "plaintext"; }
    catch { return "plaintext"; }
  }

  function runDetection() {
    if (state.languageMode !== "auto" || state.loading) return;
    state.detectedLanguage = detectLanguage(editor.getValue()); updateLanguageUi();
  }
  function scheduleDetection() { clearTimeout(state.detectionTimer); state.detectionTimer = setTimeout(runDetection, 360); }

  function saveDraft() {
    if (state.loading) return;
    const payload = {
      version: 2, code: editor.getValue(), languageMode: state.languageMode, manualLanguage: state.manualLanguage,
      detectedLanguage: state.detectedLanguage, updatedAt: new Date().toISOString()
    };
    refs.draftState.textContent = "임시저장 중...";
    const ok = storageSet(currentDraftKey(), JSON.stringify(payload));
    refs.draftState.textContent = ok ? "자동 임시저장됨" : "임시저장 실패";
  }
  function scheduleDraftSave() { clearTimeout(state.draftTimer); state.draftTimer = setTimeout(saveDraft, 450); }

  function restoreDraft() {
    const raw = storageGet(currentDraftKey()); if (!raw) return false;
    try {
      const draft = JSON.parse(raw); if (typeof draft.code !== "string") return false;
      state.loading = true; editor.setValue(draft.code);
      if (draft.languageMode === "manual" && MODE_CONFIG[draft.manualLanguage]) { state.languageMode = "manual"; state.manualLanguage = draft.manualLanguage; }
      else { state.languageMode = "auto"; state.detectedLanguage = MODE_CONFIG[draft.detectedLanguage] ? draft.detectedLanguage : detectLanguage(draft.code); }
      state.loading = false; updateStats(); updateLanguageUi(); refs.draftState.textContent = "임시저장 복원됨"; return true;
    } catch { return false; }
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const area = document.createElement("textarea"); area.value = text; area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select();
      const ok = document.execCommand("copy"); area.remove(); return ok;
    }
  }

  async function loadSession() {
    try {
      const response = await fetch("/api/session", { cache:"no-store" }); if (!response.ok) return;
      const data = await response.json(); state.passwordRequired = Boolean(data.passwordRequired); state.authenticated = Boolean(data.authenticated);
    } catch {}
    updateAccessUi();
  }

  function updateAccessUi() {
    refs.logoutBtn.hidden = !(state.passwordRequired && state.authenticated);
    const canCreate = !state.passwordRequired || state.authenticated;
    refs.shareBtn.disabled = !canCreate; refs.mySharesBtn.disabled = !canCreate;
    refs.shareBtn.title = canCreate ? "" : "새 공유 링크를 만들려면 접속 비밀번호 인증이 필요합니다.";
    if (state.passwordRequired && !state.authenticated && state.shareId) refs.accessState.textContent = "비밀번호 없이 보는 공유 링크";
    else if (state.passwordRequired) refs.accessState.textContent = "비밀번호 보호됨";
    else refs.accessState.textContent = "";
  }

  async function loadIdentity() {
    try {
      const response = await fetch("/api/identity", { cache:"no-store" }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "프로필을 불러오지 못했습니다.");
      state.identity = data; updateIdentityUi();
    } catch { refs.identityName.textContent = "방문자"; }
  }

  function updateIdentityUi() {
    refs.identityName.textContent = state.identity.name || "방문자";
    refs.networkIdText.textContent = state.identity.networkId || "확인 불가";
    refs.identityError.textContent = state.identity.canSwitch ? "" : "프로필을 바꾸려면 먼저 접속 비밀번호로 로그인해야 합니다.";
    for (const button of refs.profileChoices.querySelectorAll("[data-profile]")) {
      button.classList.toggle("selected", button.dataset.profile === state.identity.profile);
      button.disabled = !state.identity.canSwitch;
    }
  }

  async function switchIdentity(profile) {
    if (!state.identity.canSwitch) { showToast("프로필 변경 권한이 없습니다."); return; }
    refs.identityError.textContent = "";
    for (const button of refs.profileChoices.querySelectorAll("button")) button.disabled = true;
    try {
      const response = await fetch("/api/identity", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({profile}) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "프로필을 바꾸지 못했습니다.");
      state.identity = data; updateIdentityUi(); showToast(`${data.name} 프로필로 전환했습니다.`); closeDialog(refs.identityDialog);
      await refreshCurrentShareMeta();
      if (refs.mySharesDialog.open) await loadMyShares();
    } catch (error) { refs.identityError.textContent = error.message; }
    finally { updateIdentityUi(); }
  }

  function applyShareMeta(data) {
    state.shareRecord = data;
    refs.shareTag.textContent = `공유 ${data.id}`; refs.shareTag.hidden = false;
    refs.shareInfoBar.hidden = false; refs.shareTitleText.textContent = data.title || `코드 공유 ${data.id}`;
    const visibilityText = data.visibility === "public" ? "비밀번호 없이 보기" : "비밀번호 입력";
    refs.shareAuthorText.textContent = `${data.creatorName || "알 수 없음"} 공유 · ${visibilityText}`;
    refs.deleteCurrentShareBtn.hidden = !data.canDelete;
    document.title = `${data.title || data.id} · 김대원 & 이준우의 코드 공유 사이트`;
  }

  async function loadSharedCode() {
    if (!state.shareId) return;
    try {
      const response = await fetch(`/api/share/${encodeURIComponent(state.shareId)}`, { cache:"no-store" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "공유 코드를 불러오지 못했습니다.");
      applyShareMeta(data);
      state.loading = true; editor.setValue(data.code || "");
      if (data.languageSource === "manual" && MODE_CONFIG[data.language]) { state.languageMode = "manual"; state.manualLanguage = data.language; }
      else { state.languageMode = "auto"; state.detectedLanguage = MODE_CONFIG[data.language] ? data.language : detectLanguage(data.code || ""); }
      state.loading = false; updateStats(); updateLanguageUi();
      if (restoreDraft()) showToast("이 공유 링크의 임시저장본을 복원했습니다.");
    } catch (error) { refs.accessState.textContent = error.message; showToast(error.message); }
  }

  async function refreshCurrentShareMeta() {
    if (!state.shareId) return;
    try {
      const response = await fetch(`/api/share/${encodeURIComponent(state.shareId)}`, { cache:"no-store" }); const data = await response.json();
      if (response.ok) applyShareMeta(data);
    } catch {}
  }

  function openShareDialog() {
    if (refs.shareBtn.disabled) { showToast("새 공유 링크를 만들려면 로그인이 필요합니다."); return; }
    refs.shareTitle.value = ""; refs.shareVisibility.value = "protected"; refs.shareResult.hidden = true; refs.shareError.textContent = ""; refs.shareUrl.value = "";
    refs.createShareBtn.disabled = false; refs.createShareBtn.textContent = "만들기"; openDialog(refs.shareDialog); requestAnimationFrame(() => refs.shareTitle.focus());
  }

  async function createShare() {
    refs.createShareBtn.disabled = true; refs.createShareBtn.textContent = "만드는 중..."; refs.shareError.textContent = "";
    try {
      const response = await fetch("/api/share", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
        title: refs.shareTitle.value, code: editor.getValue(), language: activeLanguage(), languageSource: state.languageMode === "manual" ? "manual" : "detected", visibility: refs.shareVisibility.value
      }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "공유 링크를 만들지 못했습니다.");
      refs.shareUrl.value = new URL(data.path, location.origin).href; refs.shareResult.hidden = false;
      refs.shareCreatorResult.textContent = `${data.creatorName} 님이 공유한 링크로 저장되었습니다.`; refs.createShareBtn.textContent = "새 링크 만들기"; showToast("공유 링크를 만들었습니다.");
    } catch (error) { refs.shareError.textContent = error.message; }
    finally { refs.createShareBtn.disabled = false; if (refs.createShareBtn.textContent === "만드는 중...") refs.createShareBtn.textContent = "만들기"; }
  }

  async function loadMyShares() {
    refs.mySharesList.innerHTML = '<div class="empty-state">불러오는 중...</div>'; refs.mySharesError.textContent = "";
    try {
      const response = await fetch("/api/my-shares", { cache:"no-store" }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "내 공유 링크를 불러오지 못했습니다.");
      refs.mySharesSubtitle.textContent = `${data.name} 프로필로 만든 공유 링크입니다.`; renderMyShares(data.shares || []);
    } catch (error) { refs.mySharesList.innerHTML = ""; refs.mySharesError.textContent = error.message; }
  }

  function renderMyShares(shares) {
    refs.mySharesList.innerHTML = "";
    if (!shares.length) { refs.mySharesList.innerHTML = '<div class="empty-state">아직 만든 공유 링크가 없습니다.</div>'; return; }
    for (const share of shares) {
      const item = document.createElement("div"); item.className = "my-share-item";
      const date = share.createdAt ? new Date(share.createdAt).toLocaleString("ko-KR", {year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "날짜 없음";
      item.innerHTML = `<div class="my-share-main"><div class="my-share-title"><strong>${escapeHtml(share.title)}</strong><span class="my-share-id">${escapeHtml(share.id)}</span></div><div class="my-share-meta"><span>${escapeHtml(date)}</span><span>${share.visibility === "public" ? "비밀번호 없이 보기" : "비밀번호 입력"}</span></div></div><div class="my-share-actions"><button class="mini-button" data-action="open" data-id="${share.id}">열기</button><button class="mini-button" data-action="copy" data-id="${share.id}">복사</button><button class="mini-button danger" data-action="delete" data-id="${share.id}" data-title="${escapeAttr(share.title)}">삭제</button></div>`;
      refs.mySharesList.appendChild(item);
    }
  }

  function askDelete(id, title) {
    state.pendingDeleteId = id; state.pendingDeleteTitle = title || `공유 ${id}`; refs.deleteConfirmText.textContent = `“${state.pendingDeleteTitle}” 공유 링크를 삭제할까요? 삭제하면 복구할 수 없습니다.`; openDialog(refs.confirmDeleteDialog);
  }

  async function deleteShare(id) {
    refs.confirmDeleteBtn.disabled = true; refs.confirmDeleteBtn.textContent = "삭제 중...";
    try {
      const response = await fetch(`/api/share/${encodeURIComponent(id)}`, { method:"DELETE" }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "공유 링크를 삭제하지 못했습니다.");
      storageRemove(`junudae_draft_share_${id}`); closeDialog(refs.confirmDeleteDialog); showToast("공유 링크를 삭제했습니다.");
      if (state.shareId === id) { location.href = "/"; return; }
      await loadMyShares();
    } catch (error) { showToast(error.message); }
    finally { refs.confirmDeleteBtn.disabled = false; refs.confirmDeleteBtn.textContent = "삭제"; }
  }

  function sanitizeFileName(text) {
    const cleaned = String(text || "code").replace(/[\\/:*?"<>|\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,55);
    return `${cleaned || "code"}.png`;
  }
  function currentMessageFileName() { return sanitizeFileName(state.shareRecord?.title || refs.shareTitle.value || "code-share"); }
  function makeCodeFile() { return new File([editor.getValue()], currentMessageFileName(), { type:"image/png", lastModified:Date.now() }); }
  function updateMessageFileName() { refs.messageFileName.textContent = currentMessageFileName(); }
  function downloadCodePng() {
    const file = makeCodeFile(); const url = URL.createObjectURL(file); const link = document.createElement("a"); link.href = url; link.download = file.name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); showToast("PNG 확장자로 다운로드했습니다.");
  }
  async function shareCodeFile() {
    const file = makeCodeFile();
    try {
      if (!navigator.share || (navigator.canShare && !navigator.canShare({files:[file]}))) throw new Error("UNSUPPORTED");
      await navigator.share({ files:[file], title:"코드 공유", text:"받은 파일의 확장자를 .png에서 .txt로 변경해 주세요." });
    } catch (error) {
      if (error?.name === "AbortError") return;
      downloadCodePng(); showToast("이 브라우저는 파일 공유를 지원하지 않아 다운로드했습니다.");
    }
  }
  function markGuideSeen() { storageSet("junudae_message_guide_seen_v1", "1"); }
  function openMessageShareDialog() { updateMessageFileName(); openDialog(refs.messageShareDialog); }

  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char])); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g,"&#96;"); }

  editor.on("change", () => { updateStats(); if (state.languageMode === "auto" && !state.loading) scheduleDetection(); if (!state.loading) scheduleDraftSave(); });
  refs.languageTrigger.addEventListener("click", () => refs.languageMenu.hidden ? openLanguageMenu() : closeLanguageMenu());
  refs.languageSearch.addEventListener("input", () => renderLanguageOptions(refs.languageSearch.value));
  refs.languageOptions.addEventListener("click", (event) => { const button = event.target.closest("[data-language]"); if (button) chooseLanguage(button.dataset.language); });
  document.addEventListener("pointerdown", (event) => { if (!refs.languagePicker.contains(event.target)) closeLanguageMenu(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !refs.languageMenu.hidden) closeLanguageMenu(); });

  refs.copyBtn.addEventListener("click", async () => showToast(await copyText(editor.getValue()) ? "코드를 복사했습니다." : "복사하지 못했습니다."));
  refs.shareBtn.addEventListener("click", openShareDialog); refs.createShareBtn.addEventListener("click", createShare);
  refs.copyShareUrlBtn.addEventListener("click", async () => showToast(await copyText(refs.shareUrl.value) ? "공유 주소를 복사했습니다." : "복사하지 못했습니다."));
  refs.identityBtn.addEventListener("click", () => { updateIdentityUi(); openDialog(refs.identityDialog); });
  refs.profileChoices.addEventListener("click", (event) => { const button = event.target.closest("[data-profile]"); if (button) switchIdentity(button.dataset.profile); });
  refs.mySharesBtn.addEventListener("click", async () => { if (refs.mySharesBtn.disabled) { showToast("내 공유 링크를 보려면 로그인이 필요합니다."); return; } openDialog(refs.mySharesDialog); await loadMyShares(); });
  refs.mySharesList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]"); if (!button) return; const id = button.dataset.id;
    if (button.dataset.action === "open") location.href = `/share/${id}`;
    if (button.dataset.action === "copy") showToast(await copyText(new URL(`/share/${id}`, location.origin).href) ? "공유 주소를 복사했습니다." : "복사하지 못했습니다.");
    if (button.dataset.action === "delete") askDelete(id, button.dataset.title);
  });
  refs.deleteCurrentShareBtn.addEventListener("click", () => state.shareId && askDelete(state.shareId, state.shareRecord?.title));
  refs.cancelDeleteBtn.addEventListener("click", () => closeDialog(refs.confirmDeleteDialog));
  refs.confirmDeleteBtn.addEventListener("click", () => state.pendingDeleteId && deleteShare(state.pendingDeleteId));

  refs.messageShareBtn.addEventListener("click", () => {
    state.guideReturnToShare = false;
    if (storageGet("junudae_message_guide_seen_v1") === "1") openMessageShareDialog(); else openDialog(refs.messageGuideDialog);
  });
  refs.guideConfirmBtn.addEventListener("click", () => { markGuideSeen(); closeDialog(refs.messageGuideDialog); setTimeout(() => openMessageShareDialog(), 120); });
  refs.guideShareBtn.addEventListener("click", () => { markGuideSeen(); closeDialog(refs.messageGuideDialog); shareCodeFile(); });
  refs.messageInfoBtn.addEventListener("click", () => { state.guideReturnToShare = true; closeDialog(refs.messageShareDialog); setTimeout(() => openDialog(refs.messageGuideDialog), 110); });
  refs.messageCloseBtn.addEventListener("click", () => closeDialog(refs.messageShareDialog));
  refs.messageDownloadBtn.addEventListener("click", downloadCodePng); refs.deviceShareBtn.addEventListener("click", shareCodeFile);

  refs.logoutBtn.addEventListener("click", async () => { try { await fetch("/api/auth", {method:"DELETE"}); } finally { location.href = "/"; } });
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeDialog($(button.dataset.close))));

  async function init() {
    renderLanguageOptions(); updateStats(); updateLanguageUi(); updateAccessUi();
    await Promise.all([loadSession(), loadIdentity()]);
    if (state.shareId) await loadSharedCode(); else if (!restoreDraft()) runDetection();
    editor.refresh(); editor.focus(); updateIdentityUi();
  }
  init();
})();
