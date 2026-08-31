import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 這行同時會在 access token 快過期時自動用 refresh token 換新的,
  // 讓使用者不會動不動就被登出。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  // getUser() 可能剛好在這次請求裡用 refresh token 換到新的 session,新的 cookie 寫在 response 上。
  // 如果接下來要 redirect,要用這個帶著新 cookie 的 response 建立 redirect,不然新換到的
  // refresh token 就這樣不見了 —— 之後舊的(已經因為 rotation 失效的)token 會讓使用者被異常登出。
  function redirectKeepingCookies(url: URL) {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (!user && !isPublicPath) {
    return redirectKeepingCookies(new URL("/login", request.url));
  }

  if (user && request.nextUrl.pathname === "/login") {
    return redirectKeepingCookies(new URL("/projects", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
