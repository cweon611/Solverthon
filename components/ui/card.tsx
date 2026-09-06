// shadcn 형태의 Card. Card / CardHeader / CardContent 셋만 낸다.
// CardFooter는 코드베이스에 0곳이라 만들지 않는다(죽은 export 금지).
// CardTitle도 컴포넌트로 만들지 않는다 — 태그가 h2/h3/p/span으로 갈리고
// 같은 클래스를 쓰는 20곳 중 9곳은 카드 제목이 아니다. cardTitleClass 상수만 재수출한다.
// Card는 기본이 <div>지만 app/about/page.tsx가 <section>을 쓰므로 as 축을 뒀다.

import {
  cardContentVariants,
  cardHeaderVariants,
  cardTitleClass,
  cardVariants,
  type CardContentVariantProps,
  type CardHeaderVariantProps,
  type CardVariantProps,
} from "@/components/ui/variants";
import { cn } from "@/lib/utils";

type CardProps = React.ComponentProps<"div"> & CardVariantProps & { as?: "div" | "section" | "article" };

function Card({ className, radius, pad, shadow, clip, as: Tag = "div", ...props }: CardProps) {
  return (
    <Tag
      data-slot="card"
      className={cn(cardVariants({ radius, pad, shadow, clip }), className)}
      {...props}
    />
  );
}

type CardHeaderProps = React.ComponentProps<"div"> & CardHeaderVariantProps;

function CardHeader({ className, size, layout, ...props }: CardHeaderProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(cardHeaderVariants({ size, layout }), className)}
      {...props}
    />
  );
}

type CardContentProps = React.ComponentProps<"div"> & CardContentVariantProps;

function CardContent({ className, size, list, ...props }: CardContentProps) {
  return (
    <div
      data-slot="card-content"
      className={cn(cardContentVariants({ size, list }), className)}
      {...props}
    />
  );
}

export { Card, CardContent, CardHeader, cardContentVariants, cardHeaderVariants, cardTitleClass, cardVariants };
export type { CardContentProps, CardHeaderProps, CardProps };
