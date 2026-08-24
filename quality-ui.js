const loading = document.querySelector("#appLoading");
const fatalStatus = document.querySelector("#fatalStatus");
const main = document.querySelector("#main-content");

function finishLoading() {
  document.body.removeAttribute("aria-busy");
  if (loading) loading.hidden = true;
}

function enhanceEmptyStates() {
  document.querySelectorAll("td[colspan]").forEach((cell) => {
    cell.classList.add("empty-state");
    cell.setAttribute("role", "status");
  });
}

function showFatalError(message) {
  finishLoading();
  if (!fatalStatus) return;
  fatalStatus.hidden = false;
  fatalStatus.classList.add("global-error");
  fatalStatus.textContent = `應用程式發生錯誤：${message}。你仍可重新整理頁面；瀏覽器中的個人資料不會因此自動刪除。`;
}

window.addEventListener("error", (event) => {
  showFatalError(event.error?.message || event.message || "未知錯誤");
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  showFatalError(reason?.message || String(reason || "未知錯誤"));
});

window.addEventListener(
  "load",
  () => {
    finishLoading();
    enhanceEmptyStates();
  },
  { once: true },
);

if (main) {
  const observer = new MutationObserver(enhanceEmptyStates);
  observer.observe(main, { childList: true, subtree: true });
}

document.querySelector("#printProgress")?.addEventListener("click", () => window.print());
document.querySelector("#cancelCourseEdit2")?.addEventListener("click", () => {
  document.querySelector("#courseDialog")?.close();
});
