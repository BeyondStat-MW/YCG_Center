-- 기존: 프로필 ID가 무조건 회원가입 유저 ID여야 함
-- 변경: 외부 API(Vald)의 선수 ID도 허용하도록 제약 조건 제거

ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;

-- 참고: 이 SQL을 실행해야 'sync_vald_to_supabase.py'가 에러 없이 작동합니다.
