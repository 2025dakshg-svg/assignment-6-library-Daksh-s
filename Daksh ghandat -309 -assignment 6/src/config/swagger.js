/**
 * Swagger / OpenAPI configuration
 * -------------------------------
 * The single source of truth for the API documentation is the standalone
 * `docs/swagger.yaml` file. This module:
 *   1. Loads + parses `docs/swagger.yaml` (via `js-yaml`, a transitive dep of
 *      swagger-jsdoc).
 *   2. Runs it through `swaggerJSDoc` so the OpenAPI 3 spec is validated/
 *      normalized by the swagger toolchain.
 *   3. Exposes the `swagger-ui-express` UI + document for mounting at `/api-docs`.
 */

const fs = require('fs');
const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// js-yaml is a dependency of swagger-jsdoc and is hoisted into node_modules.
// eslint-disable-next-line global-require
const yaml = require('js-yaml');

const yamlPath = path.join(__dirname, '..', '..', 'docs', 'swagger.yaml');

if (!fs.existsSync(yamlPath)) {
  throw new Error('[Swagger] docs/swagger.yaml not found.');
}

const yamlContent = fs.readFileSync(yamlPath, 'utf8');
const parsedDefinition = yaml.load(yamlContent);

// Run through swagger-jsdoc so the OpenAPI toolchain owns the final spec.
const swaggerSpec = swaggerJSDoc({
  definition: parsedDefinition,
  apis: [], // all paths live in docs/swagger.yaml
});

const options = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    displayRequestDuration: true,
    persistAuthorization: true,
  },
};

module.exports = { swaggerUi, swaggerDocument: swaggerSpec, yamlPath, options };