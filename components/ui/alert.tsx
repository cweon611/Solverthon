// shadcn 형태의 Alert — Alert 하나만 낸다.
// 인라인 알림 박스 25곳은 거의 다 <p> 하나뿐이고, 제목+본문인 소수(Login:71 · Signup:66 ·
// Login:79 · MyPage:349)도 지금처럼 <p>를 두 개 쓰면 그만이다. 두 태그의 클래스가
// 자리마다 달라 공통 문자열이 없으므로 AlertTitle/AlertDescription은 만들지 않는다.
// 아이콘 축도 없다: 25곳 전부 아이콘이 없어 아이콘을 전제한 그리드 베이스가 필요 없다.
//
// 색까지 갖는 지역 tone 맵은 DocumentsScreen.tsx:25-31(OVERALL_BANNER) 하나다.
// tone={null}로 두고 그 맵 문자열을 className으로 넘긴다(cva는 null이면 기본값도 건너뛴다).
// DashboardScreen.tsx:42의 오렌지 배너도 같은 방식이다.
// CashflowScreen.tsx:34-38(SEVERITY)은 알림 박스가 아니라 statTile 모양(:448)이다.

import { alertVariants, type AlertVariantProps } from "@/components/ui/variants";
import { cn } from "@/lib/utils";

type AlertProps = React.ComponentProps<"div"> & AlertVariantProps;

function Alert({ className, tone, radius, pad, ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      className={cn(alertVariants({ tone, radius, pad }), className)}
      {...props}
    />
  );
}

export { Alert, alertVariants };
export type { AlertProps };
