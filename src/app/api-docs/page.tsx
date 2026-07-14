'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocsPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto p-4">
        <SwaggerUI url="/api/admin/v1/api-docs" />
      </div>
    </div>
  );
}
