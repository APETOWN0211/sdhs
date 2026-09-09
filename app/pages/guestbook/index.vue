<script setup lang="ts">
import type { GuestbookEntry } from '~/composables/useGuestbook'

useSeoMeta({
  title: '방명록 - ROLL ON!',
  ogTitle: '방명록',
  description: '서울디자인고등학교 크리에이티브 디자인과 2기 졸업전시 방명록'
})

const { fetchEntries, addEntry } = useGuestbook()

// SSR-safe: useAsyncData로 서버/클라이언트 데이터 일관성 유지
const { data: entries, refresh: refreshEntries, pending: loading } = await useAsyncData(
  'guestbook-entries',
  () => fetchEntries(),
  {
    // SSR에서 가져온 데이터를 클라이언트에서 즉시 사용할 수 있도록 보장
    default: () => [] as GuestbookEntry[]
  }
)

// 날짜 포맷
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// 작성 폼 모달 상태
const isFormOpen = ref(false)
const form = reactive({
  name: '',
  message: ''
})
const submitting = ref(false)
const error = ref('')

const isFormValid = computed(() => {
  return form.name.trim().length > 0 && form.message.trim().length > 0
})

// 상세 모달 상태
const selectedEntry = ref<GuestbookEntry | null>(null)

const openDetail = (entry: GuestbookEntry) => {
  selectedEntry.value = entry
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
  }
}

const closeDetail = () => {
  selectedEntry.value = null
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
}

const openForm = () => {
  isFormOpen.value = true
  form.name = ''
  form.message = ''
  error.value = ''
  // body 스크롤 잠금
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
  }
}

const closeForm = () => {
  isFormOpen.value = false
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
}

const handleSubmit = async () => {
  if (!isFormValid.value || submitting.value) return

  submitting.value = true
  error.value = ''

  const newEntry = await addEntry(form.name, form.message)

  if (newEntry) {
    // 서버에서 반환된 새 항목을 즉시 앞에 추가 (UI 즉시 반영)
    if (entries.value) {
      entries.value = [newEntry, ...entries.value]
    } else {
      entries.value = [newEntry]
    }
    closeForm()
  } else {
    error.value = '등록에 실패했습니다. 다시 시도해주세요.'
  }

  submitting.value = false
}

