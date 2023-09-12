import { EventEmitter } from './EventEmitter';

const createId = () => Math.random().toString(36).substr(2, 9);

export interface MessagePosted {
  name: string;
  payload?: any;
}

export interface IMessage extends MessagePosted {
  _msgId: string;
  _error?: any;
  _responseMsgId?: string;
}

type IHandler = (msg?: IMessage) => void;

export interface IPromiseResult {
  id: string;
  resolve: (payload: any) => void;
  reject: (reason: string) => void;
  timeoutId: number;
}

export class Bridge {
  event: EventEmitter = new EventEmitter();

  prefix: string = 'iframe-message-bridge-';

  targetWindow: Window;

  timeout: number = 20000;

  promiseMapping = new Map<string, IPromiseResult>();

  constructor(targetWindow: Window, prefix?: string) {
    this.targetWindow = targetWindow;

    if (prefix) {
      this.prefix = prefix
    }

    window.addEventListener('message', ({ data: msg }: MessageEvent<IMessage>) => {
      this._processMessage(msg);
    });
  }

  public post(msg: MessagePosted | string) {
    if (!msg) {
      throw new Error('Message is required');
    }

    const name = `${this.prefix}${typeof msg === 'string' ? msg : msg.name}`;

    if (!name) {
      throw new Error('Message name is required');
    }

    console.info('post', msg);

    return new Promise((resolve, reject) => {
      const id = createId();

      this._sendMessage({
        name,
        _msgId: id,
      });

      const timeoutId = setTimeout(() => {
        console.log('timeout', msg);
        this._rejectMsg(id, 'Timeout');
      }, this.timeout);

      this.promiseMapping.set(id, {
        id,
        resolve,
        reject,
        timeoutId,
      });
    });
  }

  public on(name: string | IHandler , handler: IHandler) {
    let _name = name;
    let _handler = handler;

    if (typeof _name === 'function') {
      _handler = name as IHandler;
      _name = '*';
    }

    const nameWithPrefix = `${this.prefix}${_name}`;

    this.event.on(nameWithPrefix, _handler);
  }

  public off(name: string, handler: IHandler) {
    const nameWithPrefix = `${this.prefix}${name}`;
    this.event.off(nameWithPrefix, handler);
  }

  private _processMessage(message: IMessage) {
    if (typeof message.name !== 'string' || !message.name.startsWith(this.prefix)) {
      return;
    }

    try {
      const msg: IMessage = message;
      if (msg._responseMsgId) {
        return this._processResponseMessage(msg);
      }

      if (msg._msgId) {
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
  private _processResponseMessage(msg: IMessage) {
    const msgId = msg._responseMsgId!;
    const msgPromise = this._getMsgPromiseById(msgId);

    if (!msgPromise) {
      return;
    }

    clearTimeout(msgPromise.timeoutId);

    if (msg._error) {
      this._rejectMsg(msgId, msg);
    } else {
      this._resolveMsg(msgId, msg);
    }

    this._removeMsgPromiseById(msgId);
  }

  /**
   * 处理接收到自另一window的消息，可以是一个消息，也可以是一个消息的响应
   * @param msg
   * @returns
   */
  private _processReceiveMessage(message: IMessage) {
    const { _msgId, ...restMsg } = message;

    const event = this.event;
    if (!event.has(restMsg.name)) {
      this._responseMsgResult(_msgId, {
        _error: 'Unregistered event',
        ...message,
      });

      return;
    }

    console.info('restMsg', restMsg)

    const responseEventResult = (response: any) =>
      this._responseMsgResult(_msgId, { payload: response, ...restMsg });
    const responseEventError = (err: any) =>
      this._responseMsgResult(_msgId, { _error: err, ...restMsg });
    try {
      // 监听器必须为函数类型并且返回promise对象
      event
        .emit(restMsg.name, restMsg)
        .then(responseEventResult, responseEventError);
    } catch (e) {
      responseEventError(e);
    }
  }

  private _resolveMsg(msgId: string, { ...data }: IMessage) {
    const msgPromise = this._getMsgPromiseById(msgId);

    if (!msgPromise) {
      console.warn(`Resolve msgPromise(id: ${msgId}) is not found`);
      return;
    }

    msgPromise.resolve(data.payload);
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

  private _sendMessage(msg: IMessage) {
    this.targetWindow.postMessage(msg, '*');
  }

  private _responseMsgResult(msgId: string, message: Omit<IMessage, '_msgId'>) {
    this._sendMessage({
      ...message,
      _responseMsgId: msgId,
    });
  }
}
