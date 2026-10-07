/**
 * Request validation middleware using Zod.
 * Enforces strict schemas and populates req.validated[source].
 *
 * @param {import('zod').ZodType} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} [source='body'] - Request property to validate
 * @returns {import('express').RequestHandler}
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  // Enforce .strict() if schema is a ZodObject without strict applied
  const strictSchema =
    typeof schema.strict === 'function' ? schema.strict() : schema;

  const result = strictSchema.safeParse(req[source]);
  if (!result.success) {
    return next(result.error);
  }

  req.validated = req.validated || {};
  req.validated[source] = result.data;
  next();
};

export default validate;
