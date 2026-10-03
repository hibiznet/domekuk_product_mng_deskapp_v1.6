# 도매꾹 상품관리 개발기획/설계서

## 1. 제품 개념
도매꾹에서 조사한 상품을 연도별/카테고리별로 저장하는 개인 업무용 상품 DB.

핵심은 "엑셀 파일 관리"를 "상품 데이터베이스 관리"로 전환하는 것입니다.

## 2. 데이터 계층
Year
 └─ Category
     └─ Product

예:
2026
 ├─ 여성패션
 ├─ 전자기기
 └─ 액세서리

2027
 ├─ 사무용품
 └─ USB/케이블

## 3. DB
### users
id, username, password_hash, name, created_at

### years
year

### categories
id, year, name, sort_order

### products
id, year, category_id
item_no
product_name
product_url
unit_price
purchase_qty
option1
option2
coupang_url
naver_url
etc
status
updated_at

## 4. 저장 정책
상품 행을 추가하거나 수정하면 즉시 DB에 반영합니다.
status:
- draft: 작성 중
- saved: 저장됨

V2에서는 1~2초 debounce 자동저장과 Ctrl+S를 추가합니다.

## 5. 백업
SQLite 파일 자체를 별도 파일로 복사합니다.
예:
도매꾹_상품관리_백업_2026-10-02.sqlite

V2에서는
- 자동 일일 백업
- 백업 복원
- 최근 백업 목록
을 추가합니다.

## 6. 엑셀
다운로드 시:
- 연도별 1개 xlsx
- 카테고리별 sheet
- 원본과 동일한 열 구조

## 7. UI
상단:
연도 / 엑셀 가져오기 / 백업 / 엑셀 다운로드 / 로그아웃

좌측:
카테고리

중앙:
엑셀형 상품 테이블

## 8. 확장 설계
향후 하이비트레이드와 연결할 경우 products 테이블을 상품 후보 DB로 사용하고,
판매상태/판매채널/SKU/마진/재고/등록상태를 추가하면 상품관리 시스템으로 확장할 수 있습니다.

## 9. 보안
현재 로컬 데스크톱 앱 기준입니다.
비밀번호는 평문 저장하지 않고 bcrypt hash로 저장합니다.
DB 파일은 사용자 PC에 존재하므로 PC 접근권한 자체가 보안 경계입니다.

## 10. 개발 우선순위
### V1.0
로그인 → 연도 → 카테고리 → 상품 CRUD → 저장 → 백업 → 엑셀 가져오기/내보내기

### V1.1
검색/필터/정렬/다중셀 붙여넣기/자동저장/비밀번호 변경

### V2.0
상품 이미지/마진/판매채널/상품 상태/자동 백업/복원

### V3.0
서버 DB + 사용자별 권한 + NAS/클라우드 동기화 + 하이비트레이드 연동
