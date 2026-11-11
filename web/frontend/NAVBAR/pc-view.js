/* Prime desktop map: full-screen floor plan and accessible PC telemetry. */
(function (root, factory) {
  var api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root && root.document) {
    root.PRIME_PC_VIEW = api;
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', function () { api.init(root); }, { once: true });
    } else {
      api.init(root);
    }
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var DATE_PATHS = [
    'end_time', 'ends_at', 'finish_time', 'finished_at', 'expires_at',
    'expired_at', 'paid_to', 'time_end', 'session_end_time',
    'session_ends_at', 'session_finish_time', 'current_session.end_time',
    'current_session.ends_at', 'current_session.expires_at'
  ];
  var SECOND_PATHS = [
    'seconds_left', 'remaining_seconds', 'session_seconds_left',
    'current_session.seconds_left', 'current_session.remaining_seconds'
  ];
  var MINUTE_PATHS = [
    'minutes_left', 'remaining_minutes', 'time_left', 'session_minutes_left',
    'current_session.minutes_left', 'current_session.remaining_minutes'
  ];

  function nestedValue(source, path) {
    return path.split('.').reduce(function (value, key) {
      return value == null ? undefined : value[key];
    }, source);
  }

  function firstNumber(source, paths) {
    for (var i = 0; i < paths.length; i += 1) {
      var raw = nestedValue(source, paths[i]);
      if (raw === '' || raw == null) continue;
      var number = Number(raw);
      if (Number.isFinite(number)) return number;
    }
    return null;
  }

  function parseApiTimestamp(value) {
    if (value === '' || value == null) return null;
    if (typeof value === 'number' || /^\d+$/.test(String(value))) {
      var numeric = Number(value);
      var timestamp = numeric < 10000000000 ? numeric * 1000 : numeric;
      return Number.isFinite(timestamp) ? timestamp : null;
    }
    var normalized = String(value).indexOf('T') >= 0
      ? String(value)
      : String(value).replace(' ', 'T');
    var timestamp = Date.parse(normalized);
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  function getReleaseTimestamp(pc, now) {
    var source = pc && typeof pc === 'object' ? pc : {};
    var currentTime = Number.isFinite(now) ? now : Date.now();

    for (var i = 0; i < DATE_PATHS.length; i += 1) {
      var timestamp = parseApiTimestamp(nestedValue(source, DATE_PATHS[i]));
      if (timestamp != null) return timestamp;
    }

    var seconds = firstNumber(source, SECOND_PATHS);
    if (seconds != null && seconds > 0) return currentTime + seconds * 1000;

    var minutes = firstNumber(source, MINUTE_PATHS);
    if (minutes != null && minutes > 0) return currentTime + minutes * 60000;

    var spent = firstNumber(source, ['spent_minutes', 'current_session.spent_minutes']);
    var total = firstNumber(source, ['total_minutes', 'current_session.total_minutes']);
    if (spent != null && total != null && total > spent) {
      return currentTime + (total - spent) * 60000;
    }

    return null;
  }

  function formatRemaining(endTimestamp, now) {
    var currentTime = Number.isFinite(now) ? now : Date.now();
    var delta = Number(endTimestamp) - currentTime;
    if (!Number.isFinite(delta) || delta <= 0) return '0 мин';
    var totalMinutes = Math.ceil(delta / 60000);
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    if (!hours) return totalMinutes + ' мин';
    return hours + ' ч' + (minutes ? ' ' + minutes + ' мин' : '');
  }

  function getAvailabilityText(status, pc, now) {
    var kind = String(status && status.kind || '').toLowerCase();
    if (kind === 'free') return 'Свободен';
    if (kind === 'offline') return 'Недоступен';
    if (kind === 'maintenance') return 'На обслуживании';

    var endTimestamp = getReleaseTimestamp(pc, now);
    if (endTimestamp == null) return 'Время неизвестно';
    if (endTimestamp <= (Number.isFinite(now) ? now : Date.now())) return 'Освобождается сейчас';
    return 'Осталось ' + formatRemaining(endTimestamp, now);
  }

  function primarySpecs(zone) {
    var specs = zone && zone.specs || {};
    function pick() {
      for (var i = 0; i < arguments.length; i += 1) {
        if (specs[arguments[i]]) return specs[arguments[i]];
      }
      return '';
    }
    return [
      ['CPU', pick('Процессор', 'CPU')],
      ['GPU', pick('Видеокарта', 'GPU')],
      ['Монитор', pick('Монитор', 'Monitor')],
      ['Память', pick('Оперативная память', 'RAM')]
    ].filter(function (pair) { return Boolean(pair[1]); });
  }

  function buildTooltipModel(input, now) {
    var value = input || {};
    var status = value.status || {};
    var zone = value.zone || {};
    var availabilitySource = Number.isFinite(value.releaseTimestamp)
      ? { ends_at: value.releaseTimestamp }
      : (value.pc || {});
    return {
      number: String(value.number == null || value.number === '' ? '?' : value.number),
      zoneTitle: zone.title || 'Зона',
      badge: zone.badge || '',
      statusName: status.name || 'Статус неизвестен',
      statusKind: status.kind || 'unknown',
      statusColor: status.color || '#A5A7AD',
      availability: getAvailabilityText(status, availabilitySource, now),
      specs: primarySpecs(zone)
    };
  }

  function computeMapDimensions(viewportWidth, viewportHeight, ratio) {
    var safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 450 / 800;
    var outerGutter = viewportWidth >= 1440 ? 24 : 16;
    var bottomChrome = viewportHeight >= 850 ? 96 : 84;
    var availableHeight = Math.max(320, viewportHeight - bottomChrome - outerGutter);
    var availableWidth = Math.max(320, viewportWidth - outerGutter * 2);
    var width = Math.round(Math.min(availableWidth, availableHeight * safeRatio));
    return {
      width: width,
      height: Math.round(width / safeRatio)
    };
  }

  function roundFrameValue(value) {
    return Math.round(value * 1000000) / 1000000;
  }

  function computeCoordinateFrame(originalViewBox, expandedViewBox) {
    var original = originalViewBox || {};
    var expanded = expandedViewBox || {};
    if (!(original.width > 0 && original.height > 0 && expanded.width > 0 && expanded.height > 0)) {
      return { left: 0, top: 0, width: 100, height: 100 };
    }
    return {
      left: roundFrameValue(((original.x - expanded.x) / expanded.width) * 100),
      top: roundFrameValue(((original.y - expanded.y) / expanded.height) * 100),
      width: roundFrameValue((original.width / expanded.width) * 100),
      height: roundFrameValue((original.height / expanded.height) * 100)
    };
  }

  function selectMapBounds(viewportWidth, originalViewBox, expandedViewBox) {
    return viewportWidth >= 900 ? expandedViewBox : originalViewBox;
  }

  function readViewBox(svg) {
    var values = String(svg && svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
    if (values.length !== 4 || !values.every(Number.isFinite) || values[2] <= 0 || values[3] <= 0) return null;
    return { x: values[0], y: values[1], width: values[2], height: values[3] };
  }

  function expandedMapBounds(svg, pcs, original) {
    var minX = original.x;
    var minY = original.y;
    var maxX = original.x + original.width;
    var maxY = original.y + original.height;
    var hasOverflow = false;

    try {
      var bbox = svg.getBBox();
      if (bbox && bbox.width > 0 && bbox.height > 0) {
        hasOverflow = bbox.x < minX || bbox.y < minY || bbox.x + bbox.width > maxX || bbox.y + bbox.height > maxY;
        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        maxY = Math.max(maxY, bbox.y + bbox.height);
      }
    } catch (error) {}

    if (pcs) {
      pcs.querySelectorAll('.pc').forEach(function (marker) {
        var left = parseFloat(marker.style.left);
        var top = parseFloat(marker.style.top);
        if (!Number.isFinite(left) || !Number.isFinite(top)) return;
        var x = original.x + original.width * left / 100;
        var y = original.y + original.height * top / 100;
        if (x < minX || x > maxX || y < minY || y > maxY) hasOverflow = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      });
    }

    if (!hasOverflow) return original;
    var padX = original.width * 0.025;
    var padY = original.height * 0.04;
    return {
      x: minX - padX,
      y: minY - padY,
      width: maxX - minX + padX * 2,
      height: maxY - minY + padY * 2
    };
  }

  function init(win) {
    var doc = win.document;
    var mapWrapper = doc.querySelector('.map-wrapper');
    if (!mapWrapper) {
      var flatMap = doc.querySelector('.zone-overlay');
      var flatPcs = doc.getElementById('pcs');
      if (flatMap && flatPcs) {
        mapWrapper = doc.createElement('div');
        mapWrapper.className = 'prime-map-stage';
        flatMap.parentNode.insertBefore(mapWrapper, flatMap);
        mapWrapper.appendChild(flatMap);
        mapWrapper.appendChild(flatPcs);
        var flatMessage = doc.getElementById('map-message');
        if (flatMessage) mapWrapper.appendChild(flatMessage);
      }
    }
    if (!mapWrapper || mapWrapper.dataset.primeDesktopReady === 'true') return;
    mapWrapper.dataset.primeDesktopReady = 'true';
    doc.documentElement.dataset.primeMapMode = 'fullscreen';

    var mapRatio = 450 / 800;
    var mapSvg = mapWrapper.querySelector('.map-svg, .zone-overlay, svg[viewBox]');
    var originalViewBox = mapSvg ? readViewBox(mapSvg) : null;
    var pcsLayer = mapWrapper.querySelector('#pcs');

    function updateMapGeometry() {
      if (!mapSvg || !originalViewBox) return;
      var detectedBounds = expandedMapBounds(mapSvg, pcsLayer, originalViewBox);
      var bounds = selectMapBounds(win.innerWidth, originalViewBox, detectedBounds);
      var frame = computeCoordinateFrame(originalViewBox, bounds);
      mapSvg.setAttribute('viewBox', [bounds.x, bounds.y, bounds.width, bounds.height].join(' '));
      mapWrapper.style.setProperty('--prime-pcs-left', frame.left + '%');
      mapWrapper.style.setProperty('--prime-pcs-top', frame.top + '%');
      mapWrapper.style.setProperty('--prime-pcs-width', frame.width + '%');
      mapWrapper.style.setProperty('--prime-pcs-height', frame.height + '%');
      mapRatio = bounds.width / bounds.height;
      mapWrapper.style.setProperty('--prime-map-ratio', String(mapRatio));
      mapWrapper.dataset.primeMapOrientation = bounds.width >= bounds.height ? 'landscape' : 'portrait';
    }

    if (mapSvg) {
      if (originalViewBox) {
        mapSvg.dataset.primeOriginalViewBox = [originalViewBox.x, originalViewBox.y, originalViewBox.width, originalViewBox.height].join(' ');
        updateMapGeometry();
      }
    }

    if (!doc.querySelector('.prime-map-statusbar')) {
      var statusbar = doc.createElement('div');
      statusbar.className = 'prime-map-statusbar';
      statusbar.setAttribute('aria-hidden', 'true');
      statusbar.appendChild(createElement(doc, 'span', 'prime-map-statusbar__label', 'КАРТА ЗАЛА'));
      statusbar.appendChild(createElement(doc, 'strong', 'prime-map-statusbar__club', doc.title || 'Prime'));
      statusbar.appendChild(createElement(doc, 'span', 'prime-map-statusbar__hint', 'Наведите на компьютер, чтобы увидеть данные'));
      doc.body.appendChild(statusbar);
    }

    function sizeDesktopMap() {
      if (win.innerWidth < 900) {
        mapWrapper.style.removeProperty('--prime-map-width');
        mapWrapper.style.removeProperty('--prime-map-height');
        return;
      }
      var dimensions = computeMapDimensions(win.innerWidth, win.innerHeight, mapRatio);
      mapWrapper.style.setProperty('--prime-map-width', dimensions.width + 'px');
      mapWrapper.style.setProperty('--prime-map-height', dimensions.height + 'px');
    }
    sizeDesktopMap();

    var pcByNumber = new Map();
    var lastPcs = [];
    var tooltip = createTooltip(doc);
    var activeMarker = null;
    var activePoint = null;
    var showTimer = null;
    var tickTimer = null;

    function computerNumber(pc) {
      if (!pc || typeof pc !== 'object') return '';
      var number = pc.num != null && pc.num !== '' ? pc.num : (pc.device_name || pc.id || '');
      return String(number);
    }

    function statusFor(marker, pc) {
      try {
        if (pc && typeof win.getStatusInfo === 'function') {
          var status = win.getStatusInfo(pc);
          if (status) return status;
        }
      } catch (error) {}
      return {
        name: marker.dataset.primeStatus || 'Статус неизвестен',
        kind: marker.dataset.primeKind || 'unknown',
        color: marker.style.backgroundColor || '#A5A7AD'
      };
    }

    function zoneFor(marker, pc) {
      var zoneId = marker.dataset.zone || '';
      try {
        if (!zoneId && typeof win.getZoneForPC === 'function') {
          var result = win.getZoneForPC(pc || marker.dataset.num || marker.textContent.trim());
          zoneId = typeof result === 'string' ? result : (result && result.id || '');
        }
      } catch (error) {}
      try {
        if (typeof win.PRIME_resolveSpec === 'function') {
          var club = typeof win.PRIME_getClubId === 'function' ? win.PRIME_getClubId() : 'arnau';
          var resolved = win.PRIME_resolveSpec(club, zoneId);
          if (resolved && resolved.data) return resolved.data;
        }
      } catch (error) {}
      return { title: zoneId || 'Зона', badge: '', specs: {} };
    }

    function enhanceMarkers(pcs) {
      lastPcs = Array.isArray(pcs) ? pcs : lastPcs;
      pcByNumber.clear();
      lastPcs.forEach(function (pc) {
        var number = computerNumber(pc);
        if (number) pcByNumber.set(number, pc);
      });

      doc.querySelectorAll('#pcs .pc').forEach(function (marker) {
        var number = String(marker.dataset.num || marker.textContent || '').trim();
        var pc = pcByNumber.get(number) || null;
        marker.__primePc = pc;
        marker.__primeReleaseTimestamp = getReleaseTimestamp(pc);
        var status = statusFor(marker, pc);
        marker.dataset.primeStatus = status.name || 'Статус неизвестен';
        marker.dataset.primeKind = status.kind || 'unknown';
        marker.setAttribute('role', 'button');
        marker.setAttribute('tabindex', '0');
        marker.setAttribute('aria-label', 'ПК ' + (number || '?') + ', ' + marker.dataset.primeStatus);
        marker.removeAttribute('title');
        if (marker.dataset.primeKeyboard !== 'true') {
          marker.dataset.primeKeyboard = 'true';
          marker.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              marker.click();
            }
          });
        }
      });
      updateMapGeometry();
      sizeDesktopMap();
    }

    function renderTooltip(marker) {
      var number = String(marker.dataset.num || marker.textContent || '').trim();
      var pc = marker.__primePc || pcByNumber.get(number) || {};
      var model = buildTooltipModel({
        number: number,
        status: statusFor(marker, pc),
        pc: pc,
        releaseTimestamp: marker.__primeReleaseTimestamp,
        zone: zoneFor(marker, pc)
      });
      paintTooltip(doc, tooltip, model);
      marker.setAttribute('aria-describedby', tooltip.id);
      tooltip.hidden = false;
      positionTooltip(win, tooltip, marker, activePoint);
      win.requestAnimationFrame(function () { tooltip.classList.add('is-visible'); });
    }

    function show(marker, point, immediate) {
      if (!marker) return;
      activeMarker = marker;
      activePoint = point || null;
      win.clearTimeout(showTimer);
      showTimer = win.setTimeout(function () {
        if (activeMarker !== marker) return;
        renderTooltip(marker);
        win.clearInterval(tickTimer);
        tickTimer = win.setInterval(function () {
          if (activeMarker === marker && !tooltip.hidden) renderTooltip(marker);
        }, 30000);
      }, immediate ? 0 : 180);
    }

    function hide() {
      win.clearTimeout(showTimer);
      win.clearInterval(tickTimer);
      if (activeMarker) activeMarker.removeAttribute('aria-describedby');
      activeMarker = null;
      activePoint = null;
      tooltip.classList.remove('is-visible');
      tooltip.hidden = true;
    }

    function wrapRenderPcs() {
      if (typeof win.renderPCs !== 'function' || win.renderPCs.__primeDesktopWrapped) return false;
      var original = win.renderPCs;
      var wrapped = function (pcs) {
        var result = original.apply(this, arguments);
        enhanceMarkers(pcs);
        return result;
      };
      wrapped.__primeDesktopWrapped = true;
      win.renderPCs = wrapped;
      return true;
    }

    wrapRenderPcs();
    enhanceMarkers([]);

    if (typeof win.MutationObserver === 'function') {
      var observer = new win.MutationObserver(function (changes) {
        var changed = changes.some(function (change) { return change.addedNodes.length > 0; });
        if (changed) enhanceMarkers(lastPcs);
      });
      var pcsContainer = doc.getElementById('pcs');
      if (pcsContainer) observer.observe(pcsContainer, { childList: true });
    }

    doc.addEventListener('mouseover', function (event) {
      if (!win.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      var marker = event.target.closest && event.target.closest('#pcs .pc');
      if (marker) show(marker, { x: event.clientX, y: event.clientY }, false);
    });
    doc.addEventListener('mousemove', function (event) {
      if (!activeMarker || tooltip.hidden) return;
      activePoint = { x: event.clientX, y: event.clientY };
      positionTooltip(win, tooltip, activeMarker, activePoint);
    });
    doc.addEventListener('mouseout', function (event) {
      var marker = event.target.closest && event.target.closest('#pcs .pc');
      if (marker && (!event.relatedTarget || !event.relatedTarget.closest || event.relatedTarget.closest('#pcs .pc') !== marker)) hide();
    });
    doc.addEventListener('focusin', function (event) {
      var marker = event.target.closest && event.target.closest('#pcs .pc');
      if (marker) show(marker, null, true);
    });
    doc.addEventListener('focusout', function (event) {
      var marker = event.target.closest && event.target.closest('#pcs .pc');
      if (marker) hide();
    });
    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && activeMarker) {
        hide();
        activeMarker.focus();
      }
    });
    doc.addEventListener('scroll', hide, true);
    win.addEventListener('resize', function () {
      updateMapGeometry();
      sizeDesktopMap();
      if (activeMarker && !tooltip.hidden) positionTooltip(win, tooltip, activeMarker, activePoint);
    });
  }

  function createElement(doc, tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function createTooltip(doc) {
    var tooltip = createElement(doc, 'div', 'prime-pc-tip');
    tooltip.id = 'prime-pc-telemetry';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    doc.body.appendChild(tooltip);
    return tooltip;
  }

  function paintTooltip(doc, tooltip, model) {
    var header = createElement(doc, 'div', 'prime-pc-tip__header');
    var identity = createElement(doc, 'div', 'prime-pc-tip__identity');
    identity.appendChild(createElement(doc, 'span', 'prime-pc-tip__eyebrow', 'КОМПЬЮТЕР'));
    identity.appendChild(createElement(doc, 'strong', 'prime-pc-tip__number', 'ПК ' + model.number));
    header.appendChild(identity);
    if (model.badge) header.appendChild(createElement(doc, 'span', 'prime-pc-tip__badge', model.badge));

    var zone = createElement(doc, 'div', 'prime-pc-tip__zone', model.zoneTitle);
    var availability = createElement(doc, 'div', 'prime-pc-tip__availability');
    var dot = createElement(doc, 'span', 'prime-pc-tip__dot');
    dot.style.backgroundColor = model.statusColor;
    availability.appendChild(dot);
    var availabilityText = createElement(doc, 'span', 'prime-pc-tip__availability-copy');
    availabilityText.appendChild(createElement(doc, 'strong', '', model.statusName));
    availabilityText.appendChild(createElement(doc, 'span', '', model.availability));
    availability.appendChild(availabilityText);

    var specs = createElement(doc, 'dl', 'prime-pc-tip__specs');
    model.specs.forEach(function (pair) {
      var row = createElement(doc, 'div', 'prime-pc-tip__spec');
      row.appendChild(createElement(doc, 'dt', '', pair[0]));
      row.appendChild(createElement(doc, 'dd', '', pair[1]));
      specs.appendChild(row);
    });

    tooltip.replaceChildren(header, zone, availability, specs);
  }

  function positionTooltip(win, tooltip, marker, point) {
    var padding = 16;
    var gap = 18;
    var rect = marker.getBoundingClientRect();
    var anchorX = point && Number.isFinite(point.x) ? point.x : rect.left + rect.width / 2;
    var anchorY = point && Number.isFinite(point.y) ? point.y : rect.top + rect.height / 2;
    var width = tooltip.offsetWidth || 352;
    var height = tooltip.offsetHeight || 290;
    var left = anchorX + gap;
    if (left + width > win.innerWidth - padding) left = anchorX - width - gap;
    left = Math.max(padding, Math.min(left, win.innerWidth - width - padding));
    var top = anchorY - height / 2;
    top = Math.max(padding, Math.min(top, win.innerHeight - height - padding));
    tooltip.style.left = Math.round(left) + 'px';
    tooltip.style.top = Math.round(top) + 'px';
  }

  return {
    getReleaseTimestamp: getReleaseTimestamp,
    formatRemaining: formatRemaining,
    getAvailabilityText: getAvailabilityText,
    buildTooltipModel: buildTooltipModel,
    computeMapDimensions: computeMapDimensions,
    computeCoordinateFrame: computeCoordinateFrame,
    selectMapBounds: selectMapBounds,
    init: init
  };
});
