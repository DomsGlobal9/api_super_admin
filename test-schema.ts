import { z } from 'zod';

const CreateEndpointSchema = z.object({
  apiVersionId: z.string().uuid(),
  name: z.string().min(1),
  path: z.string().min(1),
  backendPath: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']),
  status: z.string().optional().default('ACTIVE'),
  visibility: z.string().optional().default('PUBLIC'),
  timeoutMs: z.coerce.number().optional().default(30000),
  payloadLimit: z.coerce.number().optional().default(1048576), 
});

const body = {
  "apiVersionId": "2b77e7c5-8705-4d91-9741-1dfe8f445736",
  "name": "Virtual Try-On",
  "path": "/api/external/tryon",
  "backendPath": "",
  "method": "POST",
  "timeoutMs": 30000,
  "payloadLimit": 1048576,
  "visibility": "PUBLIC"
};

const result = CreateEndpointSchema.safeParse(body);
console.log(JSON.stringify(result, null, 2));
