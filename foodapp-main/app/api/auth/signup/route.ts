import { NextResponse } from "next/server";
import {
  beginPasswordSignup,
} from "@/lib/auth/service.mjs";
import { parseJsonRequest, toErrorResponse } from "@/lib/auth/http.mjs";

export async function POST(request: Request) {
  try {
    const body = await parseJsonRequest(request);
    const result = await beginPasswordSignup(body);
    return NextResponse.json(
      {
        requiresCompletion: true,
        pendingToken: result.pendingToken,
        missingFields: result.missingFields,
        policy: {
          guestCanBrowse: true,
          checkoutRequiresLogin: true,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
