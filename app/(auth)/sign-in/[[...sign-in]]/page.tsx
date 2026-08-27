import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <SignIn />
    </div>
  );
}
