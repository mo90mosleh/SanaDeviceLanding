import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/consultation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleConsultation } = await import("@/server/consultation");
        return handleConsultation(request);
      },
    },
  },
});
