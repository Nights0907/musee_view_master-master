<template>
  <v-card class="card-container inner-card-1" color="#FFF" elevation="0" ref="rootCard">
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
    <v-card-subtitle v-if="props.userName == 'user'" style="white-space: normal; font-size: 1.1rem;    line-height: 2rem;">{{ props.userMessage }}</v-card-subtitle>
    <v-card-subtitle v-else style="white-space: normal; font-size: 1.1rem;    line-height: 2rem;" v-html="renderedHtml"></v-card-subtitle>
  </v-card>
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
  avatarSrc: { // 更改 "vAvatar" 为实际用于表示图片源的 prop 名称，如 "avatarSrc"
    type: String,
    default: "",
  },
});

const renderedHtml = ref('');
const rootCard = ref(null);
let typingTimer = null;
let typingIndex = 0;
let isTyping = false;
const displayedText = ref('');

function renderMarkdownToHtml(markdownText) {
  try {
    const preprocessed = preprocessMarkdown(markdownText || '');
    const rawHtml = window.marked ? window.marked.parse(preprocessed) : preprocessed;
    const safeHtml = window.DOMPurify ? window.DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } }) : rawHtml;
    return safeHtml;
  } catch (e) {
    return markdownText || '';
  }
}

function typesetMath(container) {
  if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
    MathJax.typesetPromise(container ? [container] : undefined);
  }
}

function updateRendered() {
  if (props.userName === 'user') return;
  startTypingEffect(props.userMessage || '');
}

let hasMounted = false;

onMounted(() => {
  if (window.marked && typeof window.marked.setOptions === 'function') {
    window.marked.setOptions({
      gfm: true,
      breaks: true
    });
  }
  // 首次挂载：直接完整渲染（不启用打字机），避免刷新/切换时重播
  if (props.userName !== 'user') {
    renderedHtml.value = renderMarkdownToHtml(props.userMessage || '');
    nextTick(() => typesetMath(rootCard.value));
  }
  hasMounted = true;
});

watch(() => props.userMessage, (newVal, oldVal) => {
  // 仅在已挂载后且为模型回答，并且内容真实变化时启用打字机
  if (!hasMounted) return;
  if (props.userName === 'user') return;
  if (newVal === oldVal) return;
  startTypingEffect(newVal || '');
});

onBeforeUnmount(() => {
  stopTypingEffect();
});

function startTypingEffect(fullText) {
  stopTypingEffect();
  typingIndex = 0;
  displayedText.value = '';
  isTyping = true;

  const stepSize = 3; // 每次追加的字符数，平衡流畅与性能
  const intervalMs = 16; // 约 60fps

  typingTimer = setInterval(() => {
    if (typingIndex >= fullText.length) {
      stopTypingEffect();
      // 最终一次性按 Markdown 渲染并进行 MathJax 排版
      renderedHtml.value = renderMarkdownToHtml(fullText);
      nextTick(() => typesetMath(rootCard.value));
      return;
    }
    const nextIndex = Math.min(fullText.length, typingIndex + stepSize);
    displayedText.value = fullText.slice(0, nextIndex);
    typingIndex = nextIndex;
    // 输入中：渲染为纯文本 + 换行，避免频繁重排复杂 Markdown/MathJax
    renderedHtml.value = toPlainHtml(displayedText.value);
  }, intervalMs);
}

function stopTypingEffect() {
  if (typingTimer) {
    clearInterval(typingTimer);
    typingTimer = null;
  }
  isTyping = false;
}

function toPlainHtml(text) {
  return escapeHtml(text)
    .replace(/\n/g, '<br>');
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function preprocessMarkdown(text) {
  // 1) 标准化换行/制表符（先不动字面 \\n，避免影响 LaTeX 如 \\neq）
  let t = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '    ');

  // 2) 保护区：先提取并占位，避免后续规则破坏公式/代码
  const placeholders = [];
  const pushPlaceholder = (match) => {
    const key = `__PLACEHOLDER_${placeholders.length}__`;
    placeholders.push({ key, value: match });
    return key;
  };

  // 2.1 Fenced code blocks ```...```
  t = t.replace(/```[\s\S]*?```/g, pushPlaceholder);
  // 2.2 Inline code `...`
  t = t.replace(/`[^`\n]+`/g, pushPlaceholder);
  // 2.3 MathJax block $$...$$ (multiline)
  t = t.replace(/\$\$[\s\S]*?\$\$/g, pushPlaceholder);
  // 2.4 MathJax block \[ ... \] (multiline)
  t = t.replace(/\\\[[\s\S]*?\\\]/g, pushPlaceholder);
  // 2.5 MathJax inline \( ... \)
  t = t.replace(/\\\([^\)]*?\\\)/g, pushPlaceholder);
  // 2.6 MathJax inline $...$ (avoid spanning newlines)
  t = t.replace(/\$[^\$\n]+\$/g, pushPlaceholder);

  // 3) 在受保护外部，将字面 \\n 转为真实换行
  t = t.replace(/\\n/g, '\n');

  // 4) 安全文本上的 Markdown 助力换行/空行插入
  // 标题：在非行首或冒号后紧跟的标题前插入空行
  t = t.replace(/([^\n])\s+(#{1,6}\s+)/g, '$1\n\n$2');
  t = t.replace(/([：:])\s+(#{1,6}\s+)/g, '$1\n\n$2');
  // 列表项：在非行首或冒号后紧跟的 - 前插入换行
  t = t.replace(/([^\n])\s+(-\s+)/g, '$1\n$2');
  t = t.replace(/([：:])\s+(-\s+)/g, '$1\n$2');

  // 5) 还原占位内容
  for (let i = placeholders.length - 1; i >= 0; i--) {
    const { key, value } = placeholders[i];
    t = t.replace(key, value);
  }

  return t;
}
</script>

<style>
.card-container {
  margin: 30px 10px;
  flex: 1;
}
</style>