import { NextResponse, type NextRequest } from "next/server";

export type ApiHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<Response> | Response;

export type ApiHandlerModule = Partial<
  Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", unknown>
>;

const dynamicNames = ["id", "key", "provider", "code", "token"] as const;

function findRoute(path: string[], routes: Record<string, ApiHandlerModule>) {
  const exact = path.join("/");
  if (routes[exact]) return { key: exact, module: routes[exact]! };

  for (let index = path.length - 1; index >= 0; index--) {
    for (const name of dynamicNames) {
      const candidate = [...path];
      candidate[index] = `[${name}]`;
      const key = candidate.join("/");
      if (routes[key]) return { key, module: routes[key]! };
    }
  }

  return null;
}

function routeParams(path: string[], key: string) {
  const params: Record<string, string> = {};
  key.split("/").forEach((segment, index) => {
    if (segment.startsWith("[") && segment.endsWith("]")) {
      params[segment.slice(1, -1)] = path[index]!;
    }
  });
  return params;
}

export async function dispatchApiRequest(
  request: NextRequest,
  path: string[],
  routes: Record<string, ApiHandlerModule>
) {
  const match = findRoute(path, routes);
  const method = request.method as keyof ApiHandlerModule;
  const handler = match?.module[method];

  if (!match || typeof handler !== "function") {
    return NextResponse.json({ error: "API route not found" }, { status: 404 });
  }

  return (handler as ApiHandler)(request, {
    params: Promise.resolve(routeParams(path, match.key)),
  });
}