// ESC로 모달 닫기
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    if (isFormOpen.value) {
      closeForm()
    } else if (selectedEntry.value) {
      closeDetail()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

// URL 변경 시 목록 새로고침 (별도 페이지에서 돌아왔을 때)
const route = useRoute()
watch(() => route.fullPath, () => {
  refreshEntries()
})
</script>

<template>
  <div class="guestbook">
    <div class="guestbook__container">
      <!-- 헤더 -->
      <header class="guestbook-header">
        <h1 class="guestbook-header__title">방명록</h1>
        <button type="button" class="guestbook-header__btn" @click="openForm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          방명록 추가
        </button>
      </header>

      <!-- 로딩 중 -->
      <div v-if="loading" class="guestbook-loading">
        <div class="guestbook-loading__dot"></div>
        <div class="guestbook-loading__dot"></div>
        <div class="guestbook-loading__dot"></div>
      </div>

      <!-- 방명록 카드 목록 -->
      <div v-else-if="entries?.length" class="guestbook-grid">
        <article
          v-for="(entry, index) in entries"
          :key="entry.id"
          class="guestbook-card"
          data-animate="fade-up"
          :data-animate-delay="String(index * 30)"
          @click="openDetail(entry)"
        >
          <div class="guestbook-card__content">
            <p class="guestbook-card__message">{{ entry.message }}</p>
          </div>
          <div class="guestbook-card__author">
            <span class="guestbook-card__name">{{ entry.name }}</span>
            <time class="guestbook-card__date">{{ formatDate(entry.created_at) }}</time>
          </div>
        </article>
      </div>

      <!-- 빈 상태 -->
      <div v-else class="guestbook-empty">
        <p class="guestbook-empty__text">아직 방명록이 없습니다.</p>
        <button type="button" class="guestbook-empty__btn" @click="openForm">
          첫 번째 메시지를 남겨보세요
        </button>
      </div>
    </div>

    <!-- 작성 모달 -->
    <Transition name="modal">
      <div v-if="isFormOpen" class="modal" @click.self="closeForm">
        <div class="modal__panel">
          <header class="modal__header">
            <h2 class="modal__title">방명록 작성</h2>
            <button type="button" class="modal__close" @click="closeForm" aria-label="닫기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </header>

          <form class="modal__form" @submit.prevent="handleSubmit">
            <input
              v-model="form.name"
              type="text"
              class="modal__input"
              placeholder="이름"
              maxlength="20"
              autocomplete="off"
            />

            <textarea
              v-model="form.message"
              class="modal__textarea"
              placeholder="메시지를 남겨주세요"
              maxlength="200"
              rows="5"
            ></textarea>

            <p v-if="error" class="modal__error">{{ error }}</p>

            <div class="modal__actions">
              <button
                type="submit"
                class="modal__submit"
                :disabled="!isFormValid || submitting"
              >
                {{ submitting ? '등록 중...' : '등록' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- 상세 모달 -->
    <Transition name="modal">
      <div v-if="selectedEntry" class="modal" @click.self="closeDetail">
        <div class="modal__panel modal__panel--detail">
          <header class="modal__header">
            <span class="modal__date">{{ formatDate(selectedEntry.created_at) }}</span>
            <button type="button" class="modal__close" @click="closeDetail" aria-label="닫기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </header>
          <div class="modal__body">
            <p class="modal__message">{{ selectedEntry.message }}</p>
          </div>
          <div class="modal__author">
            <span class="modal__name">{{ selectedEntry.name }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.guestbook {
  width: 100%;
  background-color: var(--color-white);
}

.guestbook__container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 45px 64px 80px;
}

/* ============================================
   헤더
   ============================================ */
.guestbook-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40px;
}

.guestbook-header__title {
  font-family: var(--font-family-base);
  font-size: 48px;
  font-weight: var(--font-weight-bold);
  color: var(--color-black);
  margin: 0;
  letter-spacing: -0.02em;
}

.guestbook-header__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-family-base);
  font-size: 18px;
  font-weight: var(--font-weight-medium);
  color: var(--color-white);
  background: var(--color-black);
  border: none;
  padding: 14px 28px;
  border-radius: 50px;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.1s ease;
}

.guestbook-header__btn:hover {
  opacity: 0.85;
}

.guestbook-header__btn:active {
  transform: scale(0.98);
}

/* ============================================
   로딩
   ============================================ */
.guestbook-loading {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 80px 0;
}

