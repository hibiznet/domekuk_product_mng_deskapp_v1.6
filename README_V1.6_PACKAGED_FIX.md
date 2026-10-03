# 도매꾹 상품관리 V1.6 - EXE 패키징 수정

이번 버전은 V1.5 기능을 유지하면서 Windows EXE 실행 문제를 수정했습니다.

## 수정사항

1. Vite `base: './'` 적용
   - Electron `loadFile()`로 실행되는 패키지에서 `/assets/...` 경로가 깨져 빈 화면이 나오는 문제를 수정합니다.

2. Electron production 경로 수정
   - 패키지 내부 `app.asar/dist/index.html`을 직접 로드합니다.

3. 창 종료 안정성 보완
   - 렌더러가 정상적으로 응답하지 않아도 프로그램이 종료되지 않는 문제를 방지합니다.

4. 카테고리 모달의 중복 취소 버튼 제거

## 빌드

Windows PowerShell에서 Node 20.x 환경으로 실행합니다.

```powershell
npm install
npm run build
npx electron-builder --win nsis --x64
```

완성된 설치 프로그램은 `release` 폴더에 생성됩니다.
