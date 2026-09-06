"use client";

// 브릿지 확인 대화상자. Dialog와 달리 닫기 아이콘도 바깥 클릭 닫기도 없다 —
// 사용자가 두 버튼 중 하나를 반드시 고르게 하는 게 이 컴포넌트의 존재 이유라 Radix 동작을 그대로 둔다.
//
// 하단 두 버튼은 우리 Button 표(button-variants.ts)의 문자열을 그대로 쓴다.
// 우리 Button에는 asChild가 없으므로(슬롯 패키지 미설치) 생성물처럼 감싸지 않고
// Radix 요소에 표 결과를 className으로 붙인다 — 앱의 <Link> 버튼 흉내 자리와 같은 방식이다.
//
// 주석에 유틸리티 이름을 그대로 적지 않는다(스캐너가 주석도 후보로 읽는다).

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { button, type ButtonVariants } from "./button-variants";

/** 표가 담당하지 않는 축: 아이콘 정렬과 새로 들어온 포커스 표시. */
const ACTION_SHAPE =
  "inline-flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none";

/** 하단 버튼 두 개가 공유하는 크기·모서리·전환. 색만 variant가 정한다. */
function actionClass(variant: ButtonVariants["variant"]) {
  return cn(
    button({ variant, pad: "4x2", text: "sm", radius: "xl", motion: "colors", off: "o50" }),
    ACTION_SHAPE,
  );
}

function AlertDialog({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-brand-900/25 duration-150 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: "default" | "sm";
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          "group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-border bg-popover p-5 text-sm text-popover-foreground shadow-2xl shadow-brand-900/15 duration-150 outline-none data-[size=sm]:sm:max-w-xs data-[size=default]:sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

// 좁은 화면에서는 가운데, 넓은 화면의 기본 크기에서만 왼쪽으로 붙인다.
function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "flex flex-col items-center gap-1.5 text-center sm:group-data-[size=default]/alert-dialog-content:items-start sm:group-data-[size=default]/alert-dialog-content:text-left",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      // Dialog와 같은 바닥 띠. 가장 좁은 크기에서는 두 버튼을 반씩 나눠 세로쌓기를 피한다.
      className={cn(
        "-mx-5 -mb-5 flex flex-col-reverse gap-2 rounded-b-2xl border-t border-border bg-muted px-5 py-4 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 제목 위 아이콘 칩. 기본은 브랜드 틴트다.
 * 파괴적 확인에는 className으로 장미색 틴트를 넘긴다 — apiNotes 예시 참고.
 */
function AlertDialogMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "mb-1 inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-500 *:[svg:not([class*='size-'])]:size-5",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("font-display text-base leading-snug font-bold text-ink", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(
        "text-sm leading-relaxed text-balance text-muted-foreground md:text-pretty *:[a]:text-brand-500 *:[a]:underline *:[a]:underline-offset-2",
        className,
      )}
      {...props}
    />
  );
}

/** 확정 버튼. 기본은 브랜드 채움, 삭제류는 variant를 넘겨 장미색 채움으로 바꾼다. */
function AlertDialogAction({
  className,
  variant = "primary",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> & Pick<ButtonVariants, "variant">) {
  return (
    <AlertDialogPrimitive.Action
      data-slot="alert-dialog-action"
      className={cn(actionClass(variant), className)}
      {...props}
    />
  );
}

/**
 * 취소 버튼. 바닥 띠가 연회색이라 기본 테두리형에는 흰 배경을 얹어 버튼을 띄운다.
 * 채움형 variant를 넘겼을 때 그 흰 배경이 색을 덮지 않도록 기본값일 때만 붙인다.
 */
function AlertDialogCancel({
  className,
  variant = "outline",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> & Pick<ButtonVariants, "variant">) {
  return (
    <AlertDialogPrimitive.Cancel
      data-slot="alert-dialog-cancel"
      className={cn(actionClass(variant), variant === "outline" && "bg-white", className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
