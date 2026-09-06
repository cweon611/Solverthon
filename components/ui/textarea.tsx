// shadcn 모양의 Textarea. 클래스 문자열은 DraftScreen·DedupeDemo·ParseDemo 원본 그대로다.
// 포커스 링 유무가 variant마다 다르다 — 통일하지 않는다(field-variants.ts 참고).

import { textareaVariants, type TextareaVariantProps } from "@/components/ui/field-variants";
import { cn } from "@/lib/utils";

export type TextareaProps = React.ComponentProps<"textarea"> & TextareaVariantProps;

// rows는 호출부가 계산해 넘긴다(DraftScreen:259). 여기서 기본값을 주지 않는다.
export function Textarea({ className, variant, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ variant }), className)}
      {...props}
    />
  );
}

export { textareaVariants };
