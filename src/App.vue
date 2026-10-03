<template>
  <div v-if="!loggedIn" class="login">
    <div class="login-card">
      <h1>도매꾹 상품관리</h1>
      <p>연도별 상품 DB 관리</p>
      <input v-model="login.username" placeholder="아이디" @keyup.enter="doLogin">
      <input v-model="login.password" type="password" placeholder="비밀번호" @keyup.enter="doLogin">
      <button @click="doLogin">로그인</button>
      <small>초기 관리자: admin / admin1234</small>
      <div class="err">{{ error }}</div>
    </div>
  </div>

  <div v-else class="app">
    <header>
      <div><b>도매꾹 상품관리</b><span class="user">{{ user.name }}</span></div>
      <div class="actions">
        <button class="save-button" :disabled="!hasUnsavedChanges || saving" @click="saveAll">
          {{ saving ? '저장 중...' : '저장' }}
        </button>
        <button @click="importExcel">엑셀 가져오기</button>
        <button @click="backup">백업</button>
        <button @click="exportExcel">엑셀 다운로드</button>
        <button class="ghost" @click="logout">로그아웃</button>
      </div>
    </header>

    <section class="toolbar">
      <label>연도
        <select v-model.number="year" @change="changeYear">
          <option v-for="y in years" :key="y.year" :value="y.year">{{ y.year }}</option>
        </select>
      </label>
      <input v-model.number="newYear" type="number" placeholder="연도">
      <button @click="addYear">연도 추가</button>
      <span :class="['autosave', { dirty: hasUnsavedChanges }]">● {{ saveStatus }}</span>
    </section>

    <main>
      <aside>
        <div class="side-title">
          <span>카테고리</span>
          <button class="add-category-button" title="카테고리 추가" @click="openAddCategory">＋</button>
        </div>

        <div
          v-for="c in categories"
          :key="c.id"
          :class="['cat', { active: c.id === categoryId }]"
          @click="selectCategory(c.id)"
        >
          <span>{{ c.name }}</span>
          <span class="cat-actions" title="카테고리 이름 변경" @click.stop="openRenameCategory(c)">⋯</span>
        </div>
      </aside>

      <section class="content">
        <div class="table-head">
          <h2>{{ categoryName }}</h2>
          <div class="table-actions">
            <button class="cleanup-button" @click="cleanupLegacyDuplicates">기존 중복 정리</button>
            <button @click="addRow">＋ 상품 추가</button>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>번호</th>
                <th>상품명</th>
                <th>상품URL</th>
                <th>단가</th>
                <th>구매수량</th>
                <th>옵션</th>
                <th>옵션2</th>
                <th>쿠팡 비교URL</th>
                <th>네이버 비교URL</th>
                <th>기타</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in visibleProducts" :key="p._key">
                <td>{{ i + 1 }}</td>
                <td><input v-model="p.item_no" @input="markDirty(p)"></td>
                <td><input class="wide" v-model="p.product_name" @input="markDirty(p)"></td>
                <td><input class="url" v-model="p.product_url" @input="markDirty(p)"></td>
                <td><input class="price" type="number" v-model="p.unit_price" @input="markDirty(p)"></td>
                <td><input v-model="p.purchase_qty" @input="markDirty(p)"></td>
                <td><input v-model="p.option1" @input="markDirty(p)"></td>
                <td><input v-model="p.option2" @input="markDirty(p)"></td>
                <td><input class="url" v-model="p.coupang_url" @input="markDirty(p)"></td>
                <td><input class="url" v-model="p.naver_url" @input="markDirty(p)"></td>
                <td><input v-model="p.etc" @input="markDirty(p)"></td>
                <td><button class="danger" @click="remove(p)">삭제</button></td>
              </tr>
              <tr v-if="!visibleProducts.length">
                <td colspan="12" class="empty">상품이 없습니다. ＋ 상품 추가로 입력하세요.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <div v-if="categoryDialog.open" class="modal-backdrop" @click.self="closeCategoryDialog">
      <div class="modal-card">
        <h3>{{ categoryDialog.mode === 'add' ? '카테고리 추가' : '카테고리 이름 변경' }}</h3>
        <input
          ref="categoryInput"
          v-model="categoryDialog.name"
          maxlength="50"
          placeholder="카테고리 이름"
          @keyup.enter="submitCategoryDialog"
          @keyup.esc="closeCategoryDialog"
        >
        <div class="modal-actions">
          <button @click="closeCategoryDialog">취소</button>
          <button class="primary" @click="submitCategoryDialog">확인</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

