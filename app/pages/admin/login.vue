<script setup lang="ts">
definePageMeta({
  layout: 'admin'
})

const route = useRoute()
const router = useRouter()
const { signIn, loading, error } = useAdminAuth()

const email = ref('')
const password = ref('')
const showError = ref<string | null>(null)

// URL 쿼리로 들어온 에러 메시지
onMounted(() => {
  if (route.query.error === 'not_admin') {
    showError.value = '관리자 계정이 아닙니다. 관리자 권한이 있는 계정으로 로그인하세요.'
  }
})

const handleSubmit = async () => {
  showError.value = null
  if (!email.value || !password.value) {
    showError.value = '이메일과 비밀번호를 입력해주세요.'
    return
  }
  const result = await signIn(email.value, password.value)
  if (result.ok) {
    const redirect = (route.query.redirect as string) || '/admin/projects'
    await router.push(redirect)
  } else {
    showError.value = result.error
  }
}
</script>

<template>
  <div class="login">
    <div class="login__container">
      <h1 class="login__title">ROLL ON! ADMIN</h1>

      <form class="login__form" @submit.prevent="handleSubmit">
        <div class="login__field">
          <label for="email" class="login__label">이메일</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="login__input"
            autocomplete="email"
            required
            :disabled="loading"
          />
        </div>

        <div class="login__field">
          <label for="password" class="login__label">비밀번호</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="login__input"
            autocomplete="current-password"
            required
            :disabled="loading"
          />
        </div>

        <div v-if="showError || error" class="login__error" role="alert">
          {{ showError || error }}
        </div>

        <button
          type="submit"
          class="login__submit"
          :disabled="loading"
        >
          {{ loading ? '로그인 중…' : '로그인' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background-color: var(--color-white);
}

.login__container {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 48px 40px;
  border: 1px solid var(--color-gray);
  border-radius: 8px;
  background-color: var(--color-white);
}

.login__title {
  font-family: var(--font-family-base);
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--color-black);
  text-align: center;
  letter-spacing: 0.04em;
  margin: 0;
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.login__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.login__label {
  font-family: var(--font-family-base);
  font-size: 14px;
  font-weight: var(--font-weight-medium);
  color: var(--color-black);
}

.login__input {
  width: 100%;
  padding: 12px 14px;
  font-family: var(--font-family-base);
  font-size: 16px;
  color: var(--color-black);
  background-color: var(--color-white);
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s ease-in-out;
}

.login__input:focus {
  border-color: var(--color-black);
}

.login__input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.login__error {
  font-family: var(--font-family-base);
  font-size: 14px;
  color: #c0392b;
  padding: 10px 12px;
  background-color: #fdecea;
  border-radius: 4px;
}

.login__submit {
  width: 100%;
  padding: 14px;
  font-family: var(--font-family-base);
  font-size: 16px;
  font-weight: var(--font-weight-semi-bold);
  color: var(--color-white);
  background-color: var(--color-black);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.15s ease-in-out;
}

.login__submit:hover:not(:disabled) {
  opacity: 0.85;
}

.login__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
