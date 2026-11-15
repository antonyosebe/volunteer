import { PageFrame, Notice } from "@/components/page-frame";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function Page() {
  return (
    <PageFrame title="Forgot password">
      <Notice>Set a new password for the email on your account, then log in with it.</Notice>
      <ResetPasswordForm />
    </PageFrame>
  );
}
