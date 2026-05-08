import { env } from "@/lib/env";

const VAPI_BASE = "https://api.vapi.ai";

type VapiTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
  server: { url: string; secret?: string };
};

async function vapiFetch<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${VAPI_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.vapiPrivateKey()}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vapi ${init.method ?? "GET"} ${path} failed: ${res.status} ${body}`);
  }
  return (await res.json()) as T;
}

export type CreateAssistantArgs = {
  businessId: string;
  businessName: string;
  systemPrompt: string;
  appUrl: string;
  webhookSecret: string;
};

export function buildAssistantConfig(args: CreateAssistantArgs) {
  const tools: VapiTool[] = [
    {
      type: "function",
      function: {
        name: "check_availability",
        description:
          "Check whether a given service is available at a given local datetime. Returns a list of nearby free start times if not.",
        parameters: {
          type: "object",
          properties: {
            service: { type: "string", description: "Name of the service requested." },
            requestedAt: {
              type: "string",
              description: "ISO 8601 datetime in the business's local timezone.",
            },
          },
          required: ["service", "requestedAt"],
        },
      },
      server: {
        url: `${args.appUrl}/api/vapi/tools/check-availability`,
        secret: args.webhookSecret,
      },
    },
    {
      type: "function",
      function: {
        name: "book_appointment",
        description:
          "Book an appointment for the customer. Always confirm name, phone, service, and time before calling this.",
        parameters: {
          type: "object",
          properties: {
            customerName: { type: "string" },
            customerPhone: { type: "string" },
            service: { type: "string" },
            scheduledAt: {
              type: "string",
              description: "ISO 8601 datetime in the business's local timezone.",
            },
            notes: { type: "string" },
          },
          required: ["customerName", "customerPhone", "service", "scheduledAt"],
        },
      },
      server: {
        url: `${args.appUrl}/api/vapi/tools/book-appointment`,
        secret: args.webhookSecret,
      },
    },
  ];

  return {
    name: `${args.businessName} Receptionist`,
    metadata: { business_id: args.businessId },
    voice: { provider: "11labs", voiceId: "burt" },
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: args.systemPrompt }],
      tools,
    },
    transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
    firstMessage: `Hi, thanks for calling ${args.businessName}. How can I help you today?`,
    serverUrl: `${args.appUrl}/api/vapi/webhook`,
    serverUrlSecret: args.webhookSecret,
    endCallFunctionEnabled: true,
    recordingEnabled: true,
  };
}

export async function createAssistant(args: CreateAssistantArgs) {
  return vapiFetch<{ id: string }>("/assistant", {
    method: "POST",
    body: JSON.stringify(buildAssistantConfig(args)),
  });
}

export async function updateAssistant(assistantId: string, args: CreateAssistantArgs) {
  return vapiFetch<{ id: string }>(`/assistant/${assistantId}`, {
    method: "PATCH",
    body: JSON.stringify(buildAssistantConfig(args)),
  });
}

export type VapiPhoneNumber = {
  id: string;
  number: string;
  assistantId?: string;
};

// Buy a number through Vapi's Twilio reseller integration. In production you'd
// likely also support BYO Twilio creds; for the MVP we ask Vapi to provision.
export async function buyPhoneNumber(args: {
  assistantId: string;
  areaCode?: string;
}): Promise<VapiPhoneNumber> {
  return vapiFetch<VapiPhoneNumber>("/phone-number/buy", {
    method: "POST",
    body: JSON.stringify({
      provider: "vapi",
      areaCode: args.areaCode,
      assistantId: args.assistantId,
    }),
  });
}

export async function attachAssistantToNumber(numberId: string, assistantId: string) {
  return vapiFetch(`/phone-number/${numberId}`, {
    method: "PATCH",
    body: JSON.stringify({ assistantId }),
  });
}
