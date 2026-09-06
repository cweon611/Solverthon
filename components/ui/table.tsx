// shadcn 형태의 Table — 대상은 AdminScreen.tsx:157-177 · :183-200 두 개뿐이다(구조 동일).
// shadcn 기본값은 전부 버린다: 헤드셀 고정 높이, 셀의 좁은 여백과 세로 가운데 정렬,
// 행마다 긋는 아래 테두리(와 마지막 행만 지우는 예외 규칙), 표 캡션 아래 배치.
// 이 코드베이스는 variants.ts의 셀 여백 상수 + tbody 구분선으로 선을 긋는다.
// 하나라도 남기면 행 높이가 바뀐다. 버린 기본값을 클래스 이름 그대로 적지 않는 이유:
// Tailwind 스캐너는 주석도 후보로 읽어 그 이름이 죽은 CSS 규칙이 되어 배포된다.
//
// Table은 소스와 동일하게 스크롤 래퍼 <div>를 자기가 그린다(tableContainerClass).
// 바깥 카드 셸은 호출부의 <Card clip> 몫이다.
//
// data-slot 값은 shadcn 규약 그대로다. 다만 행·셀 두 개는 이름이 동명의 display 유틸리티와
// 겹쳐서, 리터럴로 적으면 쓰지도 않는 규칙이 스타일시트에 실린다 → 아래 slot()으로 조립한다.
// 결과 DOM 속성값은 규약과 완전히 같다.

import {
  tableBodyClass,
  tableCellClass,
  tableClass,
  tableContainerClass,
  tableHeadClass,
  tableHeaderClass,
  tableRowClass,
} from "@/components/ui/variants";
import { cn } from "@/lib/utils";

/** 행·셀 data-slot 값 조립기(유틸리티 이름과 겹치는 두 개 전용). 위 머리말 참고. */
const slot = (part: "row" | "cell") => `table-${part}`;

function Table({ className, containerClassName, ...props }: React.ComponentProps<"table"> & { containerClassName?: string }) {
  return (
    <div data-slot="table-container" className={cn(tableContainerClass, containerClassName)}>
      <table data-slot="table" className={cn(tableClass, className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn(tableHeaderClass, className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn(tableBodyClass, className)} {...props} />;
}

// <thead>의 <tr>은 소스에서 클래스가 없다 → tone="none"으로 쓴다.
function TableRow({ className, tone = "body", ...props }: React.ComponentProps<"tr"> & { tone?: "body" | "none" }) {
  return <tr data-slot={slot("row")} className={cn(tone === "body" ? tableRowClass : "", className) || undefined} {...props} />;
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return <th data-slot="table-head" className={cn(tableHeadClass, className)} {...props} />;
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td data-slot={slot("cell")} className={cn(tableCellClass, className)} {...props} />;
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
