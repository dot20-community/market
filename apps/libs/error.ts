export type ErrorCode =
  | 'OK'
  /**
   * 服务器异常
   */
  | 'ERROR'
  /**
   * 没有安装钱包扩展
   */
  | 'NO_EXTENSION'
  /**
   * 钱包账户没有授权
   */
  | 'NO_AUTH'
  /**
   * 钱包账户不存在
   */
  | 'NO_ACCOUNT'
  /**
   * 用户驳回交易
   */
  | 'USER_REJECTED'
  /**
   * 非法的交易
   */
  | 'INVALID_TRANSACTION'
  /**
   * 钱包转账失败，比如dot余额不足
   */
  | 'TRANSFER_FAILED';

export class BizError extends Error {
  code: ErrorCode;

  constructor({ code, message }: { code: ErrorCode; message?: string }) {
    super(message);
    this.code = code;
    this.message = message ?? '';
  }
}
