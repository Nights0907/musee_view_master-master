<template>
  <div ref="rootCard">
    <v-card class="card-container inner-card-1" color="#FFF" elevation="0">
      <v-card-actions>
        <v-list-item class="w-100">
          <template v-slot:prepend>
            <v-avatar color="grey-darken-3"
              image="https://avataaars.io/?avatarStyle=Transparent&topType=ShortHairShortCurly&accessoriesType=Prescription02&hairColor=Black&facialHairType=Blank&clotheType=Hoodie&clotheColor=White&eyeType=Default&eyebrowType=DefaultNatural&mouthType=Default&skinColor=Light"
              v-if="props.userName == 'user'"></v-avatar>
            <v-avatar color="grey-lignt-3" v-else>
              <GPTSVGComponent></GPTSVGComponent>
            </v-avatar>
          </template>
          <v-list-item-title>{{ props.userName == 'user' ? props.userName : "ChatGPT" }}</v-list-item-title>
          <v-list-item-subtitle>{{ props.userName == 'user' ? props.userInfo : "沐斯慧教AI大模型" }}</v-list-item-subtitle>
        </v-list-item>
      </v-card-actions>
      <v-card-subtitle v-if="props.userName == 'user'" class="message-content user-content">{{ props.userMessage }}</v-card-subtitle>
      <v-card-subtitle v-else class="message-content markdown-content" v-html="renderedHtml"></v-card-subtitle>
    </v-card>
  </div>
</template>

