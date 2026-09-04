import { describe, expect, it } from "vitest";

import { analyzeCashflow, excelSerialToDate, guessColumnRoles, parseCashTable, parseCashTableManual, toAmount, toMonthKey } from "@/lib/engine/cashflow";

describe("cashflow · 셀 파싱", () => {
  it("날짜 표기 여러 형식을 YYYY-MM으로 읽는다", () => {
    expect(toMonthKey("2026-01-15")).toBe("2026-01");
    expect(toMonthKey("2026.1.5")).toBe("2026-01");
    expect(toMonthKey("2026/03/02")).toBe("2026-03");
    expect(toMonthKey("2026년 7월")).toBe("2026-07");
    expect(toMonthKey("2026-07")).toBe("2026-07");
    expect(toMonthKey("20260115")).toBe("2026-01");
    expect(toMonthKey(202608)).toBe("2026-08");
    expect(toMonthKey(new Date(Date.UTC(2026, 4, 1)))).toBe("2026-05");
    expect(toMonthKey("금액")).toBeNull();
    expect(toMonthKey(null)).toBeNull();
  });

  it("엑셀 일련번호를 날짜로 읽는다 (46023 = 2026-01-01)", () => {
    expect(excelSerialToDate(46023).toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(toMonthKey(46023)).toBe("2026-01");
  });

  it("금액 표기를 숫자로 읽는다", () => {
    expect(toAmount("1,200,000원")).toBe(1_200_000);
    expect(toAmount("₩1,000")).toBe(1000);
    expect(toAmount("(300,000)")).toBe(-300_000);
    expect(toAmount("-300000")).toBe(-300_000);
    expect(toAmount(1500)).toBe(1500);
    expect(toAmount("abc")).toBeNull();
    expect(toAmount("")).toBeNull();
  });
});

describe("cashflow · 표 레이아웃", () => {
  it("[날짜·구분·항목·금액] 레이아웃", () => {
    const r = parseCashTable([
      ["날짜", "구분", "항목", "금액"],
      ["2026-01-05", "수입", "매출", 1_000_000],
      ["2026-01-25", "지출", "급여", 700_000],
    ]);
    expect(r.layout).toBe("date_kind_category_amount");
    expect(r.rows).toEqual([
      { month: "2026-01", category: "매출", amount: 1_000_000 },
      { month: "2026-01", category: "급여", amount: -700_000 },
    ]);
  });

  it("[날짜·항목·수입·지출] 레이아웃", () => {
    const r = parseCashTable([
      ["일자", "적요", "수입", "지출"],
      ["2026-02-01", "매출", 500_000, null],
      ["2026-02-02", "임차료", null, 300_000],
    ]);
    expect(r.layout).toBe("date_category_in_out");
    expect(r.rows.map((x) => x.amount)).toEqual([500_000, -300_000]);
  });

  it("[날짜·항목·금액(부호)] 레이아웃과 제목 행 건너뛰기", () => {
    const r = parseCashTable([
      ["2026년 현금흐름표"],
      [],
      ["거래일", "내용", "금액"],
      ["2026.03.01", "매출", "2,000,000"],
      ["2026.03.02", "광고", "(150,000)"],
      ["합계", "", ""],
    ]);
    expect(r.layout).toBe("date_category_signed");
    expect(r.rows.length).toBe(2);
    expect(r.rows[1].amount).toBe(-150_000);
    expect(r.skipped).toBe(1); // "합계" 행
  });

  it("헤더가 없으면 오류를 돌려준다", () => {
    const r = parseCashTable([[1, 2, 3], [4, 5, 6]]);
    expect(r.layout).toBeNull();
    expect(r.errors[0]).toContain("헤더");
  });
});

describe("cashflow · 집계", () => {
  const rows = [
    { month: "2026-01", category: "매출", amount: 1_000_000 },
    { month: "2026-01", category: "급여", amount: -1_500_000 },
    { month: "2026-02", category: "매출", amount: 1_200_000 },
    { month: "2026-02", category: "급여", amount: -1_500_000 },
    { month: "2026-03", category: "매출", amount: 900_000 },
    { month: "2026-03", category: "급여", amount: -1_500_000 },
    { month: "2026-03", category: "임차료", amount: -300_000 },
  ];

  it("월별 순현금·누적잔액을 계산한다", () => {
    const s = analyzeCashflow(rows, 5_000_000);
    expect(s.months.map((m) => m.net)).toEqual([-500_000, -300_000, -900_000]);
    expect(s.months.map((m) => m.cumulative)).toEqual([4_500_000, 4_200_000, 3_300_000]);
    expect(s.endingBalance).toBe(3_300_000);
    expect(s.span).toEqual({ from: "2026-01", to: "2026-03" });
  });

  it("번레이트(최근 3개월 평균 순유출)와 런웨이를 계산한다", () => {
    const s = analyzeCashflow(rows, 5_000_000);
    expect(s.burnRate).toBe(566_667); // (500k+300k+900k)/3
    expect(s.runwayMonths).toBe(5.8); // 3.3M / 566,667
    expect(s.flags.some((f) => f.includes("런웨이"))).toBe(true);
  });

  it("순현금이 양수면 번레이트·런웨이는 null", () => {
    const s = analyzeCashflow([
      { month: "2026-01", category: "매출", amount: 3_000_000 },
      { month: "2026-01", category: "급여", amount: -1_000_000 },
    ]);
    expect(s.burnRate).toBeNull();
    expect(s.runwayMonths).toBeNull();
  });

  it("지출 집중을 감지한다", () => {
    const s = analyzeCashflow(rows);
    expect(s.topExpenses[0]).toMatchObject({ category: "급여" });
    expect(s.topExpenses[0].share).toBeGreaterThan(0.9);
    expect(s.flags.some((f) => f.includes("급여"))).toBe(true);
  });
});

describe("cashflow · 수동 열 지정 (세로표)", () => {
  it("현금출납장: 일자·적요·입금·출금·잔액 — 잔액에서 기초 잔액을 역산한다", () => {
    const table = [
      ["현금출납장"],
      ["일자", "적요", "입금", "출금", "잔액"],
      ["2026-01-05", "제품 매출", 2_000_000, null, 7_000_000],
      ["2026-01-25", "1월 급여", null, 1_200_000, 5_800_000],
    ];
    const r = parseCashTableManual(table, {
      orientation: "rows", headerRowIndex: 1,
      roles: ["date", "category", "income", "expense", "balance"],
    });
    expect(r.rows).toEqual([
      { month: "2026-01", category: "제품 매출", amount: 2_000_000 },
      { month: "2026-01", category: "1월 급여", amount: -1_200_000 },
    ]);
    expect(r.inferredOpeningBalance).toBe(5_000_000); // 7,000,000 − 2,000,000
    expect(r.layout).toBe("date_category_in_out");
  });

  it("가계부형: 수입·지출 열이 여러 개면 열 이름이 항목이 된다", () => {
    const table = [
      ["날짜", "매출", "지원금", "급여", "임차료", "메모"],
      ["2026-02-01", 3_000_000, 0, 1_500_000, 500_000, "x"],
      ["2026-03-01", 2_500_000, 1_000_000, 1_500_000, 500_000, ""],
    ];
    const r = parseCashTableManual(table, {
      orientation: "rows", headerRowIndex: 0,
      roles: ["date", "income", "income", "expense", "expense", "ignore"],
    });
    expect(r.rows.map((x) => `${x.month} ${x.category} ${x.amount}`)).toEqual([
      "2026-02 매출 3000000", "2026-02 급여 -1500000", "2026-02 임차료 -500000",
      "2026-03 매출 2500000", "2026-03 지원금 1000000", "2026-03 급여 -1500000", "2026-03 임차료 -500000",
    ]);
  });

  it("±금액 한 열 + 구분 열도 된다", () => {
    const t = [
      ["일자", "구분", "내용", "금액"],
      ["2026-02-01", "수입", "매출", "2,000,000"],
      ["2026-02-02", "지출", "광고비", "150,000"],
    ];
    const r = parseCashTableManual(t, { orientation: "rows", headerRowIndex: 0, roles: ["date", "kind", "category", "signed"] });
    expect(r.rows.map((x) => x.amount)).toEqual([2_000_000, -150_000]);
    expect(r.layout).toBe("date_kind_category_amount");
  });

  it("날짜 열을 잘못 지정하면 거래를 못 읽고 오류를 알려준다", () => {
    const t = [["일자", "적요", "입금"], ["2026-01-05", "매출", 100]];
    const r = parseCashTableManual(t, { orientation: "rows", headerRowIndex: 0, roles: ["category", "date", "income"] });
    expect(r.rows.length).toBe(0);
    expect(r.errors[0]).toContain("읽을 수 있는 거래가 없습니다");
  });
});

describe("cashflow · 수동 열 지정 (가로표 · 열=월)", () => {
  const table = [
    ["2026년 월간 현금흐름표"],
    ["항목", "1월", "2월", "3월", "합계"],
    ["현금유입", null, null, null, null],
    ["제품 매출", 3_000_000, 3_500_000, 4_000_000, 10_500_000],
    ["정부지원금", 0, 5_000_000, 0, 5_000_000],
    ["유입 합계", 3_000_000, 8_500_000, 4_000_000, 15_500_000],
    ["현금유출", null, null, null, null],
    ["급여", 2_000_000, 2_000_000, 2_000_000, 6_000_000],
    ["임차료", 800_000, 800_000, 800_000, 2_400_000],
    ["유출 합계", 2_800_000, 2_800_000, 2_800_000, 8_400_000],
    ["순현금흐름", 200_000, 5_700_000, 1_200_000, 7_100_000],
    ["기말현금", 10_200_000, 15_900_000, 17_100_000, null],
  ];

  it("소제목 행으로 수입/지출을 나누고 합계·기말 행은 건너뛴다", () => {
    const r = parseCashTableManual(table, {
      orientation: "columns", headerRowIndex: 1,
      roles: ["category", "period", "period", "period", "ignore"],
    });
    expect(r.layout).toBe("period_columns");
    expect(r.rows.filter((x) => x.category === "제품 매출").map((x) => x.amount)).toEqual([3_000_000, 3_500_000, 4_000_000]);
    expect(r.rows.filter((x) => x.category === "급여").map((x) => x.amount)).toEqual([-2_000_000, -2_000_000, -2_000_000]);
    expect(r.rows.some((x) => /합계|순현금|기말/.test(x.category))).toBe(false);
    expect(r.rows[0].month).toBe("2026-01"); // 제목 행의 2026년을 연도로 쓴다
    const s = analyzeCashflow(r.rows);
    expect(s.months.map((m) => m.net)).toEqual([200_000, 5_700_000, 1_200_000]);
  });

  it("소제목도 구분 열도 없고 양수만 있으면 추측하지 않고 건너뛰며 알려준다", () => {
    const t = [["항목", "1월", "2월"], ["매출", 100, 200], ["급여", 50, 50]];
    const r = parseCashTableManual(t, { orientation: "columns", headerRowIndex: 0, roles: ["category", "period", "period"] });
    expect(r.rows.length).toBe(0);
    expect(r.errors.some((e) => e.includes("수입인지 지출인지"))).toBe(true);
  });
});

describe("cashflow · 열 추측(guessColumnRoles)", () => {
  it("현금출납장 열 이름을 알아본다", () => {
    const table = [
      ["일자", "계정과목", "적요", "입금액", "출금액", "잔액"],
      ["2026-01-05", "매출", "제품A", 2_000_000, null, 7_000_000],
      ["2026-01-25", "급여", "1월", null, 1_200_000, 5_800_000],
      ["2026-02-01", "임차료", "사무실", null, 500_000, 5_300_000],
    ];
    const g = guessColumnRoles(table, 0);
    expect(g.orientation).toBe("rows");
    expect(g.roles).toEqual(["date", "category", "ignore", "income", "expense", "balance"]);
  });

  it("헤더 이름이 표준과 달라도 값 형태로 날짜·금액을 찾는다", () => {
    const table = [
      ["일시", "메모", "얼마"],
      ["2026-01-05", "제품A", 2_000_000],
      ["2026-01-10", "제품B", 1_500_000],
      ["2026-01-25", "급여", -1_200_000],
    ];
    const g = guessColumnRoles(table, 0);
    expect(g.roles).toEqual(["date", "category", "signed"]);
  });

  it("가로표 첫 열 이름이 '구분'이어도 값이 항목명이면 항목으로 본다", () => {
    const table = [["구분", "1월", "2월", "3월", "합계"], ["현금유입", null, null, null, null], ["제품 매출", 1, 2, 3, 6], ["인건비", 1, 1, 1, 3]];
    const g = guessColumnRoles(table, 0);
    expect(g.orientation).toBe("columns");
    expect(g.roles).toEqual(["category", "period", "period", "period", "ignore"]);
  });

  it("헤더에 월이 여럿이면 가로표로 본다", () => {
    const table = [["항목", "구분", "1월", "2월", "3월"], ["매출", "수입", 1, 2, 3], ["급여", "지출", 1, 1, 1]];
    const g = guessColumnRoles(table, 0);
    expect(g.orientation).toBe("columns");
    expect(g.roles).toEqual(["category", "kind", "period", "period", "period"]);
  });
});
