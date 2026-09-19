import { redirect } from "next/navigation";

// 예전 AI 대화 가입 주소. 회원 정보는 이제 설문(/onboarding)으로만 받는다
export default function Page() {
  redirect("/onboarding");
}
