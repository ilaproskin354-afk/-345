
const START_BALANCE = 10000000;
const LEVELS = [
  {level:1, xp:0, unlocks:[]},
  {level:2, xp:100, unlocks:["skin:neon"]},
  {level:3, xp:300, unlocks:["bonus:freeSpin"]},
  {level:4, xp:700, unlocks:["skin:cyber-gold"]},
  {level:5, xp:1500, unlocks:["bonus:promoPack"]}
];

function uid(){ return Math.random().toString(36).slice(2,9); }
function load(){ try{ return JSON.parse(localStorage.getItem('cyber_state')||'{}'); }catch(e){ return {}; } }
function save(s){ localStorage.setItem('cyber_state', JSON.stringify(s)); }

const state = load();
state.users = state.users || [];
state.current = state.current || null;
state.logs = state.logs || [];
state.promosUsed = state.promosUsed || {};
state.skins = state.skins || ["default"];
state.availableSkins = state.availableSkins || ["default","neon","cyber-gold"];
state.quests = state.quests || [
  {id:1, text:"Сыграйте 5 раз", progress:0, goal:5, reward:50000, done:false},
  {id:2, text:"Выиграйте 3 раза", progress:0, goal:3, reward:100000, done:false},
  {id:3, text:"Активируйте промокод", progress:0, goal:1, reward:25000, done:false}
];
state.xp = state.xp || 0;
state.level = state.level || 1;

if(state.users.length===0){
  const u = {id:uid(), name:"Игрок", balance: START_BALANCE, xp:0, level:1, skins:["default"]};
  state.users.push(u);
  state.current = u.id;
  log("Создан гость с балансом " + format(START_BALANCE));
  save(state);
}

function currentUser(){ return state.users.find(u=>u.id===state.current); }
function format(n){ return n.toLocaleString('ru-RU'); }
function log(txt){ state.logs.unshift({id:Date.now(), txt}); if(state.logs.length>200) state.logs.pop(); save(state); }

const app = document.getElementById('app');
function render(){
  const u = currentUser();
  app.innerHTML = `
  <div class="container">
    <div class="header">
      <div class="brand"><div class="logo">CC</div><div><div class="title">CyberCasino — Demo</div><div class="small">Киберпанк тема · Оффлайн</div></div></div>
      <div class="controls">
        <div class="balance">${u.name}: <span class="glow-text">${format(u.balance)} ₽</span></div>
        <button class="button" onclick="openShop()">Магазин</button>
        <button class="button" onclick="openAdmin()">Админ</button>
      </div>
    </div>

    <div class="grid">
      <main class="panel">
        <div class="games card">
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <h3>Слоты</h3>
              <div>Уровень <strong>${u.level}</strong> · XP <strong>${state.xp}</strong></div>
            </div>
            <div class="slot-reels win-anim" id="slotArea">
              <div class="reel" id="r1">?</div>
              <div class="reel" id="r2">?</div>
              <div class="reel" id="r3">?</div>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;align-items:center">
              <input id="bet" class="input" type="number" value="10000" />
              <button class="spin-btn" onclick="spin()">SPIN</button>
              <button class="button" onclick="freeSpin()">FREE</button>
            </div>
            <div id="announce" style="margin-top:10px;color:var(--neon1);font-weight:800"></div>
          </div>

          <div class="card" style="margin-top:10px">
            <h4>Квесты</h4>
            <div>${renderQuests()}</div>
          </div>

        </div>
      </main>

      <aside class="panel">
        <div class="card">
          <h4>Магазин скинов</h4>
          <div class="shop-list" id="shopList">${renderShop()}</div>
          <h4 style="margin-top:12px">История</h4>
          <div class="log" id="logArea">${state.logs.map(l=>'<div>'+new Date(l.id).toLocaleString()+': '+l.txt+'</div>').join('')}</div>
          <div class="admin-area" id="adminArea"></div>
        </div>
      </aside>
    </div>

    <div class="footer">Демо-версия офлайн — все данные в localStorage</div>
  </div>
  `;
  attachSkin(u);
  attachQuestHandlers();
  save(state);
}

