# 가족 식단·장보기 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 요일×끼니별 설정으로 1주/4주 식단을 레시피 데이터에서 조합하고, 주 단위 장보기 리스트를 만드는 폰용 반응형 웹앱.

**Architecture:** 서버 없는 정적 웹앱. 순수 TypeScript 도메인 모듈(스키마·플래너·장보기)과 얇은 React 화면을 분리한다. 레시피는 앱에 포함된 JSON, 설정·식단·"집에 있는 재료"는 `localStorage`(저장 계층 인터페이스 뒤)에 둔다. 나중에 서버 동기화와 PWA를 붙일 수 있게 저장 계층과 도메인을 화면에서 분리한다. (도구 선택은 Claude의 결정이다.)

**Tech Stack:** Vite, React, TypeScript, Vitest, React Testing Library. 한국어 UI.

**Spec:** `docs/superpowers/specs/2026-10-11-meal-planner-design.md`

## Global Constraints

- 프로젝트 디렉터리는 `app/`. 서버·로그인·동기화·쿠팡 링크·AI 생성·영양 계산·앱 내 레시피 편집·백업 기능은 만들지 않는다.
- 끼니는 `breakfast | lunch | dinner`, 요일 0=월 … 6=일, 난이도 1=간단 2=보통 3=공들임.
- 인원 0이면 그 끼니는 건너뛴다. 난이도는 상한선이다.
- 같은 레시피 최소 7일 간격. 레시피 재료는 1인분 기준이며 인원에 비례해 늘린다.
- 합칠 수 없는 단위(예: 개와 g)는 합치지 않고 따로 표시한다.
- 1개월 = 한 주 템플릿을 4주(28일) 반복. 시작일은 선택, 기본값은 다가오는 월요일.
- 4주 장보기 리스트는 주 단위로 나눈다. 각 끼니는 독립 조리(남은 음식 이월 없음).
- 레시피는 직접 쓴 원본 약 100개: 점심 30개+, 저녁 50개+, 아침 10~20개.
- 화면 방향은 `.superpowers/brainstorm/1429-1791729130/content/overview.html` 목업.

## Review Focus

1. 모든 끼니 인원이 0인 주 → 빈 식단과 안내 문구, 오류 없음.
2. 난이도·끼니 조건에 맞는 레시피가 부족(예: 28일 간단 점심) → 난이도 완화 후 반복 허용, `warnings`에 표시.
3. 시작일이 월요일이 아니거나 달·연말을 넘는 4주 → 날짜와 요일 매핑이 맞음.
4. 같은 재료가 `g`와 `개`로 섞여 있음 → 한 줄로 합치지 않고 단위별로 표시.
5. `localStorage`가 비었거나 깨진 JSON → 기본 설정으로 시작, 크래시 없음.

---

### Task 1: 프로젝트 골격과 레시피 스키마

**Files:**
- Create: `app/` (Vite react-ts 템플릿 + Vitest 설정), `app/src/types.ts`, `app/src/recipes/schema.ts`, `app/src/recipes/recipes.json`(빈 배열로 시작)
- Test: `app/src/recipes/schema.test.ts`

**Interfaces:**
- Produces (`types.ts`): `Day = 0|1|2|3|4|5|6`, `Meal`, `Difficulty = 1|2|3`, `Category = '채소·과일'|'육류·계란'|'기타'`, `Ingredient {name; amount: number; unit; category}`, `Recipe {id; name; meals: Meal[]; difficulty; minutes: number; ingredients: Ingredient[]; steps: string[]}`, `Slot {people: number; maxDifficulty: Difficulty}`, `WeekSettings = Record<Meal, Slot>[]`(길이 7, 인덱스=Day), `PlannedMeal {date: string; meal: Meal; recipeId; people; locked: boolean; relaxed: boolean}`, `Plan {startDate: string; weeks: 1|4; meals: PlannedMeal[]; warnings: string[]}`
- Produces (`schema.ts`): `validateRecipes(raw: unknown): Recipe[]`

- [ ] **Step 1:** `app/`에 `git init`, Vite react-ts로 골격 생성, Vitest와 React Testing Library 설치, `npm test`가 실행되게 설정.
- [ ] **Step 2: Write failing tests** — `validateRecipes`가 (a) 올바른 레시피를 그대로 반환, (b) 중복 id, (c) `amount <= 0`, (d) `meals`가 비었음, (e) `difficulty`가 1~3 밖, (f) `steps`가 빔 각각에서 `throw`함을 검증.
- [ ] **Step 3: Run** `npm test -- schema` → FAIL (not defined).
- [ ] **Step 4:** `types.ts`와 `validateRecipes` 구현(오류 메시지에 레시피 id 포함).
- [ ] **Step 5: Run** `npm test -- schema` → PASS.
- [ ] **Step 6: Commit** `feat: project scaffold and recipe schema`

