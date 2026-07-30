// SignupPage — Student / Instructor signup screen.
//
// Layout: centered card with the product logo on top and a signup form below.
// Fields:
//   - Full name
//   - Email
//   - Password (+ strength meter)
//   - Role selector (student / instructor) — uses Radio
//   - Terms & conditions checkbox (required)
//   - Submit → "Create Account"
//
// Below the form: divider + OAuth quick-signup buttons (Google / GitHub) and
// a "Already have an account? Sign in" link.
//
// Validation: react-hook-form + yup (same pattern as the existing login page
// in `src/app/pages/Auth/index.tsx`).

// Import Dependencies
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import * as Yup from "yup";
import {
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  AcademicCapIcon,
  PresentationChartLineIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import Logo from "@/assets/appLogo.svg?react";
import {
  Button,
  Card,
  Input,
  InputErrorMsg,
} from "@/components/ui";
import { Checkbox, Radio } from "@/components/ui/Form";
import { Page } from "@/components/shared/Page";

// ----------------------------------------------------------------------

export type SignupRole = "student" | "instructor";

export interface SignupFormValues {
  fullName: string;
  email: string;
  password: string;
  role: SignupRole;
  acceptTerms: boolean;
}

const schema = Yup.object().shape({
  fullName: Yup.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .required("Full name is required"),
  email: Yup.string()
    .trim()
    .email("Enter a valid email address")
    .required("Email is required"),
  password: Yup.string()
    .trim()
    .min(8, "Password must be at least 8 characters")
    .matches(/[A-Z]/, "Add at least one uppercase letter")
    .matches(/[0-9]/, "Add at least one number")
    .required("Password is required"),
  role: Yup.mixed<SignupRole>()
    .oneOf(["student", "instructor"])
    .required("Select a role"),
  acceptTerms: Yup.boolean()
    .oneOf([true], "You must accept the terms to continue"),
});

// ----------------------------------------------------------------------

/** Score 0..4 for password strength, with a label and color token. */
function scorePassword(pw: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
} {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-gray-300 dark:bg-dark-500",
    "bg-error-500",
    "bg-warning-500",
    "bg-info-500",
    "bg-success-500",
  ];
  return {
    score: s as 0 | 1 | 2 | 3 | 4,
    label: labels[s],
    color: colors[s],
  };
}

// ----------------------------------------------------------------------

