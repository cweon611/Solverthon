// 네이티브 <label>. @radix-ui/react-label은 쓰지 않는다(미설치이고, 이 앱의 진짜 label 7개는
// 이미 전부 htmlFor를 쓰므로 Radix가 더해 줄 클릭 전달이 필요 없다).

import { labelVariants, type LabelVariantProps } from "@/components/ui/field-variants";
import { cn } from "@/lib/utils";

export type LabelProps = React.ComponentProps<"label"> & LabelVariantProps;

// CashflowScreen:218의 파일 업로드 <label>은 여기 쓰지 않는다 — 시각적으로 Button이다.
export function Label({ className, variant, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(labelVariants({ variant }), className)}
      {...props}
    />
  );
}

export { labelVariants };
