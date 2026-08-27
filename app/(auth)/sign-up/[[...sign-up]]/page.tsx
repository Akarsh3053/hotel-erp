import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <SignUp />
    </div>
  );
}
