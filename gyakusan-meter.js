// === CORE: 逆算メーターの計算ロジック ===
var UNIS = {
ompu: { name: '大阪医科薬科大学', goal: 67.5, exam: '2027-02-10', examLabel: '2027年2月10日', page: '/universities/ompu'},
kmu: { name: '関西医科大学', goal: 67.5, exam: '2027-02-02', examLabel: '2027年2月2日', page: '/universities/kmu'},
kindai: { name: '近畿大学', goal: 65.0, exam: '2027-01-31', examLabel: '2027年1月31日', page: '/universities/kindai'},
hyo: { name: '兵庫医科大学', goal: 62.5, exam: '2027-02-04', examLabel: '2027年2月4日', page: '/universities/hyo-med'}
};
var BASE_W = { 1: 20, 2: 35, 3: 45};
var DAY_MS = 86400000;
function dOf(y, m, d) { return new Date(y, m - 1, d);}
function parseDate(s) { var p = s.split('-'); return dOf(parseInt(p[0], 10), parseInt(p[1], 10), parseInt(p[2], 10));}
function addYears(date, n) { return dOf(date.getFullYear() + n, date.getMonth() + 1, date.getDate());}
function daysBetween(a, b) { return Math.round((b - a) / DAY_MS);}
// 学年区間を作る。gradeOffset: 0=高3・既卒 / 1=高2 / 2=高1。区切りは4月1日、最後は試験日。
function buildSegments(today, examDate, gradeOffset) {
var segs = [];
var curGrade = 3 - gradeOffset;
if (gradeOffset === 0) {
segs.push({ grade: 3, label: '受験までの期間', from: today, to: examDate, days: daysBetween(today, examDate)});
return segs;
}
var startYear = examDate.getFullYear() - gradeOffset - 1; // 現在の学年が始まった年の4月1日
var from = today;
for (var i = 0; i <= gradeOffset; i++) {
var g = curGrade + i;
var to = (i === gradeOffset)? examDate: dOf(startYear + 1 + i, 4, 1);
segs.push({ grade: g, label: (i === 0)? ('高' + g + 'の残り'): ('高' + g), from: from, to: to, days: daysBetween(from, to)});
from = to;
}
return segs;
}
function studyDays(days, restPerWeek, reservePct) {
var weekly = Math.floor(days * restPerWeek / 7);
var reserve = Math.round((days - weekly) * reservePct / 100);
var s = days - weekly - reserve;
return s < 1? 1: s;
}
function policyOf(low, high) {
if (high <= 8) return 'normal';
if (low > 12) return 'over';
if (high > 12) return 'cap';
return 'warn';
}
// opts: {uni, gradeOffset, start, rest, reserve, today}
function compute(opts) {
var u = UNIS[opts.uni];
var examDate = addYears(parseDate(u.exam), opts.gradeOffset);
var gap = Math.max(0, u.goal - opts.start);
var totalLow = gap * 120, totalHigh = gap * 200;
var segs = buildSegments(opts.today, examDate, opts.gradeOffset);
var startYear = examDate.getFullYear() - opts.gradeOffset - 1;
var fullYear = daysBetween(dOf(startYear, 4, 1), dOf(startYear + 1, 4, 1));
var effSum = 0;
for (var i = 0; i < segs.length; i++) {
var w = BASE_W[segs[i].grade];
if (opts.gradeOffset > 0 && i === 0) { w = w * segs[i].days / fullYear;}
segs[i].effW = w;
effSum += w;
}
var totalDays = 0, totalStudy = 0;
for (var j = 0; j < segs.length; j++) {
var share = (effSum > 0)? segs[j].effW / effSum: 0;
segs[j].share = share;
segs[j].allocLow = totalLow * share;
segs[j].allocHigh = totalHigh * share;
segs[j].study = studyDays(segs[j].days, opts.rest, opts.reserve);
segs[j].dailyLow = segs[j].allocLow / segs[j].study;
segs[j].dailyHigh = segs[j].allocHigh / segs[j].study;
segs[j].policy = policyOf(segs[j].dailyLow, segs[j].dailyHigh);
totalDays += segs[j].days;
totalStudy += segs[j].study;
}
return { uni: u, examDate: examDate, gap: gap, totalLow: totalLow, totalHigh: totalHigh, segments: segs, totalDays: totalDays, totalStudy: totalStudy};
}
// === END CORE ===

