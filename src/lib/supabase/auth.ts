import type { User } from "@supabase/supabase-js";

type GetUserResult = {
  user: User | null;
  authError: unknown;
};

type AuthClient = {
  auth: {
    getUser(): Promise<{
      data: { user: User | null };
    }>;
  };
};

function summarizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      cause:
        error.cause instanceof Error
          ? {
              name: error.cause.name,
              message: error.cause.message,
            }
          : error.cause,
    };
  }

  return error;
}

export async function safeGetUser(
  supabase: AuthClient,
  source: string,
  path?: string,
): Promise<GetUserResult> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { user, authError: null };
  } catch (error) {
    console.error("[supabase-auth] getUser failed", {
      source,
      path,
      error: summarizeError(error),
    });

    return { user: null, authError: error };
  }
}
