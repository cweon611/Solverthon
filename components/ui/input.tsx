// shadcn 모양(data-slot · cn 병합 · variant 함수 동시 export)에 브릿지 클래스 문자열을 넣은 Input.
// shadcn 기본 base 문자열은 쓰지 않는다 — 그쪽이 넣는 포커스 링과 그 바깥 여백,
// 그리고 기본 모서리 반경이 이 디자인에 없다(버린 이름은 적지 않는다: 주석도 스캔 대상).
// 이벤트 핸들러도 훅도 없으므로 "use client" 없이 서버 컴포넌트에서도 쓸 수 있다.

import { inputVariants, type InputVariantProps } from "@/components/ui/field-variants";
import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input"> & InputVariantProps;

// React 19 — forwardRef 없이 ref가 일반 prop으로 props에 실려 그대로 전달된다.
export function Input({ className, variant, mono, ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      className={cn(inputVariants({ variant, mono }), className)}
      {...props}
    />
  );
}

export { inputVariants };
