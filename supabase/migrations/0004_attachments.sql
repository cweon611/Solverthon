-- 0004_attachments.sql — 첨부파일(hwpx·pdf) 본문 발췌
-- attachment_url: 공식 API JSON이 준 파일 링크(hwpx·pdf만). 수집 때마다 채운다.
-- attachment_text: AI 파싱 시 한 번 뽑아 캐싱한 발췌(최대 6000자). raw_text와 별개 컬럼이라
--   공고 내용이 바뀌어 재파싱되어도 첨부파일이 그대로면 다시 내려받지 않는다.

alter table public.programs add column if not exists attachment_url text;
alter table public.programs add column if not exists attachment_text text;

comment on column public.programs.attachment_url is '기업마당 API가 JSON으로 준 첨부파일(hwpx·pdf) 링크. 옛 hwp 등 미지원 형식은 null.';
comment on column public.programs.attachment_text is 'hwpx·pdf에서 뽑은 본문 발췌(최대 6000자). 파싱 시 한 번 캐싱해 재사용한다.';
