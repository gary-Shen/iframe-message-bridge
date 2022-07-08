import EventEmitter from './EventEmitter';

const createId = () => Math.random().toString(36).substr(2, 9);

export interface IMessage {
  msgId: string;
  event: string;
  err?: any;
  responseMsgId?: string;
  response?: any;
}

export interface IPromiseResult {
  id: string;
  resolve: (data: any) => void;
  reject: (reason: any) => void;
  timeoutId: number;
}

export default class Bridge {
  static TIMEOUT = 20000;

  event: EventEmitter = new EventEmitter();

  targetWindow: Window;

  promiseMapping = new Map<string, IPromiseResult>();

  constructor(targetWindow: Window) {
    this.targetWindow = targetWindow;

    window.addEventListener('message', ({ data: msg }: any) => {
      this._processMessage(msg);
    });
  }

  public post(msg: any = {}) {
    return new Promise((resolve, reject) => {
      const id = createId();

      this._sendMessage({
        ...msg,
        msgId: id,
      });

      const timeoutId = setTimeout(() => {
        this._rejectMsg(id, 'Timeout');
      }, Bridge.TIMEOUT);

      this.promiseMapping.set(id, {
        id,
        resolve,
        reject,
        timeoutId,
      });
    });
  }

  public registerMessageHandler(type: string, handler: (msg?: any) => void) {
    if (typeof type === 'function') {
      handler = type;
      type = '*';
    }

    this.event.on(type, handler);
  }

  public unregisterMessageHandler(type: string, handler: (msg?: any) => void) {
    this.event.off(type, handler);
  }


  private _processMessage(message: any) {
    try {
      const msg = JSON.parse(message);
      if (msg.responseMsgId) {
        return this._processResponseMessage(msg);
      }

      if (msg.msgId) {
        return this._processReceiveMessage(msg);
      }
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * 消息的最后一环节，处理消息的响应
   * @param msg 
   * @returns 
   */
  private _processResponseMessage(msg: any) {
    const msgId = msg.responseMsgId;
    const msgPromise = this._getMsgPromiseById(msgId);

    if (!msgPromise) {
      return;
    }

    clearTimeout(msgPromise.timeoutId);

    msg.err ? this._rejectMsg(msgId, msg) : this._resolveMsg(msgId, msg);

    this._removeMsgPromiseById(msgId);
  }

  /**
   * 处理接收到自另一window的消息，可以是一个消息，也可以是一个消息的响应
   * @param msg 
   * @returns 
   */
  private _processReceiveMessage(message: IMessage) {
    const { msgId, responseMsgId, ...restMsg } = message;

    const event = this.event;
    if (!event.has(restMsg.event)) {
      this._responseMsgResult(msgId, {
        err: 'Unregistered event',
        ...message,
      });
      return;
    }
    const responseEventResult = (response: any) => this._responseMsgResult(msgId, { response, ...restMsg });
    const responseEventError = (err: any) => this._responseMsgResult(msgId, { err, ...restMsg });
    try {
      // 监听器必须为函数类型并且返回promise对象
      event.emit(restMsg.event, restMsg).then(responseEventResult, responseEventError);
    } catch (e) {
      responseEventError(e);
    }
  }

  private _resolveMsg(msgId: string, { responseMsgId, ...data }: any) {
    const msgPromise = this._getMsgPromiseById(msgId);

    if (!msgPromise) {
      console.warn(`Resolve msgPromise(id: ${msgId}) is not found`);
      return;
    }

    msgPromise.resolve(data);
  }

  private _rejectMsg(msgId: string, reason: any) {
    const msgPromise = this._getMsgPromiseById(msgId);
    if (!msgPromise) {
      console.warn(`Reject msgPromise(id: ${msgId}) is not found`);
      return;
    }

    msgPromise.reject(reason);
  }

  private _getMsgPromiseById(msgId: string) {
    return this.promiseMapping.get(msgId);
  }

  private _removeMsgPromiseById(msgId: string) {
    this.promiseMapping.delete(msgId);
  }

  private _sendMessage(msg: Omit<IMessage, 'msgId'>) {
    this.targetWindow.postMessage(JSON.stringify(msg), '*');
  }

  private _responseMsgResult(msgId: string, message: Omit<IMessage, 'msgId'>) {
    this._sendMessage({
      ...message,
      responseMsgId: msgId,
    });
  }
}