(function() {
var current = 'hyo';
var gradeOffset = 1;
var rest = 1;
var reserve = 5;
function el(id) { return document.getElementById(id);}
function fmtH(n) { return Math.round(n).toLocaleString('ja-JP');}
function fmtD(n) { return (Math.round(n * 10) / 10).toFixed(1);}
function fmtDev(n) { return (Math.round(n * 10) / 10).toString().replace(/\.0$/, '');}
function dateLabel(d) { return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';}
var GRADE_NAMES = ['高3・既卒', '高2', '高1'];
var lastText = '';
var shareText = '';

function dailyText(seg) {
if (seg.policy === 'normal' || seg.policy === 'warn') { return '1日 ' + fmtD(seg.dailyLow) + '〜' + fmtD(seg.dailyHigh) + '時間';}
if (seg.policy === 'cap') { return '1日 ' + fmtD(seg.dailyLow) + '時間〜（12時間を超える分は表示していません）';}
return '1日あたりは表示しません（12時間を超える計算のため）';
}

function shareDailyText(seg) {
if (seg.policy === 'normal' || seg.policy === 'warn') { return '1日 ' + fmtD(seg.dailyLow) + '〜' + fmtD(seg.dailyHigh) + '時間';}
if (seg.policy === 'cap') { return '1日 ' + fmtD(seg.dailyLow) + '時間〜（12時間を超える分は表示していません）';}
return '1日あたりの量は、12時間を超える計算になるため表示していません';
}

function update() {
var u = UNIS[current];
var startVal = parseFloat(el('dev-num').value);
if (isNaN(startVal)) { startVal = 50;}
if (startVal < 35) startVal = 35;
if (startVal > 70) startVal = 70;
var today = new Date(); today.setHours(0, 0, 0, 0);
var r = compute({ uni: current, gradeOffset: gradeOffset, start: startVal, rest: rest, reserve: reserve, today: today});
el('uni-summary').textContent = u.name + '｜ゴールは河合塾ボーダー偏差値 ' + fmtDev(u.goal) + '。1次試験は' + dateLabel(r.examDate) + 'です。';
el('res-title').textContent = u.name + '｜ゴール偏差値 ' + fmtDev(u.goal) + 'まで';
// ゲージ（35〜70の物差し）
var pos = function(v) { return Math.max(0, Math.min(100, (v - 35) / 35 * 100));};
el('gauge-start').style.left = pos(startVal) + '%';
el('gauge-goal').style.left = pos(u.goal) + '%';
el('gauge-start-label').textContent = '今 ' + fmtDev(startVal);
el('gauge-goal-label').textContent = 'ゴール ' + fmtDev(u.goal);
el('gauge-start-label').style.left = pos(startVal) + '%';
el('gauge-goal-label').style.left = pos(u.goal) + '%';
// 今とゴールが近い（差5ポイント以内）ときは、文字が重ならないようゴールを下段にずらす
var stagger = Math.abs(pos(startVal) - pos(u.goal)) < 15;
el('gauge-start-label').style.top = '1.6rem';
el('gauge-goal-label').style.top = stagger ? '2.95rem' : '1.6rem';
el('gauge-box').style.marginBottom = stagger ? '4.8rem' : '2.5rem';
if (r.gap <= 0) {
el('gs-main').style.display = 'none';
el('gs-done').style.display = '';
el('gs-done-text').textContent = '偏差値の上では、' + u.name + 'の合格可能性50％ライン（' + fmtDev(u.goal) + '）以上にいます。次は、点数の上で合格最低点まであと何点かを測る段階です。';
buildTexts(r, startVal, true);
return;
}
el('gs-done').style.display = 'none';
el('gs-main').style.display = '';
el('res-gap').textContent = fmtDev(r.gap);
el('res-total').textContent = fmtH(r.totalLow) + '〜' + fmtH(r.totalHigh);
el('res-days').innerHTML = '試験まで ' + r.totalDays + '日<br><span class="text-sm font-bold text-gray-600">勉強できる日 約' + r.totalStudy + '日</span>';
var html = '';
var anyWarn = false, anyHard = false;
for (var i = 0; i < r.segments.length; i++) {
var s = r.segments[i];
if (s.policy === 'warn') anyWarn = true;
if (s.policy === 'cap' || s.policy === 'over') anyHard = true;
var badge = '';
var style = '';
if (s.policy === 'warn') { badge = '<span class="text-xs font-bold px-2 py-0.5 rounded-full" style="background:#FFF3D6;color:#8A6D1A;">注意</span>'; style = 'border:1px solid #E8CE8A;';}
if (s.policy === 'cap' || s.policy === 'over') { badge = '<span class="text-xs font-bold px-2 py-0.5 rounded-full" style="background:#FDF0EC;color:#A93226;">組み立て直し</span>'; style = 'border:1px solid #E5B4A8;';}
html += '<div class="card p-5" style="' + style + '">'
+ '<p class="font-black text-main-dark mb-1">' + s.label + ' ' + badge + '</p>'
+ '<p class="text-xs text-gray-500 mb-2">' + dateLabel(s.from) + '〜' + dateLabel(new Date(s.to.getTime() - DAY_MS)) + '｜' + s.days + '日（勉強できる日 約' + s.study + '日）</p>'
+ '<p class="text-sm">配分 <span class="font-bold">' + fmtH(s.allocLow) + '〜' + fmtH(s.allocHigh) + '時間</span></p>'
+ '<p class="font-black text-main-dark">' + dailyText(s) + '</p>'
+ (s.policy === 'warn' ? '<p class="text-xs font-bold mt-1" style="color:#8A6D1A;">学校のある日には収まりにくい量です</p>' : '')
+ '</div>';
}
el('gs-segments').innerHTML = html;
var adv = el('gs-advice');
if (anyHard) {
adv.style.display = '';
adv.style.background = '#FDF0EC'; adv.style.border = '1px solid #E5B4A8';
el('gs-advice-title').textContent = 'この計画は、組み立て直しが必要な量です';
el('gs-advice-title').style.color = '#A93226';
el('gs-advice-text').textContent = '1日12時間を超える区間があります。今の志望校と開始時期のままでは、続けるのが難しい量です。選択肢は、併願の組み替えで届く組み合わせに見直すことと、期間の取り方そのものを設計し直すことです。どちらも早いほど選択肢が残ります。組み立て直すのが塾の仕事です。無料相談で、この結果をもとに一緒に設計します。';
} else if (anyWarn) {
adv.style.display = '';
adv.style.background = '#FFF7E0'; adv.style.border = '1px solid #E8CE8A';
el('gs-advice-title').textContent = '学校のある日には収まりにくい量が含まれます';
el('gs-advice-title').style.color = '#8A6D1A';
el('gs-advice-text').textContent = '1日8時間を超える区間があります。平日にこの量を確保するのは簡単ではありません。休日の使い方と合わせて、週の組み立てを見直す段階です。無料相談では、この結果をもとに最初の一か月の進め方まで一緒に設計します。';
} else {
adv.style.display = 'none';
}
buildTexts(r, startVal, false);
}

function buildTexts(r, startVal, done) {
var u = UNIS[current];
var lines = [], slines = [];
lines.push('');
lines.push('志望校：' + u.name + '（ゴール偏差値 ' + fmtDev(u.goal) + '）');
lines.push('学年：' + GRADE_NAMES[gradeOffset] + '／今の偏差値：' + fmtDev(startVal) + '（河合塾・全統模試）');
slines.push(u.name + '（ゴール偏差値' + fmtDev(u.goal) + '）までの「合格までの時間」を計算しました。');
slines.push('今の偏差値は' + fmtDev(startVal) + 'です。');
if (done) {
lines.push('偏差値の上では、合格可能性50％ライン以上です。');
slines.push('偏差値の上では、合格可能性50％ライン以上です。次は点数で距離を測ります。');
} else {
lines.push('偏差値のギャップ：' + fmtDev(r.gap));
lines.push('必要な総時間の目安：' + fmtH(r.totalLow) + '〜' + fmtH(r.totalHigh) + '時間（経験則による下限の目安）');
lines.push('前提：週' + rest + '日休む・行事や体調不良などの予備' + reserve + '％／試験まで' + r.totalDays + '日・勉強できる日 約' + r.totalStudy + '日');
slines.push('ギャップ' + fmtDev(r.gap) + 'を埋める時間の目安は、' + fmtH(r.totalLow) + '〜' + fmtH(r.totalHigh) + '時間です。');
for (var i = 0; i < r.segments.length; i++) {
var s = r.segments[i];
if (s.policy === 'over') {
lines.push('・' + s.label + '：配分 ' + fmtH(s.allocLow) + '〜' + fmtH(s.allocHigh) + '時間。' + shareDailyText(s));
slines.push(s.label + 'の' + shareDailyText(s) + '。');
} else {
lines.push('・' + s.label + '：配分 ' + fmtH(s.allocLow) + '〜' + fmtH(s.allocHigh) + '時間、' + shareDailyText(s));
slines.push(s.label + 'は ' + shareDailyText(s) + '。');
}
}
}
lines.push('▼ 偏差値から見る逆算メーター（無料・登録不要）');
lines.push('https://meducate.oubijuku.com/gyakusan?u=' + current + '&via=share');
lines.push('※予備校の経験則をもとにした目安です。合格を約束するものではありません。');
lastText = lines.join('\n');
slines.push('▼ 偏差値から見る逆算メーター（無料・登録不要）');
shareText = slines.join('\n');
el('gs-share-line').href = 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent('https://meducate.oubijuku.com/gyakusan?u=' + current + '&via=share') + '&text=' + encodeURIComponent(shareText);
}

function setGroup(selector, attr, val) {
var btns = document.querySelectorAll(selector);
for (var i = 0; i < btns.length; i++) { btns[i].classList.toggle('active', btns[i].getAttribute(attr) === String(val));}
}
var ubtns = document.querySelectorAll('.uni-btn[data-u]');
for (var i = 0; i < ubtns.length; i++) { ubtns[i].addEventListener('click', function() { current = this.getAttribute('data-u'); setGroup('.uni-btn[data-u]', 'data-u', current); update();});}
var GRADE_NOTES = [
'高3・既卒：2027年度入試（2027年2月）までの期間で計算します。',
'高2：2028年度入試が対象です。日程はまだ公表されていないため、2027年度と同じ時期として計算します。',
'高1：2029年度入試が対象です。日程はまだ公表されていないため、2027年度と同じ時期として計算します。'
];
var gbtns = document.querySelectorAll('.grade-btn');
for (var gi = 0; gi < gbtns.length; gi++) { gbtns[gi].addEventListener('click', function() { gradeOffset = parseInt(this.getAttribute('data-g'), 10) || 0; setGroup('.grade-btn', 'data-g', gradeOffset); el('grade-note').textContent = GRADE_NOTES[gradeOffset]; update();});}
var rbtns = document.querySelectorAll('.rest-btn');
for (var ri = 0; ri < rbtns.length; ri++) { rbtns[ri].addEventListener('click', function() { rest = parseInt(this.getAttribute('data-rest'), 10) || 0; setGroup('.rest-btn', 'data-rest', rest); update();});}
var sbtns = document.querySelectorAll('.res-btn');
for (var si = 0; si < sbtns.length; si++) { sbtns[si].addEventListener('click', function() { reserve = parseInt(this.getAttribute('data-res'), 10) || 0; setGroup('.res-btn', 'data-res', reserve); update();});}
var num = el('dev-num'), slider = el('dev-slider');
num.addEventListener('input', function() { var n = parseFloat(num.value); slider.value = isNaN(n)? 50: Math.max(35, Math.min(70, n)); update();});
slider.addEventListener('input', function() { num.value = slider.value; update();});
function copyText(text, doneEl) {
function done() { doneEl.style.display = '';}
if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, function() { fallback(); done();});}
else { fallback(); done();}
function fallback() { var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy');} catch (e) {} document.body.removeChild(ta);}
}
el('gs-copy').addEventListener('click', function() { copyText(lastText, el('gs-copy-done'));});
el('gs-share-copy').addEventListener('click', function() { copyText(lastText, el('gs-share-done'));});
var q = null, qg = null;
try { var params = new URLSearchParams(window.location.search); q = params.get('u'); qg = params.get('g'); } catch (e) { q = null; }
if (q && UNIS[q]) { current = q; }
if (qg !== null && ['0', '1', '2'].indexOf(qg) >= 0) { gradeOffset = parseInt(qg, 10); el('grade-note').textContent = GRADE_NOTES[gradeOffset]; }
setGroup('.uni-btn[data-u]', 'data-u', current);
setGroup('.grade-btn', 'data-g', gradeOffset);
setGroup('.rest-btn', 'data-rest', rest);
setGroup('.res-btn', 'data-res', reserve);
update();
})();
