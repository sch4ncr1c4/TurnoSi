import { Router } from "express";

import { ok } from "./http.js";

export function createDomainRouter(domain: string) {
  const router = Router();

  router.get("/", (_request, response) => {
    response.json(ok({ domain }));
  });

  return router;
}
