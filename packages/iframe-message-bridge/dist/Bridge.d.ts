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
    timeoutId: number;
}
export declare class Bridge {
    private _event;
    private _options;
    prefix: string;
    targetWindow: Window;
    timeout: number;
    promiseMapping: Map<string, IPromiseResult>;
    constructor(targetWindow: Window, options?: BridgeOptions);
    private _messageEventHandler;
    post(name: string, payload?: any): Promise<unknown>;
    /**
     * 监听消息
     * @param name
     * @param handler
     */
    on(name: string | IHandler, handler: IHandler): void;
    /**
     * 取消监听消息
     * @param name
     * @param handler
     */
    off(name: string, handler: IHandler): void;
    destroy(): void;
    /**
     * 处理从另一window接收到的消息
     * @param message
     * @returns
     */
    private _processMessage;
    /**
     * 消息的最后一环节，处理消息的响应
     * @param msg
     * @returns
     */
    private _processResponseMessage;
    /**
     * 处理接收到自另一window的消息，可以是一个消息，也可以是一个消息的响应
     * @param msg
     * @returns
     */
    private _processReceiveMessage;
    private _resolveMsg;
    private _rejectMsg;
    private _getMsgPromiseById;
    private _removeMsgPromiseById;
    private _sendMessage;
    private _responseMsgResult;
}
export {};
