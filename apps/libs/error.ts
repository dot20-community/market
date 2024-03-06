export type ErrorCode =
  "OK"
  | "ERROR"
  /**
   * 没有安装钱包扩展
   */
  | "NO_EXTENSION"
  /**
   * 钱包账户没有授权
   */
  | "NO_AUTH"
  /**
   * 钱包账户不存在
   */
  | "NO_ACCOUNT"
  /**
   * 用户驳回交易
   */
  | "USER_REJECTED";

export class BizError extends Error {
  code: ErrorCode;

  constructor({ code, message }: { code: ErrorCode; message?: string }) {
    super(message);
    this.code = code;
    this.message = message ?? "";
  }
}
