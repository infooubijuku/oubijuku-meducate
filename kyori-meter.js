// === CORE: 距離メーターの計算ロジック ===
    var UNIS = {
        ompu: {
            name: '大阪医科薬科大学', total: 400, min: 287, minLabel: '正規合格者最低点',
            firstOnly: false, extra: 0, page: '/universities/ompu', exam: '2027-02-10', examLabel: '2027年2月10日',
            summary: '大阪医科薬科大学｜2026年度 一般選抜・前期の正規合格者最低点は287点／400点です。',
            subjects: [
                { key: 'eng', label: '英語', max: 100, color: '#E8862E' },
                { key: 'math', label: '数学', max: 100, color: '#2A9D8F' },
                { key: 'sci', label: '理科（2科目合計）', max: 200, color: '#1D5FA8' }
            ]
        },
        kmu: {
            name: '関西医科大学', total: 500, min: 296, minLabel: '正規合格者最低点',
            firstOnly: false, extra: 0, page: '/universities/kmu', exam: '2027-02-02', examLabel: '2027年2月2日',
            summary: '関西医科大学｜2026年度 一般選抜・前期の正規合格者最低点は296点／500点です。',
            subjects: [
                { key: 'eng', label: '英語', max: 150, color: '#E8862E' },
                { key: 'math', label: '数学', max: 150, color: '#2A9D8F' },
                { key: 'sci', label: '理科（2科目合計）', max: 200, color: '#1D5FA8' }
            ]
        },
        kindai: {
            name: '近畿大学', total: 400, min: 248, minLabel: '1次合格最低点',
            firstOnly: true, extra: 0, page: '/universities/kindai', exam: '2027-01-31', examLabel: '2027年1月31日',
            summary: '近畿大学｜2026年度 一般入試・前期A日程の1次合格最低点は248点／400点です。このメーターでは「1次合格までの距離」を表示します。',
            subjects: [
                { key: 'eng', label: '英語', max: 100, color: '#E8862E' },
                { key: 'math', label: '数学', max: 100, color: '#2A9D8F' },
                { key: 'sci', label: '理科（2科目合計）', max: 200, color: '#1D5FA8' }
            ]
        },
        hyo: {
            name: '兵庫医科大学', total: 630, min: 417.5, minLabel: '正規合格者最低点',
            firstOnly: false, extra: 130, page: '/universities/hyo-med', exam: '2027-02-04', examLabel: '2027年2月4日',
            summary: '兵庫医科大学｜2026年度 一般選抜Aの正規合格者最低点は417.5点／630点です。学科（500点）のほかに、小論文50点と面接・調査書等80点が入ります。',
            subjects: [
                { key: 'eng', label: '英語', max: 150, color: '#E8862E' },
                { key: 'math', label: '数学', max: 150, color: '#2A9D8F' },
                { key: 'sci', label: '理科（2科目合計）', max: 200, color: '#1D5FA8' }
            ]
        }
    };
    function fmt(n) {
        var r = Math.round(n * 10) / 10;
        return (Math.abs(r - Math.round(r)) < 0.0001) ? String(Math.round(r)) : r.toFixed(1);
    }
    function subjectScore(max, rate) { return max * rate / 100; }
    // 不足分を「満点までの伸びしろ」に比例して配分し、目標点の例を返す
    function allocateTargets(cur, max, targetTotal) {
        var t = cur.slice();
        var sum = cur.reduce(function(a, b) { return a + b; }, 0);
        var need = targetTotal - sum;
        if (need <= 0) return t;
        for (var iter = 0; iter < 20 && need > 0.0001; iter++) {
            var heads = [], H = 0;
            for (var i = 0; i < cur.length; i++) { heads[i] = Math.max(0, max[i] - t[i]); H += heads[i]; }
            if (H <= 0) break;
            var used = 0;
            for (var j = 0; j < cur.length; j++) {
                var add = Math.min(heads[j], need * heads[j] / H);
                t[j] += add; used += add;
            }
            need -= used;
            if (used <= 0) break;
        }
        return t;
    }
    // === END CORE ===

    (function() {
        var current = 'ompu';
        var keys = ['eng', 'math', 'sci'];
        function el(id) { return document.getElementById(id); }
        function uni() { return UNIS[current]; }

        function setUniversity(key) {
            if (!UNIS[key]) key = 'ompu';
            current = key;
            var u = uni();
            var btns = document.querySelectorAll('.uni-btn[data-u]');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('active', btns[i].getAttribute('data-u') === key);
            }
            el('uni-summary').textContent = u.summary;
            for (var j = 0; j < 3; j++) {
                el('max-' + keys[j]).textContent = '／' + u.subjects[j].max + '点満点';
            }
            el('hyo-extra').style.display = (key === 'hyo') ? '' : 'none';
            el('res-title').textContent = u.name + '｜' + u.minLabel + ' ' + fmt(u.min) + '点／' + u.total + '点（2026年度）';
            el('res-min-label').textContent = u.firstOnly ? '1次合格最低点（2026年度）' : '合格最低点（2026年度）';
            el('res-gap-label').textContent = u.firstOnly ? '1次最低点までの不足' : '最低点までの不足';
            el('exit-uni').setAttribute('href', u.page);
            el('exit-uni-label').textContent = u.name + 'のページを見る';
            update();
        }

        function readRate(key) {
            var v = el('rate-' + key).value;
            if (v === '' || v === null) return null;
            var n = parseFloat(v);
            if (isNaN(n)) return null;
            if (n < 0) n = 0;
            if (n > 100) n = 100;
            return n;
        }

        function update() {
            var u = uni();
            var rates = [], scores = [], valid = true;
            for (var i = 0; i < 3; i++) {
                rates[i] = readRate(keys[i]);
                if (rates[i] === null) { valid = false; scores[i] = null; }
                else { scores[i] = subjectScore(u.subjects[i].max, rates[i]); }
                el('score-' + keys[i]).textContent = (scores[i] === null) ? '―' : fmt(scores[i]) + '点';
            }
            if (!valid) {
                el('res-empty').style.display = '';
                el('res-body').style.display = 'none';
                return;
            }
            el('res-empty').style.display = 'none';
            el('res-body').style.display = '';

            var nowTotal = scores[0] + scores[1] + scores[2];
            var assumedExtra = 0;
            var targetTotal = u.min;
            if (current === 'hyo') {
                assumedExtra = parseFloat(el('hyo-extra-select').value) || 0;
                targetTotal = u.min - assumedExtra;
                el('hyo-need-line').textContent = '小論文・面接等で' + fmt(assumedExtra) + '点取る想定では、学科の必要点は' + fmt(targetTotal) + '点（500点満点）になります。これは計算の例で、学科の目標を一つに断定するものではありません。';
            }
            var gap = targetTotal - nowTotal;

            el('res-now').textContent = fmt(nowTotal);
            el('res-now-unit').textContent = (current === 'hyo') ? '点（学科のみ）' : '点';
            el('res-min').textContent = (current === 'hyo') ? fmt(targetTotal) : fmt(u.min);
            el('res-min-label').textContent = (current === 'hyo') ? '学科の必要点（想定をおいた計算）' : (u.firstOnly ? '1次合格最低点（2026年度）' : '合格最低点（2026年度）');
            if (gap > 0) {
                el('res-gap').textContent = fmt(gap);
                el('res-gap').parentElement.style.color = '#C0392B';
                el('res-gap-label').textContent = u.firstOnly ? '1次最低点までの不足' : '最低点までの不足';
            } else {
                el('res-gap').textContent = fmt(-gap);
                el('res-gap').parentElement.style.color = '#1D7A3A';
                el('res-gap-label').textContent = '最低点を上回る分（入力した得点率での換算）';
            }

            // バー（目盛りは大学の満点。兵庫は630点満点で、グレーが小論文・面接等の想定分）
            var bar = el('res-bar');
            var html = '';
            for (var b = 0; b < 3; b++) {
                html += '<div style="background:' + u.subjects[b].color + ';width:' + (scores[b] / u.total * 100) + '%;height:26px;"></div>';
            }
            if (current === 'hyo' && assumedExtra > 0) {
                html += '<div style="background:#5F7183;width:' + (assumedExtra / u.total * 100) + '%;height:26px;"></div>';
            }
            bar.innerHTML = html;
            var markerPos = u.min / u.total * 100;
            el('res-marker').style.left = markerPos + '%';
            el('res-marker-label').textContent = '最低点 ' + fmt(u.min);
            el('res-bar-note').textContent = (current === 'hyo')
                ? '左から英語・数学・理科の換算点と、小論文・面接等の想定分（グレー）。赤い線が合格最低点417.5点の位置です。'
                : '左から英語・数学・理科の換算点。赤い線が' + (u.firstOnly ? '1次合格最低点' : '合格最低点') + 'の位置です。';

            // 目標点の例（+5%の列も並べる）
            var maxArr = u.subjects.map(function(s) { return s.max; });
            var targets = allocateTargets(scores, maxArr, targetTotal);
            var target5Total = targetTotal * 1.05;
            var targets5 = allocateTargets(scores, maxArr, target5Total);
            var rows = '';
            for (var t = 0; t < 3; t++) {
                var s = u.subjects[t];
                rows += '<tr><th class="text-left">' + s.label + '</th><td>' + s.max + '点</td><td>' + fmt(scores[t]) + '点（' + fmt(rates[t]) + '％）</td><td>' + fmt(targets[t]) + '点（' + fmt(targets[t] / s.max * 100) + '％）</td><td>' + fmt(targets5[t]) + '点（' + fmt(targets5[t] / s.max * 100) + '％）</td></tr>';
            }
            el('res-table').innerHTML = rows;
            var plusLabel = (current === 'hyo') ? '学科の必要点+5%' : (u.firstOnly ? '1次合格最低点+5%' : '合格最低点+5%');
            el('res-plus5').textContent = '余裕を持った目標（' + plusLabel + '）は ' + fmt(target5Total) + ' 点です。最低点は合格者の一番下の点なので、実戦の目標はこちらの列に置く読み方もあります。';

            // 4校比較（同じ得点率で全校を計算）
            var assumedHyo = parseFloat(el('hyo-extra-select').value) || 0;
            var gaps = {}, cmpHtml = '';
            var order4 = ['ompu', 'kmu', 'kindai', 'hyo'];
            for (var c = 0; c < 4; c++) {
                var uu = UNIS[order4[c]], tot = 0;
                for (var k = 0; k < 3; k++) { tot += uu.subjects[k].max * rates[k] / 100; }
                var tgt = (order4[c] === 'hyo') ? (uu.min - assumedHyo) : uu.min;
                var g = tgt - tot;
                gaps[order4[c]] = g;
                var sel = (order4[c] === current);
                var estLine = (order4[c] === 'hyo' && assumedHyo > 0)
                    ? '<p class="text-sm">推定 ' + fmt(tot + assumedHyo) + '点／' + uu.total + '点（学科' + fmt(tot) + '点＋小論文・面接等の想定' + fmt(assumedHyo) + '点）</p>'
                    : '<p class="text-sm">推定 ' + fmt(tot) + '点／' + uu.total + '点</p>';
                var state = (g > 0)
                    ? '<span style="color:#C0392B;">あと' + fmt(g) + '点</span>'
                    : '<span style="color:#1D7A3A;">最低点超え +' + fmt(-g) + '点</span>';
                cmpHtml += '<button type="button" data-cmp="' + order4[c] + '" class="card p-4 text-left w-full hover:shadow-md transition" style="' + (sel ? 'border:2px solid #1D5FA8;background:#EAF2FB;' : '') + '">'
                    + '<p class="font-black text-main-dark text-sm mb-1">' + uu.name + (uu.firstOnly ? '（1次）' : '') + '</p>'
                    + estLine
                    + '<p class="text-sm">最低点 ' + fmt(uu.min) + '点</p>'
                    + '<p class="font-black">' + state + '</p></button>';
            }
            el('res-compare').innerHTML = cmpHtml;
            lastGaps = gaps;
            // 記録は自動では残さない（「この結果を記録する」ボタンが押されたときだけ保存する）
            lastRates = rates.slice();
            renderNext(scores, targets, rates, gap, targetTotal, nowTotal, assumedExtra);
        }

        var SUBJ_NEXT = {
            eng: { href: '/articles/eigo', title: '英語｜4校で形式がここまで違う', desc: '自由英作文の有無、長文の量と速さ。形式の違いが、そのまま点差になります。', act: '志望校の過去問を1年分、制限時間どおりに解いて、落とした問題を語彙・文法・読解に分ける' },
            math: { href: '/articles/sugaku', title: '数学｜近畿だけ別競技、3校は記述で点差がつく', desc: '数IIIのない近畿と、記述で差がつく3校。落とす場所と、立て直し方を見ます。', act: '志望校の過去問を1年分、時間を計って解いて、部分点が取れた問題と、最初から手が出なかった問題を分ける' },
            sci: { href: '/articles/rika', title: '理科｜2科目を、当日に選ぶということ', desc: '4校とも200点で、いちばん重い科目です。試験当日に問題を見てから科目を選べるのは、関西医科大学だけです。4校の選択の形と、点差のつき方を整理します。', act: '選んだ2科目の過去問を、本番と同じ120分通しで解いて、科目を切り替えるタイミングを決める' }
        };
        var GRADE_NAMES = ['高3・既卒（2027年度入試）', '高2（2028年度入試）', '高1（2029年度入試）'];
        var gradeOffset = 0;
        var lastGaps = null;
        var lastRates = null;
        var prevSnap = null;
        try { prevSnap = JSON.parse(window.localStorage.getItem('meducate-kyori-v1') || 'null'); } catch (e) { prevSnap = null; }
        var userEdited = false;
        function examLabelShifted(u) { return u.examLabel.replace('2027', String(2027 + gradeOffset)); }
        function examDateShifted(u) {
            var parts = u.exam.split('-');
            return new Date((parseInt(parts[0], 10) + gradeOffset) + '-' + parts[1] + '-' + parts[2] + 'T00:00:00');
        }
        var lastCopyText = '';

        function renderNext(scores, targets, rates, gap, targetTotal, nowTotal, assumedExtra) {
            var u = uni();
            var i;
            // 1次試験までの残り日数（学年で入試年度がずれる）
            var today = new Date(); today.setHours(0, 0, 0, 0);
            var exam = examDateShifted(u);
            var days = Math.round((exam - today) / 86400000);
            var pace = (gap > 0 && days > 0) ? gap / (days / 7) : 0;
            var far = (gap > 0 && days > 0 && pace > 8);
            if (gap > 0) {
                el('ns-heading').textContent = 'あと' + fmt(gap) + '点を取りに行く';
                if (days > 0) {
                    var note = (gradeOffset > 0) ? '（' + (2027 + gradeOffset) + '年度の日程はまだ公表されていないため、2027年度と同じ時期で計算しています）' : '';
                    el('ns-pace').innerHTML = '1次試験（' + examLabelShifted(u) + '）まで、あと' + days + '日。不足' + fmt(gap) + '点は、1週間に約' + fmt(pace) + '点ずつ伸ばす計算です。週の時間の組み方は<a href="/articles/jikan" class="underline text-main-dark">「配点の割合で、週の勉強時間を組み替える」</a>にまとめています。' + note;
                } else {
                    el('ns-pace').textContent = '';
                }
            } else {
                el('ns-heading').textContent = '最低点は超えています。次は、上積みと崩れない形です';
                el('ns-pace').innerHTML = 'この水準を本番で再現するための進め方は、<a href="/articles/soron4" class="underline text-main-dark">総論「続ける仕組みと完成度」</a>にまとめています。';
            }
            // 前回との比較（この端末に残した記録）
            var prevEl = el('ns-prev');
            if (prevSnap && prevSnap.gaps && typeof prevSnap.gaps[current] === 'number') {
                var prevGap = prevSnap.gaps[current];
                var nowD2 = new Date();
                var todayStr = nowD2.getFullYear() + '-' + (nowD2.getMonth() + 1) + '-' + nowD2.getDate();
                var todayLabel = (nowD2.getMonth() + 1) + '月' + nowD2.getDate() + '日';
                var isSameDay = prevSnap.date ? (prevSnap.date === todayStr) : (prevSnap.label === todayLabel);
                var prevName = isSameDay ? '先ほど' : '前回（' + prevSnap.label + '）';
                if (!userEdited) {
                    prevEl.textContent = (prevGap > 0)
                        ? prevName + 'の記録では、この大学の不足は' + fmt(prevGap) + '点でした。得点率を変えると、前回との差がここに出ます。'
                        : prevName + 'の記録では、この大学は最低点を超えていました。';
                } else if (prevGap > 0 && gap <= 0) {
                    prevEl.textContent = prevName + 'は、あと' + fmt(prevGap) + '点でした。今回は最低点を超えています。';
                } else if (prevGap > 0 && gap > 0) {
                    var d = prevGap - gap;
                    prevEl.textContent = prevName + 'の不足は' + fmt(prevGap) + '点。今回で' + (d > 0 ? fmt(d) + '点縮まりました。' : (d < 0 ? fmt(-d) + '点広がりました。' : '変わりません。'));
                } else {
                    prevEl.textContent = '';
                }
            } else { prevEl.textContent = prevSnap ? '' : 'まだ記録がありません。結果が固まったら、下の「この結果を記録する」を押してください。次に開いたとき、前回の記録と比べられます。'; }
            // 4校比較の一文（毎回計算し直して両ブロックに同期する。出すのは、最も近い他大学の不足が選んだ大学の半分以下のときだけ）
            var cmpLine = '';
            if (lastGaps && gap > 0) {
                var bestKey = null, bestGap = null;
                for (var ok2 in lastGaps) {
                    if (ok2 === current) continue;
                    if (bestGap === null || lastGaps[ok2] < bestGap) { bestGap = lastGaps[ok2]; bestKey = ok2; }
                }
                if (bestKey && bestGap < gap && bestGap * 2 <= gap && bestGap < 50) {
                    cmpLine = '同じ得点率で計算すると、' + UNIS[bestKey].name + 'は' + (bestGap > 0 ? 'あと' + fmt(bestGap) + '点です。' : '最低点を超えています。');
                }
            }
            el('ns-far-cmp').textContent = cmpLine;
            el('ns-near-cmp').textContent = cmpLine;
            // 大きな距離のときの出口
            if (far) {
                el('ns-far').style.display = '';
                el('ns-far-text').textContent = 'この不足を残りの期間で埋めるには、1週間に約' + fmt(pace) + '点の伸びが要ります。1つの大学の完成度を上げる通常の進め方では、届きにくい距離です。選択肢は、併願の組み替えで「届く組み合わせ」に見直すことと、来年度を見据えて設計することです。どちらも、早いほど選択肢が残ります。';
            } else {
                el('ns-far').style.display = 'none';
            }
            // 大きな不足が直前期に残っているときの出口（週ペースでは届く計算でも、受け方の見直しを出す）
            var near = (!far && gap >= 50 && days > 0 && days <= 180);
            if (near) {
                el('ns-near').style.display = '';
                el('ns-near-text').textContent = '1次試験まで残り' + days + '日で、不足は' + fmt(gap) + '点あります。志望校の完成度を上げる進め方と並行して、届く組み合わせへの組み替えを早めに検討する段階です。組み替えは、出願が始まる前に決めるほど選択肢が残ります。';
            } else {
                el('ns-near').style.display = 'none';
            }
            // 科目カード：不足時は目標までの差が大きい順、超過時は得点率が低い順
            var order = [0, 1, 2];
            if (gap > 0) { order.sort(function(a, b) { return (targets[b] - scores[b]) - (targets[a] - scores[a]); }); }
            else { order.sort(function(a, b) { return rates[a] - rates[b]; }); }
            var cards = '';
            for (i = 0; i < 3; i++) {
                var idx = order[i], s = u.subjects[idx], meta = SUBJ_NEXT[s.key];
                var head = (gap > 0)
                    ? s.label + '｜あと' + fmt(Math.max(0, targets[idx] - scores[idx])) + '点'
                    : s.label + '｜今' + fmt(rates[idx]) + '％';
                cards += '<a href="' + meta.href + '" class="card p-5 block hover:shadow-md transition">'
                    + '<p class="font-black text-main-dark mb-1"><span class="inline-block w-3.5 h-3.5 rounded-sm mr-1 align-middle" style="background:' + s.color + '"></span>' + head + '</p>'
                    + '<p class="font-bold text-sm mb-1">' + meta.title + '</p>'
                    + '<p class="text-sm text-gray-600">' + meta.desc + '</p>'
                    + '<p class="text-sm mt-2"><span class="font-bold text-main-dark">今週の1手：</span>' + meta.act + '</p></a>';
            }
            el('ns-cards').innerHTML = cards;
            // 相談CTA（結果連動）
            if (far) {
                el('ns-cta-heading').textContent = 'この結果をもとに、受け方から設計し直す';
                el('ns-cta-text').textContent = '無料相談では、この結果をもとに、併願の組み替えと、来年度を見据える場合の進め方を一緒に設計します。下の「結果をコピーする」で結果を控えて、LINEやメールでそのまま送ってください。';
            } else if (gap > 0) {
                el('ns-cta-heading').textContent = 'この結果をもとに、あと' + fmt(gap) + '点の取り方を設計する';
                el('ns-cta-text').textContent = '無料相談では、この結果をもとに、どの科目のどこで' + fmt(gap) + '点を取るか、最初の一か月の進め方まで一緒に設計します。下の「結果をコピーする」で結果を控えて、LINEやメールでそのまま送ってください。';
            } else {
                el('ns-cta-heading').textContent = 'この結果をもとに、上積みの設計をする';
                el('ns-cta-text').textContent = '無料相談では、この結果をもとに、最低点からどれだけ余裕を作るか、残りの期間の進め方を一緒に設計します。下の「結果をコピーする」で結果を控えて、LINEやメールでそのまま送ってください。';
            }
            el('ns-copy-done').style.display = 'none';
            el('ns-save-done').style.display = 'none';
            // コピー用テキスト
            var lines = [];
            lines.push('【距離メーターの結果｜MEDUCATE天王寺校】');
            lines.push('志望校：' + u.name);
            lines.push('学年：' + GRADE_NAMES[gradeOffset]);
            if (current === 'hyo') {
                lines.push('今の推定得点（学科のみ）：' + fmt(nowTotal) + '点／500点');
                lines.push('合格最低点（2026年度）：' + fmt(u.min) + '点／630点');
                lines.push('小論文・面接等の想定：' + fmt(assumedExtra) + '点 → 学科の必要点：' + fmt(targetTotal) + '点');
            } else if (u.firstOnly) {
                lines.push('今の推定得点：' + fmt(nowTotal) + '点／' + u.total + '点');
                lines.push('1次合格最低点（2026年度）：' + fmt(u.min) + '点');
            } else {
                lines.push('今の推定得点：' + fmt(nowTotal) + '点／' + u.total + '点');
                lines.push('合格最低点（2026年度）：' + fmt(u.min) + '点');
            }
            lines.push(gap > 0 ? ('最低点までの不足：' + fmt(gap) + '点') : ('最低点を上回る分：' + fmt(-gap) + '点'));
            lines.push('余裕を持った目標（最低点+5%）：' + fmt(targetTotal * 1.05) + '点');
            for (i = 0; i < 3; i++) {
                var s2 = u.subjects[i];
                lines.push('・' + s2.label + '：' + fmt(scores[i]) + '点（' + fmt(rates[i]) + '％）→ 目標の例 ' + fmt(targets[i]) + '点（' + fmt(targets[i] / s2.max * 100) + '％）');
            }
            if (days > 0) lines.push('1次試験（' + examLabelShifted(u) + '）まで：あと' + days + '日' + (gradeOffset > 0 ? '（日程は2027年度と同じ時期で計算）' : ''));
            lines.push('https://meducate.oubijuku.com/kyori?u=' + current);
            lastCopyText = lines.join('\n');
        }

        var btns = document.querySelectorAll('.uni-btn[data-u]');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', function() { setUniversity(this.getAttribute('data-u')); });
        }
        var GRADE_NOTES = [
            '高3・既卒：2027年度入試（2027年2月）までの残り日数で計算します。',
            '高2：2028年度入試が対象です。日程はまだ公表されていないため、2027年度と同じ時期として、残り日数を計算します。',
            '高1：2029年度入試が対象です。日程はまだ公表されていないため、2027年度と同じ時期として、残り日数を計算します。'
        ];
        var gbtns = document.querySelectorAll('.grade-btn');
        for (var gi = 0; gi < gbtns.length; gi++) {
            gbtns[gi].addEventListener('click', function() {
                gradeOffset = parseInt(this.getAttribute('data-g'), 10) || 0;
                for (var gj = 0; gj < gbtns.length; gj++) { gbtns[gj].classList.toggle('active', gbtns[gj] === this); }
                el('grade-note').textContent = GRADE_NOTES[gradeOffset];
                update();
            });
        }
        el('res-compare').addEventListener('click', function(ev) {
            var node = ev.target;
            while (node && node !== this && !node.getAttribute('data-cmp')) { node = node.parentElement; }
            if (node && node.getAttribute('data-cmp')) { setUniversity(node.getAttribute('data-cmp')); }
        });
        for (var j = 0; j < 3; j++) {
            (function(key) {
                var num = el('rate-' + key), slider = el('slider-' + key);
                num.addEventListener('input', function() {
                    userEdited = true;
                    var n = parseFloat(num.value);
                    slider.value = isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
                    update();
                });
                slider.addEventListener('input', function() {
                    userEdited = true;
                    num.value = slider.value;
                    update();
                });
            })(keys[j]);
        }
        el('hyo-extra-select').addEventListener('change', function() { userEdited = true; update(); });
        el('ns-save').addEventListener('click', function() {
            if (!lastGaps || !lastRates) return;
            var nowD = new Date();
            var label = (nowD.getMonth() + 1) + '月' + nowD.getDate() + '日';
            var dateStr = nowD.getFullYear() + '-' + (nowD.getMonth() + 1) + '-' + nowD.getDate();
            try {
                var snap = { label: label, date: dateStr, gaps: lastGaps, rates: lastRates };
                window.localStorage.setItem('meducate-kyori-v1', JSON.stringify(snap));
                prevSnap = snap;
                update();
                var done = el('ns-save-done');
                done.textContent = '記録しました（' + label + '）。次にこのページを開いたとき、この記録と比べます。';
                done.style.display = '';
            } catch (e) {}
        });
        el('ns-copy').addEventListener('click', function() {
            function done() { el('ns-copy-done').style.display = ''; }
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(lastCopyText).then(done, function() { fallbackCopy(); done(); });
            } else { fallbackCopy(); done(); }
            function fallbackCopy() {
                var ta = document.createElement('textarea');
                ta.value = lastCopyText;
                ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); } catch (e) {}
                document.body.removeChild(ta);
            }
        });

        // 大学別ページからのパラメータ（?u=ompu など）で初期選択
        var q = null;
        try { q = new URLSearchParams(window.location.search).get('u'); } catch (e) { q = null; }
        var map = { ompu: 'ompu', kmu: 'kmu', kindai: 'kindai', hyo: 'hyo', 'hyo-med': 'hyo' };
        // 前回の記録があれば、前回の得点率を入力欄に戻す（開いた直後から前回との比較が見える）
        if (prevSnap && prevSnap.rates && prevSnap.rates.length === 3) {
            for (var pi = 0; pi < 3; pi++) {
                var pv = prevSnap.rates[pi];
                if (typeof pv === 'number') {
                    el('rate-' + keys[pi]).value = pv;
                    el('slider-' + keys[pi]).value = Math.round(pv);
                }
            }
        }
        setUniversity(map[q] || 'ompu');
    })();
