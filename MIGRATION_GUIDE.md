# 데이터베이스 마이그레이션 가이드

메트릭 설정 시스템이 계층적 구조(장비 -> 카테고리 -> 포지션 -> 메트릭)로 업그레이드되었습니다.
이를 지원하기 위해 `metric_configs` 테이블 스키마를 업데이트해야 합니다.

## 문제 상황
데이터베이스 스키마가 업데이트되지 않은 경우 "저장 중 오류가 발생했습니다"라는 메시지가 표시될 수 있습니다. 
구체적으로, 기존의 유니크 제약 조건 `metric_configs_unique`가 동일한 메트릭 키를 서로 다른 카테고리에 저장하는 것을 차단하기 때문입니다 (예: 'Countermovement Jump'와 'Drop Jump' 두 카테고리 모두에 'JumpHeight'가 있는 경우).

## 해결 방법
제공된 마이그레이션 SQL 스크립트를 Supabase 프로젝트에서 수동으로 실행해 주세요.

### 실행 단계
1.  **Supabase 대시보드**로 이동합니다.
2.  **SQL Editor** 메뉴로 이동합니다.
3.  **New Query**를 클릭하여 새 쿼리 창을 엽니다.
4.  아래 파일의 내용을 복사하여 붙여넣습니다:
    
    `supabase/migrations/20240217_upgrade_metric_configs.sql`

5.  **Run** 버튼을 클릭하여 실행합니다.

### 확인
스크립트를 실행한 후에는 오류 없이 계층적 메트릭 설정을 저장할 수 있어야 합니다.
이 스크립트는 다음 작업을 수행합니다:
- `device`, `test_category`, `test_position` 컬럼 추가
- 기존 데이터의 `test_type`을 `device`로 백필(Backfill)
- 새로운 계층적 유니크 제약 조건 `metric_configs_hierarchical_unique` 생성
- **충돌을 일으키는 기존 제약 조건 `metric_configs_unique` 삭제** (중요)

## 3. [New] Multi-Vendor Support (Company Column)
다른 회사의 장비(Keiser 등) 지원을 위한 `company` 컬럼 추가 작업입니다.

1. Supabase SQL Editor 접속
2. 아래 스크립트 실행:

```sql
-- 1. Add company column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='metric_configs' AND column_name='company') THEN
        ALTER TABLE metric_configs ADD COLUMN company TEXT DEFAULT 'VALD';
    END IF;
END $$;

-- 2. Update Constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'metric_configs_hierarchical_unique'
    ) THEN
        ALTER TABLE metric_configs DROP CONSTRAINT metric_configs_hierarchical_unique;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'metric_configs_company_hierarchical_unique'
    ) THEN
        ALTER TABLE metric_configs 
        ADD CONSTRAINT metric_configs_company_hierarchical_unique 
        UNIQUE (company, device, test_category, metric_key);

### 4. Player Aliases (Multi-Vendor Matching)
To map potentially different names from various devices (e.g., 'Seo Minwoo' vs 'Minwoo Seo') to a single canonical Profile, we use the `player_aliases` table.

1.  Open the SQL Editor in Supabase.
2.  Copy and paste the content of `supabase/migrations/20240219_create_player_aliases.sql`.
3.  Run the script.

All UI features for matching will act upon this table.

