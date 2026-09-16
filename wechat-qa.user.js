// ==UserScript==
// @name         微信公众号私信问答导出助手
// @namespace    https://github.com/MiloMMIN/wechat-qa
// @version      3.6
// @description  一键导出粉丝真实提问与AI/号主回复，支持暂停/继续/取消，完整年月日时间
// @author       Milo Ming
// @organization 温州科技职业学院
// @copyright    2026, Milo Ming (温州科技职业学院)
// @match        https://mp.weixin.qq.com/cgi-bin/message*
// @homepageURL  https://github.com/MiloMMIN/wechat-qa
// @supportURL   https://github.com/MiloMMIN/wechat-qa/issues
// @updateURL    https://testingcf.jsdelivr.net/gh/MiloMMIN/wechat-qa@master/wechat-qa.user.js
// @downloadURL  https://testingcf.jsdelivr.net/gh/MiloMMIN/wechat-qa@master/wechat-qa.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==
/**
 * 微信公众号私信问答导出助手
 * Author: Milo Ming
 * Organization: 温州科技职业学院
 * GitHub: https://github.com/MiloMMIN/wechat-qa
 */

(function() {
  'use strict';

  var state = { running: false, paused: false, cancelled: false };

  setTimeout(function() {
    var panel = document.createElement('div');
    panel.id = 'qa-export-panel';
    panel.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99999;background:#fff;' +
      'border:2px solid #07c160;border-radius:8px;padding:10px 16px;box-shadow:0 2px 12px rgba(0,0,0,0.15);' +
      'display:flex;align-items:center;gap:6px;font-size:13px;flex-wrap:wrap;max-width:520px;';
    var bs = 'border:none;padding:5px 12px;border-radius:4px;cursor:pointer;font-size:13px;color:#fff;';
    panel.innerHTML =
      '<span style="font-weight:bold;margin-right:4px;">QA\u52A9\u624B v3.6</span>' +
      '<label>\u6570\u91CF: <input id="qa-count" type="number" value="20" min="1" max="999" ' +
      'style="width:50px;text-align:center;border:1px solid #ccc;border-radius:3px;"></label>' +
      '<button id="qa-start-btn" style="' + bs + 'background:#07c160;">\uD83D\uDCE5 \u5F00\u59CB\u5BFC\u51FA</button>' +
      '<button id="qa-pause-btn" style="' + bs + 'background:#e6a23c;display:none;">\u23F8 \u6682\u505C</button>' +
      '<button id="qa-cancel-btn" style="' + bs + 'background:#f56c6c;display:none;">\u2716 \u53D6\u6D88</button>' +
      '<div id="qa-status" style="width:100%;font-size:12px;color:#666;margin-top:4px;"></div>';
    document.body.appendChild(panel);
    document.getElementById('qa-start-btn').addEventListener('click', startExport);
    document.getElementById('qa-pause-btn').addEventListener('click', togglePause);
    document.getElementById('qa-cancel-btn').addEventListener('click', cancelExport);
  }, 2000);

  function togglePause() {
    var btn = document.getElementById('qa-pause-btn');
    if (state.paused) {
      state.paused = false;
      btn.textContent = '\u23F8 \u6682\u505C';
      btn.style.background = '#e6a23c';
      updateStatus('\u25B6 \u5DF2\u7EE7\u7EED...');
    } else {
      state.paused = true;
      btn.textContent = '\u25B6 \u7EE7\u7EED';
      btn.style.background = '#67c23a';
      updateStatus('\u23F8 \u5DF2\u6682\u505C\uFF0C\u70B9\u51FB\u201C\u7EE7\u7EED\u201D\u6062\u590D');
    }
  }
  function cancelExport() { state.cancelled = true; state.paused = false; updateStatus('\u274C \u5DF2\u53D6\u6D88'); }
  function updateStatus(msg) { var el = document.getElementById('qa-status'); if (el) el.textContent = msg; }
  function showControls(show) {
    document.getElementById('qa-pause-btn').style.display = show ? 'inline-block' : 'none';
    document.getElementById('qa-cancel-btn').style.display = show ? 'inline-block' : 'none';
    document.getElementById('qa-start-btn').style.display = show ? 'none' : 'inline-block';
    document.getElementById('qa-count').disabled = show;
  }
  async function waitIfPaused() {
    while (state.paused && !state.cancelled) {
      await new Promise(function(r) { setTimeout(r, 200); });
    }
  }
  function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  // ========== 时间戳转完整年月日 ==========
  function toFullDateTime(rawTime) {
    if (!rawTime) return '';
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth();
    var d = now.getDate();

    // 格式: "昨天 14:52"
    if (rawTime.indexOf('\u6628\u5929') !== -1) {
      var hm = rawTime.replace(/\u6628\u5929\s*/, '');
      var yesterday = new Date(y, m, d - 1);
      return yesterday.getFullYear() + '-' + pad(yesterday.getMonth() + 1) + '-' + pad(yesterday.getDate()) + ' ' + hm;
    }
    // 格式: "前天 14:52"
    if (rawTime.indexOf('\u524D\u5929') !== -1) {
      var hm2 = rawTime.replace(/\u524D\u5929\s*/, '');
      var beforeYesterday = new Date(y, m, d - 2);
      return beforeYesterday.getFullYear() + '-' + pad(beforeYesterday.getMonth() + 1) + '-' + pad(beforeYesterday.getDate()) + ' ' + hm2;
    }
    // 格式: "星期X 14:52"
    if (rawTime.indexOf('\u661F\u671F') !== -1) {
      var parts = rawTime.split(/\s+/);
      var hm3 = parts[parts.length - 1];
      var weekDayMap = {'\u65E5':0,'\u4E00':1,'\u4E8C':2,'\u4E09':3,'\u56DB':4,'\u4E94':5,'\u516D':6};
      var targetDay = weekDayMap[rawTime.charAt(rawTime.indexOf('\u671F') + 1)];
      if (targetDay !== undefined) {
        var currentDay = now.getDay();
        var diff = currentDay - targetDay;
        if (diff <= 0) diff += 7;
        var targetDate = new Date(y, m, d - diff);
        return targetDate.getFullYear() + '-' + pad(targetDate.getMonth() + 1) + '-' + pad(targetDate.getDate()) + ' ' + hm3;
      }
      return y + '-??-?? ' + hm3;
    }
    // 格式: "9月11日 14:52"
    var mdMatch = rawTime.match(/(\d{1,2})\u6708(\d{1,2})\u65E5\s*(.*)/);
    if (mdMatch) {
      return y + '-' + pad(parseInt(mdMatch[1])) + '-' + pad(parseInt(mdMatch[2])) + ' ' + (mdMatch[3] || '');
    }
    // 格式: 纯时间 "21:00" -> 今天
    if (/^\d{1,2}:\d{2}$/.test(rawTime.trim())) {
      return y + '-' + pad(m + 1) + '-' + pad(d) + ' ' + rawTime.trim();
    }
    return rawTime;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // ========== 从提问文本中拆分时间戳 ==========
  function splitTimeAndQuestion(text) {
    // 匹配开头的时间戳: "昨天 14:52\n\n你好" 或 "20:59\n\n寝室最晚几点"
    var timePatterns = [
      /^(\u6628\u5929\s*\d{1,2}:\d{2})\s*\n*\s*/,
      /^(\u524D\u5929\s*\d{1,2}:\d{2})\s*\n*\s*/,
      /^(\u661F\u671F.\s*\d{1,2}:\d{2})\s*\n*\s*/,
      /^(\d{1,2}\u6708\d{1,2}\u65E5\s*\d{1,2}:\d{2})\s*\n*\s*/,
      /^(\d{1,2}:\d{2})\s*\n*\s*/
    ];
    for (var i = 0; i < timePatterns.length; i++) {
      var match = text.match(timePatterns[i]);
      if (match) {
        var rawTime = match[1].trim();
        var question = text.slice(match[0].length).trim();
        return { time: toFullDateTime(rawTime), question: question };
      }
    }
    return { time: '', question: text };
  }

  // ========== 定位右侧会话消息容器 ==========
  var chatBoxCache = null;
  function findChatBox() {
    if (chatBoxCache && document.contains(chatBoxCache)) return chatBoxCache;
    chatBoxCache = null;
    var allDivs = document.querySelectorAll('div');
    for (var i = 0; i < allDivs.length; i++) {
      var fc = allDivs[i].firstElementChild;
      if (fc && fc.innerText && fc.innerText.trim() === '\u4EC5\u4FDD\u5B58\u6700\u8FD130\u5929\u7684\u79C1\u4FE1') {
        chatBoxCache = allDivs[i];
        break;
      }
    }
    return chatBoxCache;
  }
  function getChatText() { var box = findChatBox(); return box ? (box.innerText || '') : ''; }

  // 点击卡片后轮询等待右侧会话真正切换并渲染稳定（变化后连续两次读取一致才算稳定），
  // 返回是否真的发生了切换；未切换说明点击落空，需要重试
  async function waitForChatSwitch(prevText) {
    var deadline = Date.now() + 2500;
    var last = prevText;
    var changed = false;
    var stable = 0;
    while (Date.now() < deadline && !state.cancelled) {
      await sleep(250);
      var cur = getChatText();
      if (cur !== prevText) changed = true;
      if (changed && cur === last) { stable++; if (stable >= 2) break; }
      else stable = 0;
      last = cur;
    }
    return changed;
  }

  // ========== 核心提取（Playwright 实测验证）==========
  function extractQAPairs() {
    var chatBox = findChatBox();
    if (!chatBox) return { pairs: [], lastTime: '' };

    var children = Array.from(chatBox.children);
    var pairs = [];
    var currentQ = null;
    var currentTime = '';
    var lastTime = '';
    var currentReplies = [];

    for (var j = 0; j < children.length; j++) {
      var child = children[j];
      var text = (child.innerText || '').trim();
      if (!text) continue;
      if (child.className === 'new-user-loading') continue;

      var hasAI = text.indexOf('\u5185\u5BB9\u7531AI\u751F\u6210') !== -1;

      if (!hasAI) {
        // 粉丝提问 (可能包含时间戳)
        var parsed = splitTimeAndQuestion(text);
        var qText = parsed.question;
        if (!qText) continue;

        if (currentQ !== null) {
          pairs.push({ q: currentQ, a: currentReplies.slice(), time: currentTime });
        }
        currentQ = qText;
        currentTime = parsed.time || currentTime;
        if (parsed.time) lastTime = parsed.time;
        currentReplies = [];
      } else {
        // AI 回复
        var cleanReply = text.replace(/\u5185\u5BB9\u7531AI\u751F\u6210/g, '').trim();
        if (cleanReply) currentReplies.push(cleanReply);
      }
    }
    if (currentQ !== null) {
      pairs.push({ q: currentQ, a: currentReplies.slice(), time: currentTime });
    }
    return { pairs: pairs, lastTime: lastTime };
  }

  // ========== 从会话卡片解析昵称（仅用于标注，不参与去重）==========
  // 去掉行尾时间（“昨天 15:53”“9月11日 14:52”“15:53”等），过滤“我：xxx”预览与 AI 标记，
  // 未读角标（纯数字，如“1”“99+”）排在昵称之前时丢弃
  var TIME_TAIL = /\s*(?:(?:\u6628\u5929|\u524D\u5929|\u661F\u671F.|\d{1,2}\u6708\d{1,2}\u65E5|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})\s*(?:\d{1,2}:\d{2})?|\d{1,2}:\d{2})\s*$/;
  function getNickname(card) {
    var lines = (card.innerText || '').split('\n');
    var candidates = [];
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].replace(TIME_TAIL, '').trim();
      if (!t) continue;
      if (/^\u6211[\uFF1A:]/.test(t)) continue;
      if (t.indexOf('\u5185\u5BB9\u7531AI\u751F\u6210') !== -1) continue;
      candidates.push(t);
    }
    if (candidates.length > 1 && /^\d{1,3}\+?$/.test(candidates[0])) candidates.shift();
    return candidates[0] || '';
  }

  // ========== 选择下一张要处理的卡片：严格按列表顺序，以 DOM 节点为身份 ==========
  // 先从游标处往下找第一个未处理的卡片；找不到再回头扫描（列表重排 / 虚拟滚动补渲染出的新节点）。
  // 若页面里已没有任何处理过的节点，说明列表被整体重建，此时不回头，避免从头重复抓取。
  function pickNextCard(cards, cursor, done) {
    var i;
    for (i = cursor; i < cards.length; i++) if (!done.has(cards[i])) return i;
    var anyKnown = false;
    for (i = 0; i < cards.length; i++) if (done.has(cards[i])) { anyKnown = true; break; }
    if (!anyKnown) return -1;
    for (i = 0; i < cursor && i < cards.length; i++) if (!done.has(cards[i])) return i;
    return -1;
  }

  // ========== 主导出流程 ==========
  async function startExport() {
    if (state.running) return;
    state.running = true;
    state.paused = false;
    state.cancelled = false;

    var maxCount = parseInt(document.getElementById('qa-count').value, 10) || 20;
    showControls(true);
    updateStatus('\u2708\uFE0F \u6B63\u5728\u62BD\u53D6 0/' + maxCount + '...');

    var allCards = document.querySelectorAll('.msg-user-item');
    if (!allCards.length) {
      alert('\u672A\u627E\u5230\u5DE6\u4FA7\u4F1A\u8BDD\u5361\u7247\uFF01');
      state.running = false;
      showControls(false);
      return;
    }

    var scrollBox = allCards[0].parentElement;
    while (scrollBox && scrollBox !== document.body) {
      if (scrollBox.scrollHeight > scrollBox.clientHeight) break;
      scrollBox = scrollBox.parentElement;
    }

    var dataset = [];
    var done = new WeakSet();   // 已处理过的卡片节点。不按昵称去重：同名、角标“1”、时间文本被当成昵称都会导致漏抓
    var cursor = 0;             // 列表位置游标，严格按顺序往下读
    var stall = 0;              // 连续“没有新卡片可处理”的次数

    while (dataset.length < maxCount && stall < 8) {
      if (state.cancelled) break;
      await waitIfPaused();
      if (state.cancelled) break;

      var cards = document.querySelectorAll('.msg-user-item');
      var idx = pickNextCard(cards, cursor, done);
      if (idx === -1) {
        // 已加载的卡片都处理完了：按半屏步进往下滚，触发加载更多（步进小于一屏，避免滚过头漏卡片）
        stall++;
        if (scrollBox && scrollBox !== document.body) {
          scrollBox.scrollTop += Math.max(100, Math.floor(scrollBox.clientHeight * 0.6));
        } else if (cards.length) {
          cards[cards.length - 1].scrollIntoView({ block: 'end' });
        }
        await sleep(800);
        continue;
      }

      var card = cards[idx];
      if (!document.contains(card)) {
        // 卡片节点刚被列表重渲染换掉：不推进游标，稍等后重新取
        stall++;
        await sleep(300);
        continue;
      }
      stall = 0;

      var nickname = getNickname(card);
      var prevText = getChatText();

      // 点击并确认右侧会话真的切换；未切换多半是点击瞬间节点被重建导致落空，重新取同位置节点重试
      var switched = false;
      var target = card;
      for (var attempt = 0; attempt < 3 && !switched && !state.cancelled; attempt++) {
        if (attempt > 0 || !document.contains(target)) {
          var fresh = document.querySelectorAll('.msg-user-item');
          if (fresh[idx] && document.contains(fresh[idx])) target = fresh[idx];
        }
        if (!document.contains(target)) break;
        target.scrollIntoView({ block: 'nearest' });
        target.click();
        switched = await waitForChatSwitch(prevText);
      }
      if (!switched) {
        console.warn('[QA\u52A9\u624B] \u4F1A\u8BDD\u672A\u786E\u8BA4\u5207\u6362\uFF0C\u53EF\u80FD\u70B9\u51FB\u843D\u7A7A\u6216\u4E0E\u4E0A\u4E00\u4F1A\u8BDD\u5185\u5BB9\u76F8\u540C: ' + nickname);
      }

      done.add(card);
      done.add(target);
      cursor = idx + 1;

      var extracted = extractQAPairs();
      dataset.push({ nickname: nickname, pairs: extracted.pairs, lastTime: extracted.lastTime });

      var progress = dataset.length + '/' + maxCount;
      var logQ = extracted.pairs.length > 0 ? extracted.pairs[0].q.slice(0, 18) : '';
      console.log('[' + progress + '] ' + nickname + ' -> Q1: ' + logQ);
      updateStatus('\u2708\uFE0F \u62BD\u53D6\u4E2D ' + progress + ' | ' + nickname +
        (logQ ? ' -> ' + logQ : ''));
    }

    showControls(false);
    state.running = false;

    if (dataset.length === 0) {
      updateStatus(state.cancelled ? '\u274C \u5DF2\u53D6\u6D88\uFF0C\u65E0\u6570\u636E' : '\u26A0 \u672A\u62BD\u53D6\u5230\u6570\u636E');
      return;
    }

    // ========== 生成 CSV（4列: 昵称 | 时间 | 提问集合 | 回复集合）==========
    var csv = '\uFEFF\u7C89\u4E1D\u6635\u79F0,\u65F6\u95F4,\u63D0\u95EE\u96C6\u5408,\u56DE\u590D\u96C6\u5408\n';
    for (var d2 = 0; d2 < dataset.length; d2++) {
      var item = dataset[d2];
      var allQ = [];
      var allA = [];
      var timeStr = item.lastTime || '';

      for (var p2 = 0; p2 < item.pairs.length; p2++) {
        var pair = item.pairs[p2];
        allQ.push('Q' + (p2 + 1) + '| ' + pair.q.replace(/[\r\n]+/g, ' '));
        for (var a2 = 0; a2 < pair.a.length; a2++) {
          allA.push('A' + (p2 + 1) + '.' + (a2 + 1) + '| ' + pair.a[a2].replace(/[\r\n]+/g, ' '));
        }
        // 如果某个 pair 有更具体的时间，更新
        if (pair.time) timeStr = pair.time;
      }
      var qCell = allQ.join(' -- ');
      var aCell = allA.join(' -- ');

      csv += '"' + (item.nickname || '').replace(/"/g, '""') + '",';
      csv += '"' + (timeStr || '').replace(/"/g, '""') + '",';
      csv += '"' + qCell.replace(/"/g, '""') + '",';
      csv += '"' + aCell.replace(/"/g, '""') + '"\n';
    }

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '\u516C\u4F17\u53F7\u95EE\u7B54\u5BFC\u51FA_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    var doneMsg = state.cancelled
      ? '\u26A0 \u5DF2\u53D6\u6D88\uFF0C\u5BFC\u51FA\u5DF2\u62BD\u53D6\u7684 ' + dataset.length + ' \u6761'
      : '\u2705 \u5B8C\u6210\uFF01\u5171\u5BFC\u51FA ' + dataset.length + ' \u4F4D\u7C89\u4E1D\u7684\u95EE\u7B54';
    updateStatus(doneMsg);
    console.log('>>> ' + doneMsg);
  }
})();