### Task 2: 설정과 저장 계층

**Files:**
- Create: `app/src/settings.ts`, `app/src/storage.ts`
- Test: `app/src/settings.test.ts`, `app/src/storage.test.ts`

**Interfaces:**
- Consumes: `WeekSettings`, `Plan` (Task 1)
- Produces: `defaultSettings(): WeekSettings`(아침 0명, 점심 2명 간단, 저녁 2명 보통), `interface KeyValueStore {get(k: string): string | null; set(k: string, v: string): void}`, `localStore: KeyValueStore`, `loadJSON<T>(store, key, fallback: T): T`(없거나 파싱 실패면 fallback), `saveJSON(store, key, value): void`, 키 상수 `KEYS = {settings, plan, pantry}`

- [ ] **Step 1: Write failing tests** — `defaultSettings()`는 길이 7이고 모든 요일의 아침 `people === 0`; `loadJSON`이 값이 없을 때·`"{broken"`일 때 fallback 반환; `saveJSON` 후 `loadJSON` 왕복 일치(인메모리 스토어 사용).
- [ ] **Step 2: Run** → FAIL. **Step 3:** 구현. **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: settings defaults and storage layer`

### Task 3: 식단 플래너

**Files:**
- Create: `app/src/planner.ts`
- Test: `app/src/planner.test.ts` (테스트용 작은 레시피 세트를 코드 안에 둔다)

**Interfaces:**
- Consumes: 모든 타입(Task 1)
- Produces:
  - `generatePlan(o: {settings: WeekSettings; recipes: Recipe[]; startDate: string; weeks: 1|4; rng?: () => number; keep?: PlannedMeal[]}): Plan` — `startDate`는 `YYYY-MM-DD`, `keep`은 잠긴(locked) 항목으로 그대로 유지.
  - `rerollMeal(plan: Plan, index: number, o: {settings; recipes; rng?}): Plan` — 해당 항목만 다시 뽑는다. 잠긴 항목이면 변경하지 않는다.
  - `nextMonday(from: Date): string`
- 규칙: 인원 0 건너뜀 · `meals`에 해당 끼니 포함 · `difficulty <= maxDifficulty` · 같은 레시피 7일 이내 금지 · 같은 주에서 재료 이름이 겹치는 후보를 가산점(남는 재료 줄이기). 후보가 없으면 난이도를 한 단계씩 완화(`relaxed: true`), 그래도 없으면 7일 제한을 풀고 `warnings`에 사유 추가. `rng` 주입으로 결정적 테스트.

- [ ] **Step 1: Write failing tests** — 인원 0 슬롯은 `meals`에 없음(수요일 점심 0명); 아침 전부 0이면 아침 항목 없음; 간단(1) 상한 점심에 난이도 3 레시피가 없음; 같은 레시피가 7일 안에 반복되지 않음(충분한 레시피); 28일 계획의 `date`가 시작일부터 연속이고 요일 매핑이 맞음(시작일 수요일, 12월 말→1월 케이스 포함); 조건 불충분 시 `warnings.length > 0`과 `relaxed` 표시; 잠긴 항목은 `rerollMeal`에서 불변; 모든 인원 0이면 `meals`가 빈 배열.
- [ ] **Step 2: Run** `npm test -- planner` → FAIL. **Step 3:** 위 시그니처로 구현(날짜 계산은 UTC 기준으로 DST 영향 배제). **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: meal plan generator`

### Task 4: 장보기 리스트

**Files:**
- Create: `app/src/shopping.ts`
- Test: `app/src/shopping.test.ts`

**Interfaces:**
- Consumes: `Plan`, `Recipe`, `Category` (Task 1·3)
- Produces: `ShoppingItem {name; amount: number; unit; category: Category}`, `buildShoppingList(plan: Plan, recipes: Recipe[], weekIndex: number, pantry: Set<string>): ShoppingItem[]` — `weekIndex`는 0부터, 시작일부터 7일 단위. 수량 = 레시피 1인분 수량 × `people`, 이름+단위가 같으면 합산, 단위가 다르면 별도 항목, `pantry`에 있는 이름은 제외, 카테고리 순→이름 순 정렬. `weekCount(plan): number`.