const loggedIn = ref(false)
const user = ref({})
const error = ref('')
const login = ref({ username: 'admin', password: '' })

const years = ref([])
const year = ref(new Date().getFullYear())
const lastLoadedYear = ref(year.value)
const newYear = ref('')
const categories = ref([])
const categoryId = ref(null)
const products = ref([])
const saveStatus = ref('저장 완료')
const saving = ref(false)
const dirtyCount = ref(0)

const categoryDialog = ref({ open: false, mode: 'add', id: null, name: '' })
const categoryInput = ref(null)

const categoryName = computed(() =>
  categories.value.find(x => x.id === categoryId.value)?.name || '카테고리'
)

const visibleProducts = computed(() => products.value.filter(p => !p._deleted))
const hasUnsavedChanges = computed(() => dirtyCount.value > 0)

function markDirty(p) {
  if (!p._dirty) {
    p._dirty = true
    dirtyCount.value++
  }
  saveStatus.value = '저장하지 않은 변경사항이 있습니다.'
}

function markClean(p) {
  if (p._dirty) {
    p._dirty = false
    dirtyCount.value = Math.max(0, dirtyCount.value - 1)
  }
}

function recalcDirty() {
  dirtyCount.value = products.value.filter(p => p._dirty).length
}

async function doLogin() {
  error.value = ''
  try {
    const payload = {
      username: String(login.value.username || '').trim(),
      password: String(login.value.password || '')
    }
    const r = await window.api.login(payload)
    if (r.ok) {
      loggedIn.value = true
      user.value = r.user
      await loadYears()
    } else {
      error.value = r.message || '로그인에 실패했습니다.'
    }
  } catch (e) {
    error.value = e?.message || '로그인 처리 중 오류가 발생했습니다.'
    console.error(e)
  }
}

async function logout() {
  if (!(await confirmDiscardChanges())) return
  loggedIn.value = false
  login.value.password = ''
  error.value = ''
}

async function loadYears() {
  years.value = await window.api.getYears()
  if (!years.value.some(x => x.year === year.value)) {
    await window.api.ensureYear(year.value)
    years.value = await window.api.getYears()
  }
  await changeYear(true)
  lastLoadedYear.value = year.value
}

async function changeYear(force = false) {
  if (!force && !(await confirmDiscardChanges())) {
    year.value = lastLoadedYear.value
    return
  }
  categories.value = await window.api.getCategories(year.value)

  if (categories.value.length === 0) {
    await window.api.addCategory({ year: Number(year.value), name: '미분류' })
    categories.value = await window.api.getCategories(year.value)
  }

  categoryId.value = categories.value[0]?.id ?? null
  await loadProducts()
  lastLoadedYear.value = year.value
}

async function addYear() {
  if (!(await confirmDiscardChanges())) return
  const y = Number(newYear.value)
  if (!y || y < 2000 || y > 2100) {
    alert('2000~2100 사이의 연도를 입력해 주세요.')
    return
  }
  await window.api.ensureYear(y)
  newYear.value = ''
  year.value = y
  await loadYears()
}

function openAddCategory() {
  categoryDialog.value = { open: true, mode: 'add', id: null, name: '' }
  nextTick(() => categoryInput.value?.focus())
}

function openRenameCategory(c) {
  categoryDialog.value = { open: true, mode: 'rename', id: c.id, name: c.name }
  nextTick(() => {
    categoryInput.value?.focus()
    categoryInput.value?.select()
  })
}

function closeCategoryDialog() {
  categoryDialog.value.open = false
}

