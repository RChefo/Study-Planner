'use strict';

/**
 * Safe, structured API errors: { error: { code, message, requestId } }.
 * Messages are generic and fixed per code — internal details are only logged.
 */

const CATALOG = {
  INVALID_REQUEST: [400, 'The request could not be processed.'],
  INVALID_JSON: [400, 'The request body is not valid JSON.'],
  UNSUPPORTED_MEDIA_TYPE: [415, 'Requests must use Content-Type: application/json.'],
  PAYLOAD_TOO_LARGE: [413, 'The request is too large.'],
  UNAUTHENTICATED: [401, 'Sign in to continue.'],
  INVALID_CREDENTIAL: [401, 'The sign-in credential is invalid or expired.'],
  GOOGLE_ACCOUNT_UNVERIFIED: [401, 'This Google account’s email address is not verified.'],
  FORBIDDEN: [403, 'You do not have access to this resource.'],
  ORIGIN_NOT_ALLOWED: [403, 'Requests from this origin are not allowed.'],
  NOT_FOUND: [404, 'The requested resource was not found.'],
  METHOD_NOT_ALLOWED: [405, 'This method is not allowed for this resource.'],
  FILES_MISSING: [409, 'Some referenced files no longer exist.'],
  UNSUPPORTED_FILE_TYPE: [415, 'Only PDF, PNG, JPEG and WebP files are allowed.'],
  FILE_TOO_LARGE: [413, 'The file is too large.'],
  STORAGE_QUOTA_EXCEEDED: [413, 'Your file storage quota is full.'],
  RATE_LIMITED: [429, 'Too many requests. Please try again later.'],
  PROVIDER_NOT_CONFIGURED: [503, 'This sign-in method is not configured.'],
  PROVIDER_UNAVAILABLE: [502, 'The sign-in provider is not responding. Please try again.'],
  DATABASE_UNAVAILABLE: [503, 'The service is temporarily unavailable. Please try again.'],
  SERVICE_UNAVAILABLE: [503, 'The service is temporarily unavailable. Please try again.'],
  INTERNAL_ERROR: [500, 'Something went wrong. Please try again.'],
};

class AppError extends Error {
  constructor(code, { details, cause, status } = {}) {
    const [defaultStatus, message] = CATALOG[code] ?? CATALOG.INTERNAL_ERROR;
    super(message, { cause });
    this.name = 'AppError';
    this.code = CATALOG[code] ? code : 'INTERNAL_ERROR';
    this.status = status ?? defaultStatus;
    this.details = details;
  }
}

const MONGO_UNAVAILABLE = new Set(['MongoServerSelectionError', 'MongoNetworkError', 'MongoNetworkTimeoutError', 'MongoTopologyClosedError', 'MongoNotConnectedError', 'MongoPoolClearedError']);

/** Maps any thrown value to an AppError. */
function toAppError(err) {
  if (err instanceof AppError) return err;
  if (err && MONGO_UNAVAILABLE.has(err.name)) return new AppError('DATABASE_UNAVAILABLE', { cause: err });
  // body-parser / raw-body errors
  if (err && err.type === 'entity.parse.failed') return new AppError('INVALID_JSON', { cause: err });
  if (err && err.type === 'entity.too.large') return new AppError('PAYLOAD_TOO_LARGE', { cause: err });
  if (err && (err.type === 'encoding.unsupported' || err.type === 'charset.unsupported')) return new AppError('UNSUPPORTED_MEDIA_TYPE', { cause: err });
  if (err && (err.type === 'request.aborted' || err.code === 'ECONNABORTED')) return new AppError('INVALID_REQUEST', { cause: err });
  if (err && typeof err.status === 'number' && err.status >= 400 && err.status < 500) return new AppError('INVALID_REQUEST', { cause: err, status: err.status });
  return new AppError('INTERNAL_ERROR', { cause: err });
}

function sendError(res, appError, requestId) {
  const body = { error: { code: appError.code, message: appError.message } };
  if (appError.details) body.error.details = appError.details;
  if (requestId) body.error.requestId = requestId;
  res.status(appError.status).json(body);
}

/** Final Express error handler. */
function errorHandler(logger) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const appError = toAppError(err);
    const fields = { requestId: req.id, method: req.method, path: req.path, status: appError.status, errorCode: appError.code };
    if (appError.status >= 500) logger.error('request failed', { ...fields, err: appError.cause ?? err });
    else logger.info('request rejected', fields);
    if (res.headersSent) {
      // Streaming already started (e.g. a file download) — just end the response.
      res.destroy();
      return;
    }
    sendError(res, appError, req.id);
  };
}

module.exports = { AppError, toAppError, errorHandler, sendError };
