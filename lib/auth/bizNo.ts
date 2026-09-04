// lib/auth/bizNo.ts — 사업자등록번호 정규화·표기·검증 (순수)
// 국세청 조회는 하지 않는다. 형식과 검증 숫자만 확인한다.

/** 하이픈·공백 제거 후 숫자 10자리면 반환, 아니면 null */
export function normalizeBizNo(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return digits.length === 10 ? digits : null;
}

/** "1234567890" → "123-45-67890" */
export function formatBizNo(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 10) return digits;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/**
 * 사업자등록번호 검증 숫자(10번째 자리) 확인.
 * 가중치 1,3,7,1,3,7,1,3,5 를 앞 9자리에 곱해 더하고, 9번째 자리×5의 십의 자리를 더한 뒤 10의 보수와 비교한다.
 */
export function bizNoChecksumOk(digits: string): boolean {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 10) return false;
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(d[i]) * w[i];
  sum += Math.floor((Number(d[8]) * 5) / 10);
  return (10 - (sum % 10)) % 10 === Number(d[9]);
}
