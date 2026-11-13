/**
 * The one place that talks to the network.
 *
 * With no backend, the browser calls sources directly, which makes CORS a first-class
 * failure mode rather than a mystery. Every layer may declare a `proxy`; unset in the
 * static build, pointed at a backend in a fullstack one. Nothing else changes.
 */
import type { Auth } from "@/core/config/schema";
import { renderError, type RenderContext, type RenderError } from "@/core/render/renderer";
import { err, ok, type Result } from "@/core/result";

export interface RequestPlan {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
}

export interface RequestOptions {
  readonly auth?: Auth;
  readonly proxy?: string;
  readonly params?: Readonly<Record<string, string>>;
}

/** A proxy receives its target as `?url=`, so one endpoint serves every layer. */
const throughProxy = (proxy: string, target: string): string => {
  const url = new URL(proxy);
  url.searchParams.set("url", target);
  return url.toString();
};

const isCrossOrigin = (target: string): boolean => {
  if (typeof location === "undefined") {
    return false;
  }
  try {
    return new URL(target, location.href).origin !== location.origin;
  } catch {
    return false;
  }
};

/**
 * Resolves a URL, its query and its credential before anything is sent, so a missing
 * secret is a typed error rather than a confusing 401.
 */
export const planRequest = (
  rawUrl: string,
  context: RenderContext,
  { auth, proxy, params }: RequestOptions = {},
): Result<RequestPlan, RenderError> => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return err(renderError("config", `"${rawUrl}" is not a valid URL.`));
  }

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = {};

  if (auth) {
    const secret = context.secret(auth);
    if (secret === undefined || secret === "") {
      return err(renderError("auth", `This layer needs a ${auth.name} credential.`));
    }
    if (auth.in === "query") {
      url.searchParams.set(auth.name, secret);
    } else {
      headers[auth.name] = secret;
    }
  }

  const target = url.toString();
  return ok({ url: proxy === undefined ? target : throughProxy(proxy, target), headers });
};

const send = async (
  plan: RequestPlan,
  context: RenderContext,
  init: RequestInit = {},
): Promise<Result<Response, RenderError>> => {
  let response: Response;
  try {
    response = await context.fetch(plan.url, {
      ...init,
      headers: { ...plan.headers, ...(init.headers as Record<string, string> | undefined) },
      ...(context.signal ? { signal: context.signal } : {}),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "The request failed.";
    // Browsers report a blocked cross-origin response as an opaque network failure,
    // so say the actionable thing rather than the literally certain one.
    return isCrossOrigin(plan.url)
      ? err(renderError("cors", `${message} This source may not allow browser requests — try a proxy.`))
      : err(renderError("network", message));
  }

  if (!response.ok) {
    const kind = response.status === 401 || response.status === 403 ? "auth" : "http";
    return err(renderError(kind, `The source answered ${response.status}.`, response.status));
  }

  return ok(response);
};

const readJson = async <T>(response: Response): Promise<Result<T, RenderError>> => {
  try {
    return ok((await response.json()) as T);
  } catch {
    return err(renderError("parse", "The source did not return valid JSON."));
  }
};

export const fetchJson = async <T>(plan: RequestPlan, context: RenderContext): Promise<Result<T, RenderError>> => {
  const response = await send(plan, context);
  return response.ok ? readJson<T>(response.value) : response;
};

export const fetchText = async (plan: RequestPlan, context: RenderContext): Promise<Result<string, RenderError>> => {
  const response = await send(plan, context);
  if (!response.ok) {
    return response;
  }

  try {
    return ok(await response.value.text());
  } catch {
    return err(renderError("parse", "The source response could not be read."));
  }
};

export const postJson = async <T>(
  plan: RequestPlan,
  body: unknown,
  context: RenderContext,
): Promise<Result<T, RenderError>> => {
  const response = await send(plan, context, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.ok ? readJson<T>(response.value) : response;
};
