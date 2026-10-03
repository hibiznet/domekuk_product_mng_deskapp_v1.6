# 도매꾹 상품관리 데스크톱 앱 v1.4 버그 수정

## 수정 내용
1. Electron 기본 메뉴(File / Edit / View / Window 등) 제거
2. 카테고리 `+` 버튼이 동작하지 않던 문제 수정
   - Electron `prompt()`에 의존하지 않고 Vue 자체 모달 사용
   - 카테고리 추가/이름 변경 모두 모달로 처리
   - 같은 연도에서 같은 카테고리명 중복 방지
3. 상품이 한 번 입력되었는데 여러 행으로 중복 생성되는 문제 수정
   - 새 상품 추가 시 DB INSERT를 먼저 수행하여 상품 ID를 즉시 확보
   - 이후 수정은 동일 ID를 이용한 UPDATE만 수행
   - IPC에는 Vue reactive Proxy가 아니라 일반 JavaScript 객체만 전달
4. 카테고리 선택 시 해당 카테고리 상품만 조회
5. 저장/삭제/카테고리 처리 오류 메시지 강화
6. Windows 개발 환경 기준 Electron 44.5.1 / Vite 6.4.3 유지

## 실행
Node.js 20.x 사용을 권장합니다.

```powershell
npm install
npm run dev
```

## 기본 로그인
- 아이디: `admin`
- 비밀번호: `admin1234`
