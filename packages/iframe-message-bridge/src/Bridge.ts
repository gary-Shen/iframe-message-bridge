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

export interface BridgeOptions {
  prefix?: string;
  timeout?: number;
  targetOrigin?: string;
  transfer?: Transferable[];
}

export interface IPromiseResult {
  id: string;
  resolve: (payload: any) => void;
  reject: (reason: string) => void;
  timeoutId: any;
}

const DEFAULT_PREFIX = 'iframe-message-bridge-';
const DEFAULT_TIMEOUT = 20000;

export class Bridge {
  private _event: EventEmitter | null = new EventEmitter();

  private _options: BridgeOptions = {
    prefix: DEFAULT_PREFIX,
    timeout: DEFAULT_TIMEOUT,
    targetOrigin: '*',
    transfer: undefined,
  };

  prefix: string;

  targetWindow: Window;

  timeout: number;

  promiseMapping = new Map<string, IPromiseResult>();

  constructor(targetWindow: Window, options: BridgeOptions = {}) {
    const { prefix = DEFAULT_PREFIX, timeout = DEFAULT_TIMEOUT } = options;

    this.targetWindow = targetWindow;
    this.prefix = prefix;
    this.timeout = timeout;
    this._options = {
      ...this._options,
      ...options,
    };

    window.addEventListener('message', this._messageEventHandler.bind(this));
  }

  private _messageEventHandler({ data: msg }: MessageEvent<IMessage>) {
    this._processMessage(msg);
  }

  public post(name: string, payload?: any) {
    if (!name) {
      throw new Error('Name is required');
    }

    if (typeof name !== 'string') {
      throw new Error('Name must be a string');
    }

    const _name = `${this.prefix}${name}`;

    return new Promise((resolve, reject) => {
      const id = createId();

      this._sendMessage({
        name: _name,
        _msgId: id,
        payload,
      });

      const timeoutId = setTimeout(() => {
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

  /**
   * 监听消息
   * @param name
   * @param handler
   */
  public on(name: string | IHandler, handler: IHandler) {
    let _name = name;
    let _handler = handler;

    if (typeof _name === 'function') {
      _handler = name as IHandler;
      _name = '*';
    }

    const nameWithPrefix = `${this.prefix}${_name}`;

    this._event!.on(nameWithPrefix, _handler);
  }

  /**
   * 取消监听消息
   * @param name
   * @param handler
   */
  public off(name: string, handler: IHandler) {
    const nameWithPrefix = `${this.prefix}${name}`;
    this._event!.off(nameWithPrefix, handler);
  }

  public destroy() {
    window.removeEventListener('message', this._messageEventHandler.bind(this));
    this._event!.removeAllListeners();
    this._event = null;
    this.promiseMapping.clear();
  }

  /**
   * 处理从另一window接收到的消息
   * @param message
   * @returns
   */
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

    if (!this._event!.has(restMsg.name)) {
      this._responseMsgResult(_msgId, {
        _error: 'Unregistered event',
        ...message,
      });

      return;
    }

    const responseEventResult = (response: any) => this._responseMsgResult(_msgId, { ...restMsg, payload: response });
    const responseEventError = (err: any) => this._responseMsgResult(_msgId, { _error: err, ...restMsg });
    try {
      // 监听器必须为函数类型并且返回promise对象
      this._event!.emit(restMsg.name, restMsg.payload).then(responseEventResult, responseEventError);
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
    const { targetOrigin, transfer } = this._options;
    this.targetWindow.postMessage(msg, targetOrigin!, transfer);
  }

  private _responseMsgResult(msgId: string, message: Omit<IMessage, '_msgId'>) {
    this._sendMessage({
      ...message,
      _msgId: msgId,
      _responseMsgId: msgId,
    });
  }
}
