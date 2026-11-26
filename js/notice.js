// Legal notice gate: shows the notice, remembers "I Agree", locks/unlocks the app. Text comes from the notice constant.

const NOTICE_BODY = ACM_CONFIG.notice;   // text lives in config/legal-notice.txt
const AGREE_KEY = ACM_CONFIG.storage.agreed;
const noticeTextEl = document.getElementById('noticeText');
const noticeGate = document.getElementById('noticeGate');
const exitScreen = document.getElementById('exitScreen');
const appRoot = document.getElementById('appRoot');
noticeTextEl.textContent = NOTICE_BODY;

function hasAgreed(){
  try { return localStorage.getItem(AGREE_KEY) === '1'; } catch(e){ return false; }
}
function setAgreed(){
  try { localStorage.setItem(AGREE_KEY, '1'); } catch(e){}
}
function unlockApp(){
  noticeGate.classList.add('hidden');
  exitScreen.classList.remove('show');
  if(appRoot){ appRoot.classList.remove('locked'); appRoot.style.visibility=''; appRoot.style.pointerEvents=''; }
  if(window.ACMProfiles){ try{ window.ACMProfiles.start(); }catch(e){} }
}
function lockApp(){
  if(appRoot){ appRoot.classList.add('locked'); }
  noticeGate.classList.remove('hidden');
}
function showExit(){
  noticeGate.classList.add('hidden');
  exitScreen.classList.add('show');
  if(appRoot){ appRoot.classList.add('locked'); }
  try { window.close(); } catch(e){}
}
document.getElementById('noticeAgree').onclick = function(){ setAgreed(); unlockApp(); };
document.getElementById('noticeExit').onclick = function(){ showExit(); };
document.getElementById('reopenNotice').onclick = function(){
  exitScreen.classList.remove('show');
  lockApp();
};
if(hasAgreed()){ unlockApp(); } else { lockApp(); }
