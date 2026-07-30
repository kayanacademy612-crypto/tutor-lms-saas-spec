// Import Dependencies
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";

// Local Imports
import Logo from "@/assets/appLogo.svg?react";
import { Button, Card, Checkbox, Input, InputErrorMsg } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import { AuthFormValues, schema } from "./schema";
import { Page } from "@/components/shared/Page";
import { HOME_PATH } from "@/constants/app";

// ----------------------------------------------------------------------

export default function SignIn() {
  const navigate = useNavigate();
  const { login, errorMessage, isLoading, clearError } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: AuthFormValues) => {
    clearError();
    try {
      await login({ email: data.email, password: data.password });
      // Successful login — GhostGuard would also bounce us to HOME_PATH,
      // but navigating explicitly keeps the UX snappy.
      navigate(HOME_PATH, { replace: true });
    } catch (err) {
      // MFA challenge required — the backend returned a ticket instead of
      // a token. The provider stashed it in sessionStorage; redirect to
      // the MFA verify page.
      if (err instanceof Error && err.message === "MFA_REQUIRED") {
        navigate("/mfa-verify", { replace: true });
        return;
      }
      // Otherwise the error is already surfaced via `errorMessage` from
      // the auth context — nothing to do here.
    }
  };

  return (
    <Page title="Login">
      <main className="min-h-100vh grid w-full grow grid-cols-1 place-items-center">
        <div className="w-full max-w-[26rem] p-4 sm:px-5">
          <div className="text-center">
            <Logo className="mx-auto size-16" />
            <div className="mt-4">
              <h2 className="text-2xl font-semibold text-gray-600 dark:text-dark-100">
                Welcome Back
              </h2>
              <p className="text-gray-400 dark:text-dark-300">
                Please sign in to continue
              </p>
            </div>
          </div>
          <Card className="mt-5 rounded-lg p-5 lg:p-7">
            <form onSubmit={handleSubmit(onSubmit)} autoComplete="off" noValidate>
              <div className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  prefix={
                    <EnvelopeIcon
                      className="size-5 transition-colors duration-200"
                      strokeWidth="1"
                    />
                  }
                  {...register("email")}
                  error={errors?.email?.message}
                />
                <Input
                  label="Password"
                  placeholder="Enter Password"
                  type={showPassword ? "text" : "password"}
                  prefix={
                    <LockClosedIcon
                      className="size-5 transition-colors duration-200"
                      strokeWidth="1"
                    />
                  }
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
                  {...register("password")}
                  error={errors?.password?.message}
                />
              </div>

              <div className="mt-2">
                <InputErrorMsg when={!!(errorMessage && errorMessage !== "")}>
                  {errorMessage}
                </InputErrorMsg>
              </div>

              <div className="mt-4 flex items-center justify-between space-x-2">
                <Checkbox label="Remember me" />
                <Link
                  to="/forgot-password"
                  className="text-xs text-gray-400 transition-colors hover:text-gray-800 focus:text-gray-800 dark:text-dark-300 dark:hover:text-dark-100 dark:focus:text-dark-100"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                className="mt-5 w-full gap-2"
                color="primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRightIcon className="size-5" />
                  </>
                )}
              </Button>
            </form>
            <div className="mt-4 text-center text-xs-plus">
              <p className="line-clamp-1">
                <span>Dont have an account?</span>{" "}
                <Link
                  className="text-primary-600 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-600"
                  to="/signup"
                >
                  Create account
                </Link>
              </p>
            </div>
            <div className="my-7 flex items-center space-x-3 text-xs rtl:space-x-reverse">
              <div className="h-px flex-1 bg-gray-200 dark:bg-dark-500"></div>
              <p>OR</p>
              <div className="h-px flex-1 bg-gray-200 dark:bg-dark-500"></div>
            </div>
            <div className="flex gap-4">
              <Button
                className="h-10 flex-1 gap-3"
                variant="outlined"
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
                className="h-10 flex-1 gap-3"
                variant="outlined"
                onClick={() => navigate("/oauth/callback?provider=github")}
              >
                <img
                  className="size-5.5"
                  src="/images/logos/github.svg"
                  alt="GitHub logo"
                />
                <span>Github</span>
              </Button>
            </div>
          </Card>
          <div className="mt-8 flex justify-center text-xs text-gray-400 dark:text-dark-300">
            <a href="##">Privacy Notice</a>
            <div className="mx-2.5 my-0.5 w-px bg-gray-200 dark:bg-dark-500"></div>
            <a href="##">Term of service</a>
          </div>
        </div>
      </main>
    </Page>
  );
}