function attachSkin(user){
  const skin = user.skins[user.skins.length-1] || "default";
  if(skin==="neon"){ document.documentElement.style.setProperty('--neon1','#ff0066'); document.documentElement.style.setProperty('--neon2','#00f0ff'); }
  else if(skin==="cyber-gold"){ document.documentElement.style.setProperty('--neon1','#ffd166'); document.documentElement.style.setProperty('--neon2','#7c3aed'); }
  else { document.documentElement.style.setProperty('--neon1','#ff00c8'); document.documentElement.style.setProperty('--neon2','#00f0ff'); }
}

function renderShop(){
  const skins = state.availableSkins;
  return skins.map(s=>{
    const price = s==="default"?0:(s==="neon"?500000:1000000);
    return `<div class="shop-item"><div style="display:flex;gap:8px;align-items:center"><div class="skin-preview" style="background:linear-gradient(90deg,var(--neon1),var(--neon2))">${s[0].toUpperCase()}</div><div><div style="font-weight:800">${s}</div><div class="small">Цена: ${price?price+' ₽':'бесплатно'}</div></div></div><div><button class="btn-neon" onclick="buySkin('${s}',${price})">Купить</button></div></div>`;
  }).join('');
}

function buySkin(name, price){
  const u = currentUser();
  if(price>0 && u.balance < price){ alert('Недостаточно средств'); return; }
  if(price>0) u.balance -= price;
  if(!u.skins.includes(name)) u.skins.push(name);
  state.xp += 10;
  checkLevel();
  log('Куплен скин '+name);
  render();
}

function openShop(){ alert('Магазин открыт в боковой панели'); }

function spin(){
  const bet = Number(document.getElementById('bet').value) || 10000;
  const u = currentUser();
  if(u.balance < bet){ alert('Недостаточно средств'); return; }
  const symbols = ['🍒','🍋','🔔','🍉','⭐','7','💎'];
  const r1 = symbols[Math.floor(Math.random()*symbols.length)];
  const r2 = symbols[Math.floor(Math.random()*symbols.length)];
  const r3 = symbols[Math.floor(Math.random()*symbols.length)];
  document.getElementById('r1').innerText = r1;
  document.getElementById('r2').innerText = r2;
  document.getElementById('r3').innerText = r3;
  const win = (r1===r2 && r2===r3) ? bet*15 : (r1===r2||r2===r3||r1===r3) ? bet*2 : 0;
  u.balance += (win - bet);
  state.xp += 10;
  updateQuests(win>0);
  checkLevel();
  const announce = document.getElementById('announce');
  if(win>0){
    announce.innerText = 'WIN: ' + format(win) + ' ₽';
    celebrateWin();
    log('Спин выигрыш ' + format(win));
  } else {
    announce.innerText = 'Lose';
    log('Спин проигрыш ' + format(bet));
  }
  render();
}

function freeSpin(){
  const u = currentUser();
  if(u.bonusFreeSpin){
    u.bonusFreeSpin = false;
    document.getElementById('bet').value = 0;
    spin();
  } else {
    alert('Нет свободного спина');
  }
}

function celebrateWin(){
  const area = document.getElementById('slotArea');
  area.classList.add('pulse');
  setTimeout(()=> area.classList.remove('pulse'), 1000);
  const burst = document.createElement('div');
  burst.className = 'win-burst';
  burst.innerHTML = '<div style="font-size:28px;animation:pop 0.9s ease-out; color:var(--neon1)">✦✦✦</div>';
  area.appendChild(burst);
  setTimeout(()=> burst.remove(), 900);
}

function renderQuests(){
  return state.quests.map(q=>{
    const status = q.done ? '✅' : (q.progress + '/' + q.goal);
    return `<div class="quest"><div style="display:flex;justify-content:space-between"><div>${q.text}</div><div>${status}</div></div></div>`;
  }).join('');
}

function updateQuests(win){
  state.quests.forEach(q=>{
    if(q.done) return;
    if(q.id===1) q.progress++;
    if(q.id===2 && win) q.progress++;
    if(q.id===3){} 
    if(q.progress>=q.goal){ q.done=true; state.users.forEach(u=>{ if(u.id===state.current){ u.balance += q.reward; log('Квест выполнен: '+q.text+' +'+format(q.reward)); } }); }
  });
  save(state);
}

