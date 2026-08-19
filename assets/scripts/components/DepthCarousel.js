/**
 * DepthCarousel — React Bits 组件的 Vue 3 移植版（零依赖：无 React / 无 gsap）。
 *
 * 移植说明：
 * - React 外壳 → Vue 3 Composition API（window.Vue 全局版，与项目 main.js 一致）。
 * - gsap `gsap.to(proxy, { p, duration, ease, onUpdate, onComplete })` 单条补间
 *   → 原生 requestAnimationFrame 补间（正文见 tweenTo）。
 * - power3.out 等缓动以数学公式等价实现（见 EASINGS），未知缓动名回退 power3.out。
 * - 热路径（rAF 逐帧 layout）直接写 el.style，不经过 Vue 响应式，性能与 React 版一致。
 */

const { defineComponent, ref, computed, watch, onMounted, onBeforeUnmount, nextTick } = window.Vue;

const DEFAULT_ITEMS = [
  { image: 'https://picsum.photos/seed/depth1/800/1000', alt: 'Slide 1' },
  { image: 'https://picsum.photos/seed/depth2/800/1000', alt: 'Slide 2' },
  { image: 'https://picsum.photos/seed/depth3/800/1000', alt: 'Slide 3' },
  { image: 'https://picsum.photos/seed/depth4/800/1000', alt: 'Slide 4' },
  { image: 'https://picsum.photos/seed/depth5/800/1000', alt: 'Slide 5' },
  { image: 'https://picsum.photos/seed/depth6/800/1000', alt: 'Slide 6' }
];

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const normalizeItem = it => (typeof it === 'string' ? { image: it, alt: '' } : it);

// GSAP 常用缓动的数学等价公式（等价性：power3.out === cubic-bezier(0.215,0.61,0.355,1)）
const EASINGS = {
  linear: t => t,
  none: t => t,
  'power1.out': t => 1 - (1 - t),
  'power2.out': t => 1 - (1 - t) * (1 - t),
  'power3.out': t => 1 - Math.pow(1 - t, 3),
  'power4.out': t => 1 - Math.pow(1 - t, 4),
  'power1.in': t => t,
  'power2.in': t => t * t,
  'power3.in': t => t * t * t,
  'power4.in': t => t * t * t * t,
  'power1.inOut': t => t,
  'power2.inOut': t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  'power3.inOut': t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  'power4.inOut': t => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2)
};
const resolveEase = name => (Object.prototype.hasOwnProperty.call(EASINGS, name) ? EASINGS[name] : EASINGS['power3.out']);

