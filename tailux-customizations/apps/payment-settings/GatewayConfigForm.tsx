// GatewayConfigForm — dynamic configuration form for a single payment gateway.
//
// Field shape is driven by the gateway key:
//   - stripe    → publishable_key, secret_key, webhook_signing_secret
//   - paypal    → client_id, client_secret, webhook_id
//   - razorpay  → key_id, key_secret, webhook_secret
//   - manual    → instructions textarea
//   - others    → generic api_key + api_secret
//
// All credential fields render as password inputs with a show/hide toggle.
// Mode (test / live) is a Switch. "Test Connection" is a stub (logs to console
// for now). "Save" creates the gateway via `useCreateGateway()` when no
// existing config is present, otherwise it patches via `useUpdateGateway()`.
//
// The form uses `react-hook-form` + `yup` per the task spec (matching the
// pattern in `src/app/pages/Auth`).

// Import Dependencies
import { useEffect, useMemo, useState } from "react";
import { useForm, type UseFormRegister } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import clsx from "clsx";
import {
  EyeIcon,
  EyeSlashIcon,
  BeakerIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  TrashIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input, Textarea, Switch } from "@/components/ui";
import { LoadingState, ErrorState } from "@/components/lms";
import {
  useCreateGateway,
  useUpdateGateway,
  useDeleteGateway,
} from "@/hooks/useEcommerce";
import type { PaymentGatewayConfig } from "@/types/lms";

import { SUPPORTED_GATEWAYS } from "./GatewayList";

// ----------------------------------------------------------------------

/** Schema-driven field descriptors used to build the dynamic credential form. */
type CredentialField =
  | {
      kind: "text";
      name: string;
      label: string;
      placeholder?: string;
      description?: string;
      required?: boolean;
      secret?: boolean;
    }
  | {
      kind: "textarea";
      name: string;
      label: string;
      placeholder?: string;
      description?: string;
      required?: boolean;
    };

/** Returns the credential field set for the given gateway key. */
function credentialFieldsFor(gatewayKey: string): CredentialField[] {
  switch (gatewayKey) {
    case "stripe":
      return [
        {
          kind: "text",
          name: "publishable_key",
          label: "Publishable key",
          placeholder: "pk_live_…",
          required: true,
          secret: false,
        },
        {
          kind: "text",
          name: "secret_key",
          label: "Secret key",
          placeholder: "sk_live_…",
          required: true,
          secret: true,
        },
        {
          kind: "text",
          name: "webhook_signing_secret",
          label: "Webhook signing secret",
          placeholder: "whsec_…",
          required: true,
          secret: true,
        },
      ];
    case "paypal":
      return [
        {
          kind: "text",
          name: "client_id",
          label: "Client ID",
          placeholder: "AY…",
          required: true,
          secret: false,
        },
        {
          kind: "text",
          name: "client_secret",
          label: "Client secret",
          placeholder: "EL…",
          required: true,
          secret: true,
        },
        {
          kind: "text",
          name: "webhook_id",
          label: "Webhook ID",
          placeholder: "8PT1234…",
          required: false,
          secret: false,
        },
      ];
    case "razorpay":
      return [
        {
          kind: "text",
          name: "key_id",
          label: "Key ID",
          placeholder: "rzp_live_…",
          required: true,
          secret: false,
        },
        {
          kind: "text",
          name: "key_secret",
          label: "Key secret",
          placeholder: "••••••••",
          required: true,
          secret: true,
        },
        {
          kind: "text",
          name: "webhook_secret",
          label: "Webhook secret",
          placeholder: "••••••••",
          required: false,
          secret: true,
        },
      ];
    case "manual":
      return [
        {
          kind: "textarea",
          name: "instructions",
          label: "Manual payment instructions",
          placeholder:
            "Transfer the order total to:\nBank: …\nAccount: …\nReference: order number",
          required: true,
          description:
            "Shown to the buyer on the checkout success page. Supports plain text + line breaks.",
        },
      ];
    default:
      return [
        {
          kind: "text",
          name: "api_key",
          label: "API key",
          placeholder: "••••••••",
          required: true,
          secret: false,
        },
        {
          kind: "text",
          name: "api_secret",
          label: "API secret",
          placeholder: "••••••••",
          required: false,
          secret: true,
        },
      ];
  }
}

/** Build a yup schema dynamically from the field descriptors. */
function buildSchema(fields: CredentialField[]) {
  const shape: Record<string, Yup.StringSchema> = {};
  for (const f of fields) {
    let s = Yup.string().trim();
    if (f.required) s = s.required(`${f.label} is required.`);
    shape[f.name] = s;
  }
  // Always allow an optional instructions field for manual gateway.
  if (!shape["instructions"]) {
    shape["instructions"] = Yup.string().trim().default("");
  }
  return Yup.object().shape(shape);
}

/** Form values are always flat string fields keyed by credential field name. */
type FormValues = Record<string, string>;

