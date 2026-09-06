// shadcn 형태의 Button. 클래스 테이블은 button-variants.ts(JSX 없음)에 있다.
//
// - React 19라서 forwardRef를 쓰지 않는다. ref는 일반 prop으로 그대로 흘려보낸다.
// - asChild는 구현하지 않는다(@radix-ui/react-slot 미설치·설치 금지).
//   <Link>/<label>/<a> 버튼 흉내는 button() 함수를 직접 호출해 className만 받는다.
//   (소스에 손 모양 커서가 없는 자리는 hand={false}에 해당하는 button({ hand: false }))
// - 훅도 기본 이벤트 핸들러도 없으므로 "use client"를 붙이지 않는다(서버 컴포넌트에서 사용 가능).

import { cn } from "@/lib/utils";

import { button, type ButtonVariants } from "./button-variants";

export type ButtonProps = React.ComponentProps<"button"> & ButtonVariants;

export function Button({
  className,
  variant,
  pad,
  text,
  box,
  radius,
  elevate,
  motion,
  center,
  block,
  off,
  hand,
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(
        button({ variant, pad, text, box, radius, elevate, motion, center, block, off, hand }),
        className,
      )}
      {...props}
    />
  );
}

export { button, type ButtonVariants };
