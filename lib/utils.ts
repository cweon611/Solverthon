// shadcn/ui 표준 className 병합 헬퍼.
// `cn` 패키지는 clsx + tailwind-merge의 드롭인 대체품이고, shadcn 4.x
// 레지스트리가 생성하는 컴포넌트가 그대로 import하는 대상이다.
// 브릿지 실사용 클래스 12종으로 clsx+tailwind-merge와 동작 일치를 확인했다
// (특히 `shadow-md shadow-[#6E62C2]/25`와 `rounded-2xl rounded-bl-md`는 보존).
export { cn } from "cn";
