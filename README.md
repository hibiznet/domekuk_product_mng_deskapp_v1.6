# 도매꾹 상품관리 데스크톱 앱 v1.0

## 1. 목적
도매꾹 상품리스트 엑셀을 매번 수작업으로 편집하지 않고, Windows 데스크톱 앱에서 연도/카테고리별로 상품을 관리합니다.

## 2. 확인된 원본 엑셀 구조
업로드된 `2026년_도매꾹-상품리스트.xlsx`에는 `여성패션`, `전자기기`, `액세서리`, `Sheet2`가 있으며 상품 열은 다음과 같습니다.

- 번호
- 상품명
- 상품URL
- 단가
- 구매수량
- 옵션
- 옵션2
- 비교URL-쿠팡
- 비교URL-네이버
- 기타

## 3. 주요 기능
- 로그인
- 연도별 관리
- 카테고리 추가/이름변경
- 엑셀처럼 상품 입력/수정
- 행 단위 저장
- 임시저장 상태 표시
- SQLite 기반 로컬 저장
- 백업 파일 생성
- 엑셀 다운로드
- 기존 XLSX 엑셀 가져오기
- 향후 다중 사용자/클라우드 동기화로 확장 가능

## 4. 기술
- Electron
- Vue 3
- Vite
- sql.js(SQLite WASM)
- ExcelJS
- bcryptjs

## 5. 실행
Node.js LTS 설치 후 프로젝트 폴더에서:

```bash
npm install
npm run dev
```

배포용 Windows 설치파일:

```bash
npm run dist
```

생성된 `release` 폴더의 NSIS 설치파일을 실행합니다.

## 6. 초기 로그인
- ID: `admin`
- Password: `admin1234`

첫 로그인 후 실제 운영 버전에서는 비밀번호 변경 기능을 추가하는 것을 권장합니다.

## 7. 데이터 위치
Electron `app.getPath('userData')` 아래에 `domeggook-manager.sqlite`가 생성됩니다.

Windows에서는 일반적으로 사용자 AppData 계열 경로입니다.

## 8. 권장 V2
1. 로그인 사용자/권한 관리
2. Ctrl+S 임시저장
3. 자동 저장 debounce
4. 다중 셀 붙여넣기(Ctrl+V)
5. 엑셀 복사/붙여넣기
6. 필터/검색/정렬
7. 카테고리 드래그 정렬
8. 상품 이미지/메모
9. 원가/판매가/마진 자동계산
10. 변경 이력
11. 자동 백업
12. 백업 복원
13. CSV 지원
14. 하이비트레이드 상품등록용 데이터 변환
15. 향후 NAS/서버 DB 연동

## 9. Windows EXE 및 아이콘
사용자가 제공한 스프레드시트 아이콘을 `assets/domeggook-manager.ico`로 변환하여 Windows 실행파일 아이콘으로 지정했습니다.

```bash
npm install
npm run dist
```

`release` 폴더에 Windows 설치파일이 생성되며, NSIS 설치 과정에서 바탕화면 바로가기 생성이 활성화되어 있습니다.
바탕화면 바로가기에는 지정한 아이콘이 적용됩니다.

## 10. Windows x64 빌드 권장 방법

일부 Windows 환경에서 `electron-winstaller`의 `select-7z-arch.js` 설치 스크립트가 npm install 단계에서 네이티브 오류를 일으킬 수 있습니다. 이 프로젝트는 Squirrel 설치파일을 사용하지 않고 NSIS 설치파일만 사용하므로, `build-windows.bat`에서 npm lifecycle script를 우회한 뒤 Electron/esbuild에 필요한 바이너리만 명시적으로 설치하도록 구성했습니다.

Windows x64 PC에서 다음 파일을 **관리자 권한이 아니어도 우선 실행**해 보십시오.

```text
build-windows.bat
```

완료되면 `release` 폴더에 Windows x64 NSIS 설치파일이 생성됩니다.

수동 실행이 필요하면:

```bash
npm install --ignore-scripts
node node_modules/electron/install.js
node node_modules/esbuild/install.js
npx electron-builder --win nsis --x64
```
