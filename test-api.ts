const apiId = '006d502e-ee8c-4686-9941-9f5c0948d688';
const versionId = '2b77e7c5-8705-4d91-9741-1dfe8f445736';

async function test() {
  const res = await fetch(`http://localhost:3000/api/admin/v1/apis/${apiId}/endpoints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // We need to bypass authentication for this test, or we can just see the validation error if it gets there.
      // Wait, the API requires NextAuth session!
    },
    body: JSON.stringify({
      apiVersionId: versionId,
      name: "Virtual Try-On",
      path: "/api/external/tryon",
      backendPath: "",
      method: "POST",
      timeoutMs: 30000,
      payloadLimit: 1048576,
      visibility: "PUBLIC"
    })
  });
  
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

test();