async function submitCategoryDialog() {
  const name = String(categoryDialog.value.name || '').trim()
  if (!name) {
    categoryInput.value?.focus()
    return
  }

  try {
    if (categoryDialog.value.mode === 'add') {
      const r = await window.api.addCategory({ year: Number(year.value), name })
      if (!r.ok) {
        alert(r.message || '카테고리를 추가할 수 없습니다.')
        return
      }
      categories.value = await window.api.getCategories(year.value)
      const added = categories.value.find(c => c.name === name)
      if (added) {
        categoryId.value = added.id
        await loadProducts()
      }
    } else {
      const r = await window.api.renameCategory({ id: categoryDialog.value.id, name })
      if (!r.ok) {
        alert(r.message || '카테고리 이름을 변경할 수 없습니다.')
        return
      }
      categories.value = await window.api.getCategories(year.value)
      await loadProducts()
    }
    closeCategoryDialog()
  } catch (e) {
    console.error(e)
    alert(e?.message || '카테고리 처리 중 오류가 발생했습니다.')
  }
}

async function selectCategory(id) {
  if (id === categoryId.value) return
  if (!(await confirmDiscardChanges())) return
  categoryId.value = id
  await loadProducts()
}

function normalizeProduct(raw) {
  return {
    ...raw,
    _key: `p-${raw.id ?? crypto.randomUUID()}`,
    _dirty: false
  }
}

async function loadProducts() {
  if (!categoryId.value) {
    products.value = []
    dirtyCount.value = 0
    saveStatus.value = '저장 완료'
    return
  }
  products.value = (await window.api.getProducts({
    year: Number(year.value),
    categoryId: Number(categoryId.value)
  })).map(normalizeProduct)
  recalcDirty()
  saveStatus.value = '저장 완료'
}

function blank() {
  return {
    id: null,
    year: Number(year.value),
    category_id: Number(categoryId.value),
    item_no: '',
    product_name: '',
    product_url: '',
    unit_price: '',
    purchase_qty: '',
    option1: '',
    option2: '',
    coupang_url: '',
    naver_url: '',
    etc: '',
    status: 'draft',
    _key: `new-${crypto.randomUUID()}`,
    _dirty: true
  }
}

function addRow() {
  if (!categoryId.value) return
  const p = blank()
  products.value.push(p)
  dirtyCount.value++
  saveStatus.value = '새 상품이 추가되었습니다. 저장 버튼을 눌러 DB에 저장하세요.'
  nextTick(() => {
    const inputs = document.querySelectorAll('tbody tr:last-child input')
    inputs[1]?.focus()
  })
}

function buildPayload(p) {
  return {
    id: p.id == null ? null : Number(p.id),
    year: Number(year.value),
    category_id: Number(categoryId.value),
    item_no: p.item_no === '' || p.item_no == null ? '' : Number(p.item_no),
    product_name: String(p.product_name ?? ''),
    product_url: String(p.product_url ?? ''),
    unit_price: p.unit_price === '' || p.unit_price == null ? '' : Number(p.unit_price),
    purchase_qty: String(p.purchase_qty ?? ''),
    option1: String(p.option1 ?? ''),
    option2: String(p.option2 ?? ''),
    coupang_url: String(p.coupang_url ?? ''),
    naver_url: String(p.naver_url ?? ''),
    etc: String(p.etc ?? ''),
    status: 'saved'
  }
}

async function saveAll() {
  if (!hasUnsavedChanges.value || saving.value) return true

  saving.value = true
  saveStatus.value = '저장 중...'
  try {
    const dirtyProducts = [...products.value.filter(p => p._dirty)]
    for (const p of dirtyProducts) {
      if (p._deleted) {
        if (p.id != null) {
          const r = await window.api.deleteProduct(Number(p.id))
          if (!r?.ok) throw new Error(r?.message || '상품 삭제 저장에 실패했습니다.')
        }
        p._dirty = false
        dirtyCount.value = Math.max(0, dirtyCount.value - 1)
        products.value = products.value.filter(x => x !== p)
        continue
      }

      const r = await window.api.saveProduct(buildPayload(p))
      if (!r?.ok) throw new Error(r?.message || '상품 저장에 실패했습니다.')
      if (p.id == null) p.id = Number(r.id)
      p.status = 'saved'
      markClean(p)
    }
    saveStatus.value = `저장 완료 ${new Date().toLocaleTimeString()}`
    return true
  } catch (e) {
    console.error(e)
    saveStatus.value = '저장 오류'
    alert(e?.message || '상품 저장 중 오류가 발생했습니다.')
    return false
  } finally {
    saving.value = false
  }
}