export const DepthCarousel = defineComponent({
  name: 'DepthCarousel',
  props: {
    items: { type: Array, default: () => DEFAULT_ITEMS.slice() },
    cardWidth: { type: Number, default: 300 },
    cardHeight: { type: Number, default: 380 },
    radius: { type: Number, default: 18 },
    tint: { type: String, default: '#05060a' },
    depth: { type: Number, default: 220 },
    spread: { type: Number, default: 90 },
    tilt: { type: Number, default: 22 },
    tiltDirection: { type: String, default: 'right' },
    perspective: { type: Number, default: 1400 },
    visibleCards: { type: Number, default: 4 },
    falloff: { type: Number, default: 0.2 },
    blur: { type: Number, default: 6 },
    duration: { type: Number, default: 700 },
    ease: { type: String, default: 'power3.out' },
    autoplay: { type: Boolean, default: false },
    autoplayDelay: { type: Number, default: 3200 },
    loop: { type: Boolean, default: true },
    showControls: { type: Boolean, default: true },
    showIndicators: { type: Boolean, default: true },
    // 对称扇形：开启时聚焦卡居中，左侧同样展示已翻过的卡片向后退去（而非只在单侧堆叠）
    symmetric: { type: Boolean, default: true },
    // HTML 卡片内容：items[i].html 存在时渲染该 HTML（缩放到卡片尺寸）替代 <img>。
    // contentWidth/contentHeight 为 HTML 内容的原始逻辑尺寸（用于等比缩放）。
    contentWidth: { type: Number, default: 540 },
    contentHeight: { type: Number, default: 720 },
    className: { type: String, default: '' },
    onChange: { type: Function, default: null }
  },

  setup(props) {
    const data = computed(() => (Array.isArray(props.items) ? props.items : []).map(normalizeItem));
    const count = computed(() => data.value.length);

    const rootEl = ref(null);
    const active = ref(0);

    const cardEls = [];
    const overlayEls = [];

    let pos = 0;
    let focus = 0;
    let scale = 1;
    let reduced = false;
    let rafId = null;
    let tweenGen = 0;
    let wheelTimer = null;
    let autoTimer = null;
    let resizeObserver = null;
    let drag = null;

    // ── prefers-reduced-motion ──
    let motionQuery = null;
    if (typeof window !== 'undefined') {
      motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
      reduced = !!motionQuery?.matches;
      try {
        motionQuery?.addEventListener?.('change', e => {
          reduced = e.matches;
        });
      } catch (_err) {
        // ignore
      }
    }

    // ── layout：与 React 版逐行等价（帧内直接写样式，无响应式开销） ──
    const layout = p => {
      const n = count.value;
      if (!n) return;
      const dir = props.tiltDirection === 'left' ? -1 : 1;
      const sc = scale;

      for (let i = 0; i < n; i++) {
        const el = cardEls[i];
        if (!el) continue;

        let d = i - p;
        if (props.loop && n > 1) {
          d = ((d % n) + n) % n;
          if (d > n / 2) d -= n;
        }

        const az = Math.abs(d);
        const back = props.symmetric ? az : Math.max(0, d);
        const shown = az <= props.visibleCards + 0.5;

        let tz, tx, ry;
        if (props.symmetric) {
          // 双侧扇形：d>0（未翻）铺右侧、d<0（已翻）铺左侧，镜像旋转
          const side = d >= 0 ? 1 : -1;
          tz = -props.depth * az;
          tx = side * dir * props.spread * az;
          ry = side * dir * props.tilt * clamp(az, 0, 1);
        } else {
          // 单侧扇形（React Bits 原版行为）：统一铺向 tiltDirection 一侧
          tz = -props.depth * d;
          tx = dir * props.spread * d;
          ry = dir * props.tilt * clamp(d, 0, 1);
        }

        let opacity = !props.symmetric && d < 0 ? Math.max(0, 1 + d) : 1;
        if (!shown) opacity = 0;

        const brightness = Math.max(0.15, 1 - back * props.falloff);
        const blurPx = props.blur > 0 ? Math.min(props.blur, (back / Math.max(1, props.visibleCards)) * props.blur) : 0;
        const zi = Math.round(2000 - (props.symmetric ? az : d) * 20);

        el.style.transform = `translate(-50%, -50%) scale(${sc}) translateX(${tx.toFixed(2)}px) translateZ(${tz.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg)`;
        el.style.opacity = opacity.toFixed(3);
        el.style.filter = `brightness(${brightness.toFixed(3)}) blur(${blurPx.toFixed(2)}px)`;
        el.style.zIndex = String(zi);
        el.style.pointerEvents = shown && opacity > 0.05 ? 'auto' : 'none';

        const ov = overlayEls[i];
        if (ov) ov.style.opacity = clamp(back * props.falloff * 1.25, 0, 0.86).toFixed(3);
      }
    };

    const cancelTween = () => {
      tweenGen++;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    };

    const finish = () => {
      const n = count.value;
      if (n > 0) pos = ((pos % n) + n) % n;
      layout(pos);
    };

    // ── rAF 补间：等价替代 gsap.to(proxy, { p, duration, ease, onUpdate, onComplete }) ──
    const tweenTo = (target, animate) => {
      cancelTween();
      if (!count.value) return;
      const start = pos;
      const dur = animate && !reduced ? props.duration / 1000 : 0;

      if (dur <= 0) {
        pos = target;
        finish();
        return;
      }

      const ease = resolveEase(props.ease);
      const t0 = performance.now();
      const myGen = ++tweenGen;

      const tick = now => {
        if (myGen !== tweenGen) return;
        const t = Math.min((now - t0) / (dur * 1000), 1);
        pos = start + (target - start) * ease(t);
        layout(pos);
        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          rafId = null;
          finish();
        }
      };
      rafId = requestAnimationFrame(tick);
    };

    const notify = idx => {
      active.value = idx;
      if (typeof props.onChange === 'function') props.onChange(idx, data.value[idx]);
    };

    const setFocus = (rawIndex, animate = true) => {
      const n = count.value;
      if (!n) return;
      const idx = props.loop ? ((rawIndex % n) + n) % n : clamp(rawIndex, 0, n - 1);
      let delta = idx - pos;
      if (props.loop && n > 1) {
        delta = ((delta % n) + n) % n;
        if (delta > n / 2) delta -= n;
      }
      tweenTo(pos + delta, animate);
      if (idx !== focus) {
        focus = idx;
        notify(idx);
      }
    };

    const navigateBy = step => setFocus(focus + step, true);

    // ── 交互：拖拽 + 惯性 / 滚轮 / 点击 / 键盘 ──
    const onPointerDown = e => {
      if (count.value < 2) return;
      cancelTween();
      drag = {
        x: e.clientX,
        startPos: pos,
        lastX: e.clientX,
        lastT: performance.now(),
        v: 0,
        moved: false,
        id: e.pointerId
      };
    };

    const onPointerMove = e => {
      if (!drag) return;
      const stepPx = Math.max(props.cardWidth * 0.55 * scale, 40);
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 4) {
        drag.moved = true;
        rootEl.value?.setPointerCapture(drag.id);
      }
      if (!drag.moved) return;
      const now = performance.now();
      const dt = Math.max(now - drag.lastT, 1);
      drag.v = (e.clientX - drag.lastX) / dt;
      drag.lastX = e.clientX;
      drag.lastT = now;
      pos = drag.startPos - dx / stepPx;
      layout(pos);
    };

    const onPointerEnd = () => {
      if (!drag) return;
      const moved = drag.moved;
      const velocity = drag.v;
      drag = null;
      if (!moved) return;
      const stepPx = Math.max(props.cardWidth * 0.55 * scale, 40);
      const projected = pos - (velocity * 180) / stepPx;
      setFocus(Math.round(projected), true);
    };

    const onKeyDown = e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateBy(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateBy(1);
      }
    };

    const onCardClick = index => {
      if (drag && drag.moved) return;
      setFocus(index, true);
    };

    // ── 滚轮 ──
    const onWheel = e => {
      if (count.value < 2) return;
      e.preventDefault();
      cancelTween();
      const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const delta = e.deltaMode === 1 ? raw * 24 : raw;
      const step = clamp(delta / (props.cardWidth * 0.9), -0.6, 0.6);
      pos += step;
      layout(pos);
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => setFocus(Math.round(pos), true), 130);
    };

    // ── ResizeObserver 缩放 ──
    const onResize = w => {
      const needed = props.cardWidth + Math.abs(props.spread) * 2 + 120;
      scale = clamp(w / needed, 0.4, 1);
      layout(pos);
    };

    // refs 收集
    const setCardRef = (el, i) => {
      cardEls[i] = el;
    };
    const setOverlayRef = (el, i) => {
      overlayEls[i] = el;
    };

    // HTML 卡片内容：按卡片尺寸等比 cover 缩放（类似 object-fit: cover）
    const htmlFitStyle = computed(() => {
      const s = Math.max(props.cardWidth / props.contentWidth, props.cardHeight / props.contentHeight);
      return {
        width: props.contentWidth + 'px',
        height: props.contentHeight + 'px',
        transform: `scale(${s})`
      };
    });

    // ── 生命周期 ──
    onMounted(async () => {
      await nextTick();
      layout(pos);

      if (rootEl.value && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(entries => {
          const w = entries[0]?.contentRect?.width;
          if (w) onResize(w);
        });
        resizeObserver.observe(rootEl.value);
      }

      rootEl.value?.addEventListener('wheel', onWheel, { passive: false });
    });

    onBeforeUnmount(() => {
      cancelTween();
      if (wheelTimer) clearTimeout(wheelTimer);
      if (autoTimer) clearInterval(autoTimer);
      resizeObserver?.disconnect();
      resizeObserver = null;
      rootEl.value?.removeEventListener('wheel', onWheel);
      try {
        motionQuery?.removeEventListener?.('change', () => {});
      } catch (_err) {
        // ignore
      }
    });

    // props / items 变化时重排
    watch(
      () => [
        props.depth,
        props.spread,
        props.tilt,
        props.tiltDirection,
        props.visibleCards,
        props.falloff,
        props.blur,
        props.cardWidth,
        props.cardHeight,
        props.radius,
        props.symmetric,
        count.value
      ],
      () => layout(pos),
      { immediate: true, flush: 'post' }
    );

    // 自动播放（hover / focus 暂停）
    watch(
      [() => props.autoplay, () => props.autoplayDelay, count],
      ([auto], _newDelay, onCleanup) => {
        if (!auto || reduced || count.value < 2) return;
        const root = rootEl.value;
        let hovered = false;
        let focused = false;
        const stop = () => {
          if (autoTimer) clearInterval(autoTimer);
          autoTimer = null;
        };
        const start = () => {
          stop();
          autoTimer = setInterval(
            () => {
              if (!hovered && !focused) navigateBy(1);
            },
            Math.max(props.autoplayDelay, 600)
          );
        };
        const onEnter = () => {
          hovered = true;
        };
        const onLeave = () => {
          hovered = false;
        };
        const onFocusIn = () => {
          focused = true;
        };
        const onFocusOut = () => {
          focused = false;
        };
        root?.addEventListener('mouseenter', onEnter);
        root?.addEventListener('mouseleave', onLeave);
        root?.addEventListener('focusin', onFocusIn);
        root?.addEventListener('focusout', onFocusOut);
        start();
        onCleanup(() => {
          stop();
          root?.removeEventListener('mouseenter', onEnter);
          root?.removeEventListener('mouseleave', onLeave);
          root?.removeEventListener('focusin', onFocusIn);
          root?.removeEventListener('focusout', onFocusOut);
        });
      },
      { immediate: true }
    );

    return {
      data,
      count,
      active,
      rootEl,
      htmlFitStyle,
      setCardRef,
      setOverlayRef,
      onPointerDown,
      onPointerMove,
      onPointerEnd,
      onKeyDown,
      onCardClick,
      navigateBy,
      setFocus
    };
  },

  template: `
  <div
    ref="rootEl"
    :class="['depth-carousel', className].filter(Boolean).join(' ')"
    :style="{ '--dc-perspective': perspective + 'px' }"
    role="group"
    aria-roledescription="carousel"
    aria-label="Depth carousel"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
    @keydown="onKeyDown"
  >
    <div class="depth-carousel__stage">
      <div
        v-for="(item, i) in data"
        :key="i"
        class="depth-carousel__card"
        :ref="el => setCardRef(el, i)"
        :style="{ width: cardWidth + 'px', height: cardHeight + 'px', borderRadius: radius + 'px' }"
        aria-roledescription="slide"
        :aria-label="(i + 1) + ' of ' + count"
        :aria-hidden="active !== i"
        @click="onCardClick(i)"
      >
        <template v-if="item.html">
          <div class="depth-carousel__html">
            <div class="depth-carousel__html-fit" :style="htmlFitStyle" v-html="item.html"></div>
          </div>
        </template>
        <img
          v-else
          class="depth-carousel__img"
          :src="item.image"
          :alt="item.alt || ''"
          draggable="false"
        />
        <span
          class="depth-carousel__tint"
          :ref="el => setOverlayRef(el, i)"
          :style="{ background: tint }"
        ></span>
      </div>
    </div>

    <template v-if="showControls && count > 1">
      <button
        type="button"
        class="depth-carousel__arrow depth-carousel__arrow--prev"
        aria-label="Previous slide"
        @click="navigateBy(-1)"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      </button>
      <button
        type="button"
        class="depth-carousel__arrow depth-carousel__arrow--next"
        aria-label="Next slide"
        @click="navigateBy(1)"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      </button>
    </template>

    <template v-if="showIndicators && count > 1">
      <div class="depth-carousel__dots" role="tablist" aria-label="Slides">
        <button
          v-for="(_, i) in data"
          :key="i"
          type="button"
          role="tab"
          :aria-selected="active === i"
          :aria-label="'Go to slide ' + (i + 1)"
          :class="['depth-carousel__dot', { 'is-active': active === i }]"
          @click="setFocus(i, true)"
        ></button>
      </div>
    </template>
  </div>
  `
});

export default DepthCarousel;