"use client";

// 비즈버디 드롭다운 메뉴. Radix 동작(포털·키보드 이동·타입어헤드·aria)은 생성물 그대로다.
//
// 겉모습 기준: 앱의 흰 카드에 짙은 그림자를 얹은 판. 항목 강조는 회색이 아니라
// 브랜드 틴트(옅은 보라 배경 + 보라 글자)다 — 앱의 부드러운 버튼과 같은 배색.
// 파괴적 항목만 장미색 계열로 갈라진다.
//
// 생성물에서 바꾼 동작 하나: 판 너비를 트리거 너비에 묶지 않는다(선택 상자가 아니라 메뉴라
// 항목 글이 트리거보다 길면 잘린다). 최소 너비만 두고 내용에 맞춘다.
//
// 주석에 유틸리티 이름을 그대로 적지 않는다(스캐너가 주석도 후보로 읽는다).

import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { CheckIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// 판(본체·하위 판)이 공유하는 겉모습.
const PANEL =
  "z-50 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-brand-900/10 duration-150 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

// 항목 세 종류(일반·체크·라디오)가 공유하는 겉모습. 강조 배색은 아래에서 각자 얹는다.
const ITEM =
  "relative flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-2 transition-colors outline-hidden select-none data-inset:pl-8 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const ITEM_ON = "focus:bg-brand-50 focus:text-brand-500";

function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  align = "start",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        align={align}
        className={cn(
          PANEL,
          "max-h-(--radix-dropdown-menu-content-available-height) min-w-40 origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item",
        ITEM,
        "data-[variant=default]:focus:bg-brand-50 data-[variant=default]:focus:text-brand-500 data-[variant=destructive]:text-rose-600 data-[variant=destructive]:focus:bg-rose-50 data-[variant=destructive]:focus:text-rose-700 data-[variant=destructive]:*:[svg]:text-rose-600",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(ITEM, ITEM_ON, "pr-8 data-checked:font-medium", className)}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2.5 flex items-center justify-center text-brand-500"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(ITEM, ITEM_ON, "pr-8 data-checked:font-medium", className)}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2.5 flex items-center justify-center text-brand-500"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon aria-hidden="true" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn("px-2.5 py-1.5 text-[11px] font-semibold text-ink-3 data-inset:pl-8", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-border", className)}
      {...props}
    />
  );
}

/** 단축키 표기. 앱 규칙대로 글자·숫자는 고정폭 글꼴. */
function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto font-mono text-[11px] tracking-wide text-ink-3 group-focus/dropdown-menu-item:text-brand-400",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(ITEM, ITEM_ON, "data-open:bg-brand-50 data-open:text-brand-500", className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" aria-hidden="true" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        PANEL,
        "min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