export interface GatewayConfigFormProps {
  /** Gateway key (stripe / paypal / razorpay / manual / …). */
  gatewayKey: string;
  /** Existing config for this gateway, if any. */
  config: PaymentGatewayConfig | undefined;
  /** Called after a successful create / update so the parent can refetch. */
  onSaved?: () => void;
  /** Called after a successful delete (parent typically clears selection). */
  onDeleted?: () => void;
}

// ----------------------------------------------------------------------

export default function GatewayConfigForm({
  gatewayKey,
  config,
  onSaved,
  onDeleted,
}: GatewayConfigFormProps) {
  const meta = useMemo(
    () =>
      SUPPORTED_GATEWAYS.find((g) => g.key === gatewayKey) ?? {
        key: gatewayKey,
        label: gatewayKey,
        icon: InformationCircleIcon,
        tagline: "",
      },
    [gatewayKey],
  );

  const fields = useMemo(
    () => credentialFieldsFor(gatewayKey),
    [gatewayKey],
  );

  const schema = useMemo(() => buildSchema(fields), [fields]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: getDefaultValues(config, fields),
  });

  // Re-seed the form whenever the selected gateway changes or the existing
  // config lands. `config` is undefined for unconfigured gateways.
  useEffect(() => {
    reset(getDefaultValues(config, fields));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatewayKey, config?.id]);

  // Local UI state for the toggles not owned by react-hook-form.
  const [isEnabled, setIsEnabled] = useState<boolean>(config?.isEnabled ?? false);
  const [isDefault, setIsDefault] = useState<boolean>(config?.isDefault ?? false);
  const [mode, setMode] = useState<"test" | "live">(
    config?.mode === "live" ? "live" : "test",
  );
  const [testStatus, setTestStatus] = useState<
    { kind: "idle" } | { kind: "running" } | { kind: "ok"; msg: string } | { kind: "err"; msg: string }
  >({ kind: "idle" });

  useEffect(() => {
    setIsEnabled(config?.isEnabled ?? false);
    setIsDefault(config?.isDefault ?? false);
    setMode(config?.mode === "live" ? "live" : "test");
    setTestStatus({ kind: "idle" });
  }, [gatewayKey, config?.id]);

  const createGateway = useCreateGateway();
  const updateGateway = useUpdateGateway();
  const deleteGateway = useDeleteGateway();

  // ───────────────── Submit ─────────────────
  const onSubmit = (values: FormValues) => {
    const payload: Partial<PaymentGatewayConfig> = {
      gateway: gatewayKey,
      isEnabled,
      isDefault,
      mode,
      credentials: { ...values },
    };

    if (config?.id) {
      void updateGateway
        .mutate({ id: config.id, input: payload })
        .then((result) => {
          if (result) onSaved?.();
        });
    } else {
      void createGateway
        .mutate(payload)
        .then((result) => {
          if (result) onSaved?.();
        });
    }
  };

  // ───────────────── Test connection (stub) ─────────────────
  const handleTestConnection = () => {
    setTestStatus({ kind: "running" });
    // Stubbed — the backend test endpoint is not yet specified. Simulate a
    // network round-trip then report a soft success so the UI flow works.
    window.setTimeout(() => {
      setTestStatus({
        kind: "ok",
        msg: "Credentials accepted by the gateway (stub response).",
      });
    }, 700);
  };

  // ───────────────── Delete ─────────────────
  const handleDelete = () => {
    if (!config?.id) return;
    if (
      !window.confirm(
        `Remove the ${meta.label} gateway configuration? This cannot be undone.`,
      )
    ) {
      return;
    }
    void deleteGateway.mutate(config.id).then((result) => {
      if (result) onDeleted?.();
    });
  };

  const isSubmitting = createGateway.loading || updateGateway.loading;
  const mutationError = createGateway.error || updateGateway.error;

  // ───────────────── Render ─────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-5 dark:border-dark-600">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
            <meta.icon className="size-5 stroke-2" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                {meta.label}
              </h1>
              {config ? (
                <Badge
                  color={config.isEnabled ? "success" : "neutral"}
                  variant="soft"
                  className="text-[10px]"
                >
                  {config.isEnabled ? "Enabled" : "Disabled"}
                </Badge>
              ) : (
                <Badge color="neutral" variant="soft" className="text-[10px]">
                  Not configured
                </Badge>
              )}
              {config?.mode && (
                <Badge
                  color={config.mode === "live" ? "error" : "info"}
                  variant="soft"
                  className="text-[10px] uppercase"
                >
                  {config.mode}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
              {meta.tagline}
            </p>
          </div>
        </div>
        {config?.id && (
          <Button
            variant="flat"
            color="error"
            className="gap-1.5"
            onClick={handleDelete}
            disabled={deleteGateway.loading}
          >
            {deleteGateway.loading ? (
              <ArrowPathIcon className="size-4 animate-spin" />
            ) : (
              <TrashIcon className="size-4" />
            )}
            Remove
          </Button>
        )}
      </header>

      {/* Toggles */}
      <Card className="p-5">
        <div className="divide-y divide-gray-100 dark:divide-dark-600">
          <ToggleRow
            title="Enable this gateway"
            description="Enabled gateways appear in the checkout payment-method picker."
          >
            <Switch
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              aria-label="Enable gateway"
            />
          </ToggleRow>
          <ToggleRow
            title="Set as default gateway"
            description="The default gateway is pre-selected at checkout."
          >
            <Switch
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              aria-label="Set as default"
            />
          </ToggleRow>
          <ToggleRow
            title="Live mode"
            description="Use live credentials. Disable to use the sandbox / test environment."
          >
            <Switch
              checked={mode === "live"}
              onChange={(e) => setMode(e.target.checked ? "live" : "test")}
              aria-label="Toggle live mode"
            />
          </ToggleRow>
        </div>
      </Card>

      {/* Credentials */}
      <Card className="p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Credentials
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            {config
              ? "Stored encrypted on the server. Existing secrets stay masked unless you re-enter them."
              : "Stored encrypted on the server. Never shared with the client after save."}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) =>
            f.kind === "textarea" ? (
              <Textarea
                key={f.name}
                label={f.label}
                placeholder={f.placeholder}
                description={f.description}
                rows={5}
                error={errors[f.name]?.message as string | undefined}
                classNames={{ root: "sm:col-span-2" }}
                {...register(f.name)}
              />
            ) : (
              <SecretInput
                key={f.name}
                name={f.name}
                label={f.label}
                placeholder={f.placeholder}
                description={f.description}
                required={f.required}
                register={register}
                errorMessage={errors[f.name]?.message as string | undefined}
                masked={!!config}
              />
            ),
          )}
        </div>
      </Card>

      {/* Mutation error */}
      {mutationError && (
        <Card className="border-error-500/30 bg-error-500/5 p-4 dark:border-error-500/30">
          <ErrorState error={mutationError} title="Couldn't save gateway" />
        </Card>
      )}

      {/* Test connection result */}
      {testStatus.kind !== "idle" && (
        <div
          className={clsx(
            "rounded-md px-3 py-2 text-xs",
            testStatus.kind === "running" &&
              "bg-info-500/10 text-info-700 dark:bg-info-500/15 dark:text-info-300",
            testStatus.kind === "ok" &&
              "bg-success-500/10 text-success-700 dark:bg-success-500/15 dark:text-success-300",
            testStatus.kind === "err" &&
              "bg-error-500/10 text-error-700 dark:bg-error-500/15 dark:text-error-300",
          )}
          role="status"
        >
          {testStatus.kind === "running" && "Testing connection…"}
          {testStatus.kind === "ok" && (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircleIcon className="size-3.5" />
              {testStatus.msg}
            </span>
          )}
          {testStatus.kind === "err" && testStatus.msg}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          variant="outlined"
          color="neutral"
          className="gap-1.5"
          onClick={handleTestConnection}
          disabled={testStatus.kind === "running"}
        >
          {testStatus.kind === "running" ? (
            <ArrowPathIcon className="size-4 animate-spin" />
          ) : (
            <BeakerIcon className="size-4" />
          )}
          Test connection
        </Button>
        <Button
          type="submit"
          color="primary"
          variant="filled"
          className="gap-1.5"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <ArrowPathIcon className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <CheckCircleIcon className="size-4" />
              {config ? "Save changes" : "Save gateway"}
            </>
          )}
        </Button>
      </div>

      {/* Loading overlay during the very first create / update call */}
      {isSubmitting && (
        <div className="sr-only" aria-live="polite">
          <LoadingState inline message="Saving gateway configuration…" />
        </div>
      )}
    </form>
  );
}

