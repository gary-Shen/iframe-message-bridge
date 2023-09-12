import { EventEmitter } from './EventEmitter';
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
export declare class Bridge {
    event: EventEmitter;
    targetWindow: Window;
    timeout: number;
    promiseMapping: Map<string, IPromiseResult>;
    constructor(targetWindow: Window);
    post(msg: MessagePosted | string): Promise<unknown>;
    on(name: string | IHandler, handler: IHandler): void;
    off(name: string, handler: IHandler): void;
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
