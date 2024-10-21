/*This class can be used to capture operational errors as these can be anticipated.*/
class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    //If the errorcodce is between 400 and 500, it is a client side error so the status is set to fail.
    this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
    this.isOperational = true;
    //stacktrace from super class is used to get stacktrace. this keyword caputres the current object and the customError class is passed as the second parameter.
    Error.captureStackTrace(this, this.constructor);
  }
}
export default CustomError;
