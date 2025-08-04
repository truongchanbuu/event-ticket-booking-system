export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((e) => {
    console.error(`[${fn.name}] Error:`, e);
    next(e);
  });
};