function attachQuestHandlers(){}

function checkLevel(){
  for(let i=LEVELS.length-1;i>=0;i--){
    if(state.xp >= LEVELS[i].xp){
      const lvl = LEVELS[i].level;
      if(state.level !== lvl){ state.level = lvl; currentUser().level = lvl; grantUnlocks(LEVELS[i].unlocks); log('Новый уровень: '+lvl); }
      break;
    }
  }
}

function grantUnlocks(list){
  list.forEach(it=>{
    if(it.startsWith('skin:')){
      const s = it.split(':')[1];
      if(!currentUser().skins.includes(s)) currentUser().skins.push(s);
      log('Скин открыт: '+s);
    }
    if(it.startsWith('bonus:')){
      const b = it.split(':')[1];
      if(b==='freeSpin') currentUser().bonusFreeSpin = true;
      if(b==='promoPack') {}
      log('Бонус получен: '+b);
    }
  });
  render();
}

function openAdmin(){
  const admin = document.getElementById('adminArea');
  admin.innerHTML = `<div><strong>Админ</strong></div><div style="margin-top:8px"><button class="button" onclick="adminRefill()">Пополнить всех до 10M</button> <button class="button" onclick="adminCreatePromo()">Создать промо</button></div>`;
}

function adminRefill(){
  const p = prompt('Введите пароль:');
  if(p !== 'admin-2025'){ alert('Неверный пароль'); return; }
  state.users.forEach(u=> u.balance = START_BALANCE);
  log('Админ пополнил балансы');
  render();
}

function adminCreatePromo(){
  const code = prompt('Код промо:','PROMO'+Math.floor(Math.random()*9999));
  const amount = Number(prompt('Сумма', '50000')) || 50000;
  if(code){ log('Создан админ-промо ' + code + ' +' + amount); alert('Промо создан (локально). Код: ' + code); }
}

async function redeemPromo(){
  const code = prompt('Введите промокод:');
  if(!code) return;
  try{
    const res = await fetch('promos.json').then(r=>r.json());
    const p = res.find(x=> x.code === code.trim().toUpperCase());
    if(p && !state.promosUsed[p.code]){
      currentUser().balance += p.amount;
      state.promosUsed[p.code] = true;
      state.quests.forEach(q=>{ if(q.id===3){ q.progress++; if(q.progress>=q.goal){ q.done=true; currentUser().balance += q.reward; log('Квест выполнен (promo): '+q.text+' +'+format(q.reward)); } } });
      log('Промокод применён: ' + p.code + ' +' + format(p.amount));
      render();
      alert('Промо применён: +' + format(p.amount));
      return;
    }
  }catch(e){ console.warn(e); }
  alert('Неверный или уже использованный промокод');
}

function createAccount(){ const name = prompt('Никнейм:'); if(!name) return; const u = {id:uid(), name, balance: START_BALANCE, xp:0, level:1, skins:["default"]}; state.users.push(u); state.current = u.id; log('Создан аккаунт ' + name); render(); }
function switchAccount(id){ state.current = id; render(); }

window.spin = spin;
window.openShop = openShop;
window.buySkin = buySkin;
window.openAdmin = openAdmin;
window.freeSpin = freeSpin;
window.redeemPromo = redeemPromo;
window.createAccount = createAccount;
window.switchAccount = switchAccount;
window.adminRefill = adminRefill;
window.adminCreatePromo = adminCreatePromo;

function renderAccounts(){ return state.users.map(u=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px;border-radius:6px;border:1px solid rgba(255,255,255,0.02);margin-top:6px"><div>${u.name} · ${format(u.balance)}</div><div><button class="btn-outline" onclick="switchAccount('${u.id}')">Войти</button></div></div>`).join(''); }
function attachAccountsToShop(){ const shop = document.getElementById('shopList'); if(!shop) return; shop.insertAdjacentHTML('beforeend','<h4>Аккаунты</h4>'+renderAccounts()); shop.insertAdjacentHTML('beforeend','<div style="margin-top:8px"><button class="button" onclick="createAccount()">Создать аккаунт</button></div>'); }

window.addEventListener('DOMContentLoaded', ()=>{ render(); setTimeout(()=> attachAccountsToShop(), 300); });
