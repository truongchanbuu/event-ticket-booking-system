import ERROR_CODE from "../../error/error_code";

export default function checkJson(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      message: "Invalid JSON format",
      errorCode: ERROR_CODE.INVALID_DATA,
    });
  }
  next(err);
}