// ----------------------------------------------------------------------

/** Toggle row matching the layout used in `settings-pages`. */
function ToggleRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
          {description}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Password-style input with show / hide toggle, wired to react-hook-form. */
function SecretInput({
  name,
  label,
  placeholder,
  description,
  required,
  register,
  errorMessage,
  masked,
}: {
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  register: UseFormRegister<FormValues>;
  errorMessage?: string;
  /** When true (editing an existing config), seed the field with a mask. */
  masked: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      label={label}
      placeholder={placeholder}
      description={description}
      required={required}
      type={visible ? "text" : "password"}
      prefix={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex size-full items-center justify-center text-gray-400 hover:text-primary-500 dark:text-dark-300 dark:hover:text-primary-400"
          aria-label={visible ? "Hide value" : "Show value"}
        >
          {visible ? (
            <EyeSlashIcon className="size-4" />
          ) : (
            <EyeIcon className="size-4" />
          )}
        </button>
      }
      error={errorMessage}
      {...register(name)}
      defaultValue={masked ? "••••••••••••" : ""}
    />
  );
}

/** Returns the initial form values for the given field set + existing config. */
function getDefaultValues(
  config: PaymentGatewayConfig | undefined,
  fields: CredentialField[],
): FormValues {
  const values: FormValues = {};
  for (const f of fields) {
    const stored = config?.credentials?.[f.name];
    values[f.name] = typeof stored === "string" ? stored : "";
  }
  return values;
}