async function confirmDiscardChanges() {
  if (!hasUnsavedChanges.value) return true
  const answer = confirm('입력된 데이타가 있습니다. 저장 버튼을 누르지 않았습니다. 그래도 이동/변경하시겠습니까?')
  if (!answer) return false
  return true
}

async function remove(p) {
  if (!confirm('삭제하시겠습니까?')) return

  // 아직 DB에 저장되지 않은 새 행이면 화면에서만 제거합니다.
  if (p.id == null) {
    if (p._dirty) dirtyCount.value = Math.max(0, dirtyCount.value - 1)
    products.value = products.value.filter(x => x !== p)
    saveStatus.value = '새 상품 입력을 취소했습니다.'
    return
  }

  // 기존 DB 상품은 즉시 DELETE하지 않고 삭제 표시만 합니다.
  // 저장 버튼을 눌렀을 때 실제 DB에서 삭제합니다.
  if (!p._dirty) {
    p._dirty = true
    dirtyCount.value++
  }
  p._deleted = true
  saveStatus.value = '삭제할 상품이 표시되었습니다. 저장 버튼을 눌러 확정하세요.'
}

async function cleanupLegacyDuplicates() {
  if (hasUnsavedChanges.value) {
    alert('먼저 저장 버튼을 눌러 현재 입력을 저장해 주세요.')
    return
  }
  const ok = confirm('이 기능은 이전 버전의 자동 저장 버그로 생성된 중복/입력 중간 스냅샷을 정리합니다.\n\n먼저 백업을 권장합니다. 계속하시겠습니까?')
  if (!ok) return

  const r = await window.api.cleanupLegacyDuplicates({
    year: Number(year.value),
    categoryId: Number(categoryId.value)
  })
  if (r.ok) {
    alert(`${r.deleted}건의 기존 중복 데이터를 정리했습니다.`)
    await loadProducts()
  }
}

async function backup() {
  if (!(await saveBeforeAction('백업'))) return
  const r = await window.api.backup()
  if (r.ok) alert('백업 완료\n' + r.path)
}

async function exportExcel() {
  if (!(await saveBeforeAction('엑셀 다운로드'))) return
  const r = await window.api.exportExcel({ year: Number(year.value) })
  if (r.ok) alert('엑셀 다운로드 완료\n' + r.path)
}

async function saveBeforeAction(actionName) {
  if (!hasUnsavedChanges.value) return true
  const ok = confirm(`저장되지 않은 변경사항이 있습니다. ${actionName} 전에 저장하시겠습니까?`)
  if (!ok) return false
  return await saveAll()
}

async function importExcel() {
  if (!(await saveBeforeAction('엑셀 가져오기'))) return
  const r = await window.api.importExcel()
  if (r.ok) {
    alert(`${r.imported}건을 가져왔습니다.`)
    await loadYears()
  }
}

async function handleWindowCloseRequest() {
  try {
    const decision = await window.api.rendererCloseDecision({ dirty: hasUnsavedChanges.value })
    if (!decision?.ok) return

    if (decision.action === 'save-and-close') {
      const saved = await saveAll()
      if (!saved) return
    }
    await window.api.forceClose()
  } catch (e) {
    console.error(e)
    alert('프로그램 종료 처리 중 오류가 발생했습니다.')
  }
}

onMounted(() => {
  window.api.onRequestClose(handleWindowCloseRequest)
})

onBeforeUnmount(() => {})
</script>
