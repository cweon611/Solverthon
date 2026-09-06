// shadcn 형태의 Badge. 클래스 테이블은 variants.ts(실소스 추출)에서만 온다.
// stock shadcn base 문자열은 쓰지 않는다 — 이 디자인엔 포커스 링이 없고,
// 줄바꿈을 막는 기본값도 없다(버린 클래스 이름을 적지 않는 이유는 variants.ts 머리말 참고).
// 실사용 배지 30여 곳이 전부 <span>이라 태그 축은 두지 않았다.
// React 19: forwardRef 없이 ref를 일반 prop으로 받는다(ComponentProps<"span">에 포함).

import { badgeVariants, type BadgeVariantProps } from "@/components/ui/variants";
import { cn } from "@/lib/utils";

type BadgeProps = React.ComponentProps<"span"> & BadgeVariantProps;

function Badge({ className, size, weight, bordered, tone, fixed, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ size, weight, bordered, tone, fixed }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