<script setup>
import { defineProps, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import GPTSVGComponent from '../GPTSVGComponent.vue';
const props = defineProps({
  userMessage: {
    type: String,
    default: "",
  },
  userName: {
    type: String,
    default: "",
  },
  userInfo: {
    type: String,
    default: "",
  },
  avatarSrc: {
    type: String,
    default: "",
  },
  typing: {
    type: Boolean,
    default: false,
  },
});

const renderedHtml = ref('');
const rootCard = ref(null);
const displayedText = ref('');
let typingTimer = null;
let renderTimer = null;
let targetText = '';
let typesetTimer = null;
let typesetPromise = Promise.resolve();
let typesetRetryCount = 0;
let pendingFinalTypeset = false;

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function preprocessMarkdown(markdownText) {
  return markdownText
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s*---\s*/g, '\n\n')
    .replace(/\\\[/g, '\n\\[')
    .replace(/\\\]/g, '\\]\n')
    .replace(/([^\n])(```)/g, '$1\n\n$2')
    .replace(/(```[^\n]*)\n?/g, '$1\n')
    .replace(/([^\n。！？.!?])\s*(#{1,6}\s)/g, '$1\n\n$2')
    .replace(/([。！？.!?])\s*(#{1,6}\s)/g, '$1\n\n$2')
    .replace(/([。！？.!?])\s*((?:[-*+]|\d+\.)\s+)/g, '$1\n$2');
}

function replaceMalformedMath(markdownText) {
  const fallback = '<span class="math-fallback">公式暂时无法显示</span>';
  let text = markdownText;

  const replaceUnclosedFromLastOpen = (source, open, close) => {
    const openIndex = source.lastIndexOf(open);
    if (openIndex === -1 || source.indexOf(close, openIndex + open.length) !== -1) return source;
    return `${source.slice(0, openIndex)}${fallback}`;
  };

  text = replaceUnclosedFromLastOpen(text, '\\[', '\\]');
  text = replaceUnclosedFromLastOpen(text, '\\(', '\\)');

  const displayDollarMatches = text.match(/\$\$/g);
  if (displayDollarMatches && displayDollarMatches.length % 2 === 1) {
    text = `${text.slice(0, text.lastIndexOf('$$'))}${fallback}`;
  }
  text = text.replace(/(?<!\$)\$[^\n$]*$/g, fallback);

  return text;
}

function protectMath(markdownText) {
  const mathBlocks = [];
  const protectedText = replaceMalformedMath(markdownText).replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\$)\$[^\n$]+?\$(?!\$))/g, (match) => {
    const token = `@@MATH_${mathBlocks.length}@@`;
    mathBlocks.push(match);
    return token;
  });
  return { protectedText, mathBlocks };
}

function restoreMath(html, mathBlocks) {
  return mathBlocks.reduce((result, math, index) => result.replace(`@@MATH_${index}@@`, math), html);
}

function hideMathErrors(element) {
  element.querySelectorAll('mjx-container[jax="CHTML"][display="true"] mjx-merror, mjx-container[jax="CHTML"] mjx-merror').forEach((errorNode) => {
    const container = errorNode.closest('mjx-container');
    if (container) {
      container.outerHTML = '<span class="math-fallback">公式暂时无法显示</span>';
    }
  });
}

function renderMarkdownToHtml(markdownText) {
  try {
    const preprocessed = preprocessMarkdown(markdownText || '');
    const { protectedText, mathBlocks } = protectMath(preprocessed);
    const rawHtml = window.marked ? window.marked.parse(protectedText, { breaks: true, gfm: true }) : escapeHtml(protectedText).replace(/\n/g, '<br>');
    const restoredHtml = restoreMath(rawHtml, mathBlocks);
    return window.DOMPurify ? window.DOMPurify.sanitize(restoredHtml, { USE_PROFILES: { html: true } }) : restoredHtml;
  } catch (e) {
    return escapeHtml(markdownText || '').replace(/\n/g, '<br>');
  }
}

function runTypeset() {
  if (!rootCard.value) return;
  if (!window.MathJax || typeof MathJax.typesetPromise !== 'function') {
    if (typesetRetryCount < 20) {
      typesetRetryCount += 1;
      scheduleTypeset(200);
    }
    return;
  }

  typesetRetryCount = 0;
  const element = rootCard.value;
  typesetPromise = typesetPromise
    .catch(() => {})
    .then(() => {
      if (typeof MathJax.typesetClear === 'function') {
        MathJax.typesetClear([element]);
      }
      return MathJax.typesetPromise([element]).then(() => hideMathErrors(element));
    })
    .catch(() => hideMathErrors(element));
}

function scheduleTypeset(delay = 260) {
  clearTimeout(typesetTimer);
  typesetTimer = setTimeout(runTypeset, delay);
}

function updateRendered(finalTypeset = false) {
  renderedHtml.value = renderMarkdownToHtml(displayedText.value);
  nextTick(() => scheduleTypeset(finalTypeset ? 0 : 260));
}

function scheduleRenderedUpdate(finalTypeset = false) {
  pendingFinalTypeset = pendingFinalTypeset || finalTypeset;
  if (renderTimer) return;
  renderTimer = requestAnimationFrame(() => {
    const shouldFinalTypeset = pendingFinalTypeset;
    pendingFinalTypeset = false;
    renderTimer = null;
    updateRendered(shouldFinalTypeset);
  });
}

function typeNextChunk() {
  if (displayedText.value.length >= targetText.length) {
    typingTimer = null;
    scheduleRenderedUpdate(true);
    return;
  }

  const remaining = targetText.length - displayedText.value.length;
  const step = remaining > 120 ? 6 : remaining > 40 ? 3 : 1;
  displayedText.value = targetText.slice(0, displayedText.value.length + step);
  scheduleRenderedUpdate(!props.typing);
  typingTimer = setTimeout(typeNextChunk, 18);
}

function syncTargetText(nextText) {
  if (props.userName === 'user') return;
  nextText = nextText || '';

  if (!props.typing) {
    displayedText.value = nextText;
    targetText = nextText;
    clearTimeout(typingTimer);
    typingTimer = null;
    scheduleRenderedUpdate(!props.typing);
    return;
  }

  if (!nextText.startsWith(displayedText.value)) {
    displayedText.value = nextText;
    targetText = nextText;
    scheduleRenderedUpdate(!props.typing);
    return;
  }

  targetText = nextText;
  if (!typingTimer) {
    typeNextChunk();
  }
}

onMounted(() => syncTargetText(props.userMessage));
watch(() => props.userMessage, syncTargetText);
watch(() => props.typing, () => syncTargetText(props.userMessage));
onBeforeUnmount(() => {
  clearTimeout(typingTimer);
  clearTimeout(typesetTimer);
  if (renderTimer) cancelAnimationFrame(renderTimer);
});
</script>

<style>
.card-container {
  margin: 30px 10px;
  flex: 1;
}

.message-content {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  font-size: 1rem;
  line-height: 1.75rem;
  overflow-wrap: anywhere;
  word-break: break-word;
  word-wrap: break-word;
}

.markdown-content :where(p, ul, ol, blockquote, pre, table) {
  max-width: 100%;
  margin: 0.45rem 0;
}

.markdown-content :where(p, li, blockquote) {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.markdown-content :where(h1, h2, h3, h4, h5, h6) {
  margin: 0.9rem 0 0.45rem;
  line-height: 1.45;
  font-weight: 700;
}

.markdown-content :where(ul, ol) {
  padding-left: 1.35rem;
}

.markdown-content li {
  margin: 0.2rem 0;
}

.markdown-content li > p {
  margin: 0.2rem 0;
}

.markdown-content pre {
  max-width: 100%;
  padding: 0.75rem 0.9rem;
  overflow-x: auto;
  white-space: pre-wrap;
  border-radius: 8px;
  background: #f6f8fa;
  line-height: 1.55;
}

.markdown-content code {
  padding: 0.12rem 0.28rem;
  border-radius: 4px;
  background: #f6f8fa;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.markdown-content .math-fallback {
  display: inline-block;
  padding: 0.08rem 0.35rem;
  border-radius: 4px;
  color: #6b7280;
  background: #f3f4f6;
}

.markdown-content pre code {
  padding: 0;
  background: transparent;
}

.markdown-content img {
  max-width: 100%;
  height: auto;
}

.markdown-content table {
  display: block;
  overflow-x: auto;
  border-collapse: collapse;
}

.markdown-content th,
.markdown-content td {
  padding: 0.35rem 0.5rem;
  border: 1px solid #e5e7eb;
}

.markdown-content > :first-child {
  margin-top: 0;
}

.markdown-content > :last-child {
  margin-bottom: 0;
}
</style>