.guestbook-loading__dot {
  width: 10px;
  height: 10px;
  background: var(--color-black);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.guestbook-loading__dot:nth-child(1) { animation-delay: -0.32s; }
.guestbook-loading__dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.3;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ============================================
   카드 Grid
   ============================================ */
.guestbook-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

/* ============================================
   카드
   ============================================ */
.guestbook-card {
  background: transparent;
  border: 1px solid #eee;
  border-radius: 0;
  padding: 32px 28px;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s ease;
  cursor: pointer;
}

.guestbook-card:hover {
  border-color: var(--color-black);
}

.guestbook-card__content {
  flex: 1;
}

.guestbook-card__message {
  font-family: var(--font-family-base);
  font-size: 18px;
  font-weight: var(--font-weight-medium);
  line-height: 1.7;
  color: var(--color-black);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.guestbook-card__author {
  margin-top: auto;
  padding-top: 16px;
}

.guestbook-card__name {
  display: block;
  font-family: var(--font-family-base);
  font-size: 16px;
  font-weight: var(--font-weight-semi-bold);
  color: var(--color-black);
  margin-bottom: 4px;
}

.guestbook-card__date {
  font-family: var(--font-family-base);
  font-size: 14px;
  color: #999;
}

/* ============================================
   빈 상태
   ============================================ */
.guestbook-empty {
  text-align: center;
  padding: 80px 20px;
}

.guestbook-empty__text {
  font-family: var(--font-family-base);
  font-size: 18px;
  color: #999;
  margin: 0 0 24px;
}

.guestbook-empty__btn {
  font-family: var(--font-family-base);
  font-size: 16px;
  font-weight: var(--font-weight-medium);
  color: var(--color-black);
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.guestbook-empty__btn:hover {
  opacity: 0.6;
}

/* ============================================
   모달
   ============================================ */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal__panel {
  width: 100%;
  max-width: 480px;
  background: var(--color-white);
  border-radius: 12px;
  padding: 32px;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.modal__title {
  font-family: var(--font-family-base);
  font-size: 22px;
  font-weight: var(--font-weight-bold);
  color: var(--color-black);
  margin: 0;
}

.modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-black);
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.modal__close:hover {
  opacity: 1;
}

.modal__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal__input,
.modal__textarea {
  width: 100%;
  font-family: var(--font-family-base);
  font-size: 16px;
  color: var(--color-black);
  background: transparent;
  border: none;
  border-bottom: 1px solid #e5e5e5;
  border-radius: 0;
  padding: 12px 0;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.modal__input:focus,
.modal__textarea:focus {
  border-bottom-color: var(--color-black);
}

.modal__input::placeholder,
.modal__textarea::placeholder {
  color: #aaa;
}

.modal__textarea {
  resize: none;
  min-height: 100px;
  line-height: 1.6;
}

.modal__error {
  font-family: var(--font-family-base);
  font-size: 14px;
  color: #d32f2f;
  margin: 0;
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.modal__submit {
  font-family: var(--font-family-base);
  font-size: 16px;
  font-weight: var(--font-weight-medium);
  color: var(--color-black);
  background: transparent;
  border: none;
  padding: 8px 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 4px;
  transition: opacity 0.2s ease;
}

.modal__submit:hover:not(:disabled) {
  opacity: 0.6;
}

.modal__submit:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 상세 모달 */
.modal__panel--detail {
  padding: 40px;
}

.modal__panel--detail .modal__header {
  margin-bottom: 32px;
}

.modal__date {
  font-family: var(--font-family-base);
  font-size: 14px;
  color: #999;
}

.modal__body {
  margin-bottom: 32px;
}

.modal__message {
  font-family: var(--font-family-base);
  font-size: 22px;
  font-weight: var(--font-weight-medium);
  line-height: 1.7;
  color: var(--color-black);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.modal__author {
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.modal__name {
  font-family: var(--font-family-base);
  font-size: 18px;
  font-weight: var(--font-weight-semi-bold);
  color: var(--color-black);
}

/* 모달 애니메이션 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal__panel,
.modal-leave-active .modal__panel {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal__panel,
.modal-leave-to .modal__panel {
  transform: translateY(10px);
}

/* ============================================
   반응형 - 태블릿
   ============================================ */
@media (max-width: 1280px) {
  .guestbook__container {
    padding: 40px 32px 60px;
  }

  .guestbook-header__title {
    font-size: 42px;
  }

  .guestbook-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ============================================
   반응형 - 모바일
   ============================================ */
@media (max-width: 768px) {
  .guestbook__container {
    padding: 32px 20px 48px;
  }

  .guestbook-header {
    margin-bottom: 28px;
  }

  .guestbook-header__title {
    font-size: 28px;
  }

  .guestbook-header__btn {
    font-size: 14px;
    padding: 10px 18px;
  }

  .guestbook-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .guestbook-card {
    min-height: auto;
    padding: 24px 20px;
  }

  .guestbook-card__message {
    font-size: 16px;
  }

  .guestbook-empty {
    padding: 60px 16px;
  }

  .modal__panel {
    padding: 24px;
  }

  .modal__title {
    font-size: 20px;
  }
}
</style>
