"use client";

// 비즈버디 Select.
//
// 트리거는 지금 화면에 있는 네이티브 <select>와 같은 상자를 그린다. 계열 이름도
// field-variants.ts의 selectField와 똑같이 miniXs · rowSm · asInput 세 가지로 두어
// 호출부가 className={selectField({ variant: "asInput" })} → variant="asInput" 로
// 그대로 옮겨 갈 수 있게 했다. 상자가 달라지는 지점은 두 곳뿐이다:
//   (1) OS가 그리던 화살표 대신 셰브론을 직접 그리므로 flex 행이 된다,
//   (2) 열림 상태와 키보드 포커스가 눈에 보인다(네이티브에 없던 층).
//
// 드롭다운 패널은 통째로 새 UI다 — 네이티브에서는 OS가 그렸다. 앱에 이미 있는 유일한
// 드롭다운 패널(OnboardingScreen:192 데모 프로필 목록 = 흰 카드 + shadow-lg)과 같은 계열로
// 잡고, 반경만 앱 표준인 xl(12px)로 맞췄다. 열림/닫힘 애니메이션은 tw-animate-css.
//
// 색은 globals.css가 비즈버디 값으로 연결해 둔 시맨틱 토큰을 쓴다:
//   border-input=#E4E6EA · ring-ring=#6E62C2 · bg-popover=#FFFFFF · text-foreground=#111111
//   bg-accent=#F5F6F8(행 hover) · text-muted-foreground=#888888 · bg-muted=#F5F6F8(구분선)
// 다크 모드 코드 없음 — 이 앱은 다크 모드를 지원하지 않는다.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/* ─────────────── 트리거 ───────────────
   selectField와 같은 테두리·반경·여백. 포커스 처리는 계열마다 원본을 따른다:
   miniXs·rowSm은 원래 링이 없어 테두리 색만 바뀌고(키보드일 때만 링을 더한다),
   asInput은 원래부터 ring-1/20을 갖고 있어 그대로 둔다. */
export const selectTriggerVariants = cva(
  [
    "flex items-center justify-between gap-2 rounded-lg border border-input px-3 py-1.5 text-foreground cursor-pointer transition-colors",
    "data-placeholder:text-muted-foreground",
    "focus:outline-none focus:border-primary data-open:border-primary",
    "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
  ].join(" "),
  {
    variants: {
      variant: {
        /** selectField.miniXs — MiniForm:23. 링 없음 · bg-white · text-xs. */
        miniXs: "w-full bg-white text-xs focus-visible:ring-2 focus-visible:ring-ring/20",
        /** selectField.rowSm — TaskForm:45. 너비 클래스가 없는 게 의도(가장 긴 항목 기준). */
        rowSm: "bg-white text-sm focus-visible:ring-2 focus-visible:ring-ring/20",
        /** selectField.asInput — MyPage:204,209. 유일하게 input 계열 링을 갖는다. */
        asInput: "w-full text-sm focus:ring-1 focus:ring-ring/20",
      },
    },
  }
);

/** variant에 기본값을 두지 않는 이유는 field-variants.ts와 같다 — 빠뜨리면 조용히 다른 계열로 렌더된다. */
export type SelectTriggerVariant = NonNullable<
  VariantProps<typeof selectTriggerVariants>["variant"]
>;

/* ─────────────── 패널 ───────────────
   글자 크기는 항목이 아니라 패널이 갖는다 — 트리거 계열(xs / sm)과 짝을 맞추기 위해서다. */
const selectContentVariants = cva(
  [
    "relative z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width)",
    "origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto",
    "rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg",
    "duration-100 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
    "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
    "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
  ].join(" "),
  {
    variants: {
      text: { xs: "text-xs", sm: "text-sm" },
    },
    defaultVariants: { text: "sm" },
  }
);

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1", className)}
      {...props}
    />
  );
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  variant,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  variant: SelectTriggerVariant;
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "group/select-trigger",
        selectTriggerVariants({ variant }),
        className
      )}
      {...props}
    >
      {/* 값은 한 줄로 자르고(flex 안에서 줄어들려면 min-w-0이 필요하다), 셰브론은 줄지 않는다 */}
      <span className="min-w-0 flex-1 truncate text-left">{children}</span>
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-open/select-trigger:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  text,
  position = "popper",
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content> &
  VariantProps<typeof selectContentVariants>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(selectContentVariants({ text }), className)}
        position={position}
        align={align}
        sideOffset={sideOffset}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-3 py-1.5 text-[11px] font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        // 글자 크기는 지정하지 않는다 — 패널의 text 축을 물려받는다.
        "relative flex w-full items-center gap-2 rounded-lg py-1.5 pr-8 pl-3 outline-hidden select-none cursor-pointer transition-colors",
        "focus:bg-accent focus:text-accent-foreground",
        "data-checked:font-semibold data-checked:text-primary",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-3.5 text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      // 카드 안 구분선(divide-[#F5F6F8])과 같은 색 — 패널 테두리(#E4E6EA)보다 한 단 연하다.
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-muted", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "z-10 flex cursor-default items-center justify-center bg-popover py-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
