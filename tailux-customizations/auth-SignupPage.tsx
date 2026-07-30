// SignupPage — school owner signup screen.
//
// Layout: centered card with the product logo on top and a signup form below.
// Fields:
//   - School / Academy name  (drives the new tenant's name + subdomain)
//   - Full name              (the first user — the school's owner/admin)
//   - Email                  (login email)
//   - Password               (+ strength meter)
//   - Terms & conditions checkbox (required)
//   - Submit → "Create Account"
//
// On submit the form calls `signup()` from the auth context, which posts to
// `/api/auth/school-signup` (lastsaas backend, implemented by Agent AUTH-1).
// On success the user is redirected to the dashboard. The school owner is
// automatically an admin/instructor — there is no role selector here on
// purpose (a student signs up via a per-tenant enrollment flow, not this
// page).
//
// Below the form: divider + OAuth quick-signup buttons (Google / GitHub) and
// a "Already have an account? Sign in" link.
//
// Validation: react-hook-form + yup (same pattern as the login page in
// `src/app/pages/Auth/index.tsx`).

// Import Dependencies
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import * as Yup from "yup";
import {
  BuildingLibraryIcon,
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
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
import { Checkbox } from "@/components/ui/Form";
import { Page } from "@/components/shared/Page";
import { useAuthContext } from "@/app/contexts/auth/context";
import { HOME_PATH } from "@/constants/app";

// ----------------------------------------------------------------------

export interface SignupFormValues {
  schoolName: string;
  fullName: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

const schema = Yup.object().shape({
  schoolName: Yup.string()
    .trim()
    .min(2, "School name must be at least 2 characters")
    .max(80, "School name must be 80 characters or fewer")
    .required("School name is required"),
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
  const { signup } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: yupResolver(schema as Yup.ObjectSchema<SignupFormValues>),
    defaultValues: {
      schoolName: "",
      fullName: "",
      email: "",
      password: "",
      acceptTerms: false,
    },
  });

  const password = watch("password") ?? "";
  const strength = scorePassword(password);

  const onSubmit = async (data: SignupFormValues) => {
    setServerError(null);
    setInfoMessage(null);
    setSubmitting(true);
    try {
      await signup({
        schoolName: data.schoolName.trim(),
        fullName: data.fullName.trim(),
        email: data.email.trim(),
        password: data.password,
      });
      // Signup succeeded and a JWT was issued — head to the dashboard.
      navigate(HOME_PATH, { replace: true });
    } catch (err) {
      // Backend indicated the user must verify their email before they can
      // log in. The provider threw the sentinel — surface a friendly
      // message and bounce to the login page.
      if (err instanceof Error && err.message === "EMAIL_VERIFICATION_REQUIRED") {
        setInfoMessage(
          "Account created! Check your inbox for a verification email, then sign in.",
        );
        // Brief delay so the user can read the message before navigating.
        setTimeout(() => navigate("/login", { replace: true }), 1500);
        return;
      }
      // Extract a friendly message from the normalized AuthApiError shape.
      const e = err as { message?: string };
      setServerError(
        (e?.message && e.message.length > 0)
          ? e.message
          : "Signup failed. Please try again.",
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
                Create your school
              </h2>
              <p className="text-gray-400 dark:text-dark-300">
                Set up your academy in minutes — you'll be the owner.
              </p>
            </div>
          </div>

          <Card className="mt-5 rounded-lg p-5 lg:p-7">
            <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" noValidate>
              <div className="space-y-4">
                {/* School / Academy name */}
                <Input
                  label="School / Academy name"
                  placeholder="Springfield Music Academy"
                  prefix={<BuildingLibraryIcon className="size-5" strokeWidth={1} />}
                  error={errors?.schoolName?.message}
                  {...register("schoolName")}
                />

                {/* Full name */}
                <Input
                  label="Your full name"
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

              {/* Info message (e.g. email-verification required) */}
              {infoMessage && (
                <p className="mt-3 rounded-md bg-success-500/10 px-3 py-2 text-xs text-success-600 dark:text-success-400">
                  {infoMessage}
                </p>
              )}

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

export { SignupPage };