export default function SignupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: yupResolver(schema as Yup.ObjectSchema<SignupFormValues>),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      role: "student",
      acceptTerms: false,
    },
  });

  const password = watch("password") ?? "";
  const strength = scorePassword(password);

  const onSubmit = async (_data: SignupFormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      // DEV: no real backend. Simulate a successful signup, then bounce to MFA.
      await new Promise((resolve) => setTimeout(resolve, 900));
      navigate("/mfa-verify");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Signup failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page title="Sign Up">
      <main className="grid min-h-100vh w-full grow place-items-center bg-gray-50 dark:bg-dark-900">
        <div className="w-full max-w-[28rem] p-4 sm:px-5">
          <div className="text-center">
            <Logo className="mx-auto size-16" />
            <div className="mt-4">
              <h2 className="text-2xl font-semibold text-gray-600 dark:text-dark-100">
                Create your account
              </h2>
              <p className="text-gray-400 dark:text-dark-300">
                Start learning — or teaching — in minutes.
              </p>
            </div>
          </div>

          <Card className="mt-5 rounded-lg p-5 lg:p-7">
            <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" noValidate>
              <div className="space-y-4">
                {/* Full name */}
                <Input
                  label="Full name"
                  placeholder="Jane Q. Public"
                  prefix={<UserIcon className="size-5" strokeWidth={1} />}
                  error={errors?.fullName?.message}
                  {...register("fullName")}
                />

                {/* Email */}
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  prefix={<EnvelopeIcon className="size-5" strokeWidth={1} />}
                  error={errors?.email?.message}
                  {...register("email")}
                />

                {/* Password */}
                <div>
                  <Input
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    prefix={<LockClosedIcon className="size-5" strokeWidth={1} />}
                    suffix={
                      <Button
                        unstyled
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((v) => !v)}
                        className="pointer-events-auto flex h-full w-9 items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-dark-100"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="size-5" />
                        ) : (
                          <EyeIcon className="size-5" />
                        )}
                      </Button>
                    }
                    error={errors?.password?.message}
                    {...register("password")}
                  />

                  {/* Strength meter */}
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full ${
                              i < strength.score
                                ? strength.color
                                : "bg-gray-200 dark:bg-dark-600"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-gray-400 dark:text-dark-400">
                        Password strength:{" "}
                        <span className="font-medium">{strength.label}</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Role selector */}
                <div>
                  <label className="input-label mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-100">
                    I want to…
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <RoleCard
                      value="student"
                      title="Learn"
                      description="Take courses"
                      icon={<AcademicCapIcon className="size-5" />}
                      checked={watch("role") === "student"}
                      register={register}
                    />
                    <RoleCard
                      value="instructor"
                      title="Teach"
                      description="Publish courses"
                      icon={<PresentationChartLineIcon className="size-5" />}
                      checked={watch("role") === "instructor"}
                      register={register}
                    />
                  </div>
                  {errors?.role?.message && (
                    <p className="mt-1.5 text-xs text-error dark:text-error-lighter">
                      {errors.role.message}
                    </p>
                  )}
                </div>

                {/* Terms */}
                <div>
                  <Checkbox
                    id="accept-terms"
                    label={
                      <span className="text-sm text-gray-600 dark:text-dark-200">
                        I agree to the{" "}
                        <a
                          href="##"
                          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a
                          href="##"
                          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          Privacy Policy
                        </a>
                        .
                      </span>
                    }
                    {...register("acceptTerms")}
                  />
                  {errors?.acceptTerms?.message && (
                    <p className="mt-1.5 text-xs text-error dark:text-error-lighter">
                      {errors.acceptTerms.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Server error */}
              <div className="mt-3">
                <InputErrorMsg when={!!(serverError && serverError !== "")}>
                  {serverError}
                </InputErrorMsg>
              </div>

              <Button
                type="submit"
                color="primary"
                className="mt-5 w-full gap-2"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating account…
                  </>
                ) : (
                  <>
                    <CheckIcon className="size-5" />
                    Create Account
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center space-x-3 text-xs rtl:space-x-reverse">
              <div className="h-px flex-1 bg-gray-200 dark:bg-dark-500" />
              <p>OR</p>
              <div className="h-px flex-1 bg-gray-200 dark:bg-dark-500" />
            </div>

            {/* OAuth */}
            <div className="flex gap-4">
              <Button
                variant="outlined"
                className="h-10 flex-1 gap-3"
                onClick={() => navigate("/oauth/callback?provider=google")}
              >
                <img
                  className="size-5.5"
                  src="/images/logos/google.svg"
                  alt="Google logo"
                />
                <span>Google</span>
              </Button>
              <Button
                variant="outlined"
                className="h-10 flex-1 gap-3"
                onClick={() => navigate("/oauth/callback?provider=github")}
              >
                <img
                  className="size-5.5"
                  src="/images/logos/github.svg"
                  alt="GitHub logo"
                />
                <span>GitHub</span>
              </Button>
            </div>

            {/* Sign-in link */}
            <div className="mt-5 text-center text-xs-plus">
              <p className="line-clamp-1">
                <span>Already have an account?</span>{" "}
                <Link
                  className="text-primary-600 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-600"
                  to="/login"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </Card>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-dark-300">
            <ShieldCheckIcon className="size-3.5" />
            <span>Your data is encrypted and never shared.</span>
          </div>
        </div>
      </main>
    </Page>
  );
}

// ----------------------------------------------------------------------

/** Selectable role card with a hidden radio driven by react-hook-form. */
function RoleCard({
  value,
  title,
  description,
  icon,
  checked,
  register,
}: {
  value: SignupRole;
  title: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  register: ReturnType<typeof useForm<SignupFormValues>>["register"];
}) {
  return (
    <label
      className={`relative flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors ${
        checked
          ? "border-primary-500 bg-primary-500/5 dark:bg-primary-500/10"
          : "border-gray-200 hover:border-gray-300 dark:border-dark-500 dark:hover:border-dark-400"
      }`}
    >
      <Radio
        value={value}
        checked={checked}
        unstyled
        className="sr-only"
        {...register("role")}
      />
      <div className="flex items-center gap-2">
        <span
          className={`flex size-8 items-center justify-center rounded-md ${
            checked
              ? "bg-primary-500 text-white"
              : "bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-300"
          }`}
        >
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            {title}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-dark-300">
            {description}
          </p>
        </div>
      </div>
    </label>
  );
}

export { SignupPage };