- [ ] **Step 1: Write failing tests** — 같은 이름·단위는 합산(인원 2명이면 ×2); `양파 1개`와 `양파 100g`은 두 줄; pantry 재료 제외; `weekIndex`별로 해당 주 끼니만 반영; 카테고리 정렬; 알 수 없는 `recipeId`가 있으면 해당 항목을 건너뛰고 크래시 없음.
- [ ] **Step 2: Run** → FAIL. **Step 3:** 구현. **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: weekly shopping list`

### Task 5: 설정 화면

**Files:**
- Create: `app/src/ui/SettingsScreen.tsx`, `app/src/ui/useAppState.ts`; Modify: `app/src/App.tsx`(하단 탭: 설정/식단/장보기)
- Test: `app/src/ui/SettingsScreen.test.tsx`

**Interfaces:**
- Produces: `useAppState(): {settings; setSettings; plan; setPlan; pantry; togglePantry}` — Task 2 저장 계층으로 자동 저장·복원. `SettingsScreen` — 요일×끼니 표, 칸을 누르면 인원(0 이상 정수)과 난이도(간단/보통/공들임) 변경, 폰 폭에서 가로 스크롤 없이 보임(칸 요약 "2명·보통").

- [ ] **Step 1: Write failing test** — 화면에 7×3 칸이 렌더링; 칸에서 인원을 0으로 바꾸면 `settings`에 반영되고 칸에 "안 먹음" 표시; 깨진 저장값으로 시작해도 기본 설정으로 렌더링.
- [ ] **Step 2: Run** → FAIL. **Step 3:** 구현. **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: settings screen`

### Task 6: 식단 화면과 레시피 보기

**Files:**
- Create: `app/src/ui/PlanScreen.tsx`, `app/src/ui/RecipeView.tsx`
- Test: `app/src/ui/PlanScreen.test.tsx`

**Interfaces:**
- Consumes: `generatePlan`, `rerollMeal`, `useAppState`
- Produces: 시작일 선택(기본 `nextMonday`), 1주/4주 선택, "식단 만들기" 버튼, 식단표(주 단위 표시), 메뉴마다 🔄다시 뽑기·🔒고정·메뉴 이름을 누르면 `RecipeView`(재료는 인원 기준 수량, 조리 순서), `warnings`와 빈 식단 안내 문구 표시.

- [ ] **Step 1: Write failing tests** — "식단 만들기"를 누르면 식단표가 보이고 저장됨; 🔒 후 다시 만들기해도 고정 메뉴 유지; 다시 뽑기가 해당 칸만 바꿈; 메뉴 클릭 시 레시피 재료와 순서 표시; 모든 인원 0이면 안내 문구.
- [ ] **Step 2: Run** → FAIL. **Step 3:** 구현. **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: plan screen and recipe view`

### Task 7: 장보기 화면

**Files:**
- Create: `app/src/ui/ShoppingScreen.tsx`
- Test: `app/src/ui/ShoppingScreen.test.tsx`

**Interfaces:**
- Consumes: `buildShoppingList`, `weekCount`, `useAppState`
- Produces: 주 탭(4주면 1~4주차), 카테고리별 목록, 항목 체크(구매 표시, 화면 상태), "집에 있음" 토글(`togglePantry`, 저장되어 모든 주에서 제외).

- [ ] **Step 1: Write failing tests** — 주 탭 전환 시 해당 주 재료만 표시; "집에 있음" 토글 시 항목이 사라지고 새로고침 후에도 유지; 식단이 없으면 "먼저 식단을 만드세요" 안내.
- [ ] **Step 2: Run** → FAIL. **Step 3:** 구현. **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat: shopping screen`

### Task 8: 기본 레시피 100개

**Files:**
- Modify: `app/src/recipes/recipes.json`
- Test: `app/src/recipes/recipes.test.ts`

**Interfaces:**
- Consumes: `validateRecipes` (Task 1)

- [ ] **Step 1: Write failing test** — 번들된 `recipes.json`이 `validateRecipes`를 통과; 점심 가능 레시피 30개 이상, 저녁 50개 이상, 아침 10개 이상; 점심 중 난이도 1이 15개 이상; 총 90개 이상.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3:** 한식 위주 원본 레시피를 직접 작성(점심 간단 위주 / 저녁 보통 위주 / 아침 가벼운 메뉴). 재료는 1인분, 이름은 같은 재료끼리 표기 통일(예: 항상 "대파"), 단위는 `g, 개, 큰술, 모, 대, 캔, 봉` 등으로 일관되게, 카테고리 필수. 다른 사이트 레시피를 복사하지 않는다.
- [ ] **Step 4: Run** → PASS. **Step 5:** 실제 앱에서 4주 식단을 만들어 보고 눈으로 확인해 사용자에게 먹어 볼 만한지 검토를 요청한다.
- [ ] **Step 6: Commit** `feat: seed recipes`

### Task 9: 빌드와 무료 호스팅

**Files:**
- Create: `app/README.md`(배포·레시피 수정 방법), 배포 설정(정적 호스팅, 예: GitHub Pages 또는 Netlify)

- [ ] **Step 1:** `npm run build`가 성공하고 `npm run preview`로 폰 폭(375px)에서 세 화면을 직접 확인한다.
- [ ] **Step 2:** 어느 호스팅을 쓸지 사용자에게 확인(계정 필요). 배포는 사용자 승인 후에만 수행한다.
- [ ] **Step 3: Commit** `docs: build and deploy notes`
