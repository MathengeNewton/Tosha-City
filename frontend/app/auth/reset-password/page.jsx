import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = {
  title: "Reset Password | ToshaCity Butchery",
  description:
    "Create a new password for your ToshaCity Butchery account and regain access to the management system.",
};

export default function ResetPasswordPage() {
  return (
    <div className="bg-gray-100 lg:h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white [box-shadow:0_2px_10px_-3px_rgba(6,81,237,0.3)] p-6 lg:p-8 rounded-md">
        <div className="mb-6 text-center">
          <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-2xl font-bold text-white">
            T
          </div>
          <h1 className="text-xl font-bold text-gray-900">ToshaCity Butchery</h1>
          <p className="text-sm text-gray-600 mt-1">Set a new password</p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
