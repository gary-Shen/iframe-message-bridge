var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { EventEmitter } from './EventEmitter';
const createId = () => Math.random().toString(36).substr(2, 9);
;
const DEFAULT_PREFIX = 'iframe-message-bridge-';
const DEFAULT_TIMEOUT = 20000;
export class Bridge {
    ;
    constructor(targetWindow, options = {}) {
        this._event = new EventEmitter();
        this._options = {
            prefix: DEFAULT_PREFIX,
            timeout: DEFAULT_TIMEOUT,
            targetOrigin: '*',
            transfer: undefined,
        };
        this.promiseMapping = new Map();
        const { prefix = DEFAULT_PREFIX, timeout = DEFAULT_TIMEOUT } = options;
        this.targetWindow = targetWindow;
        this.prefix = prefix;
        this.timeout = timeout;
        this._options = Object.assign(Object.assign({}, this._options), options);
        window.addEventListener('message', this._messageEventHandler.bind(this));
    }
    _messageEventHandler({ data: msg }) {
        this._processMessage(msg);
    }
    post(name, payload) {
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
                console.log('timeout', _name);
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
    on(name, handler) {
        let _name = name;
        let _handler = handler;
        if (typeof _name === 'function') {
            _handler = name;
            _name = '*';
        }
        const nameWithPrefix = `${this.prefix}${_name}`;
        this._event.on(nameWithPrefix, _handler);
    }
    /**
     * 取消监听消息
     * @param name
     * @param handler
     */
    off(name, handler) {
        const nameWithPrefix = `${this.prefix}${name}`;
        this._event.off(nameWithPrefix, handler);
    }
    destroy() {
        window.removeEventListener('message', this._messageEventHandler.bind(this));
        this._event.removeAllListeners();
        this._event = null;
        this.promiseMapping.clear();
    }
    /**
     * 处理从另一window接收到的消息
     * @param message
     * @returns
     */
    _processMessage(message) {
        if (typeof message.name !== 'string' || !message.name.startsWith(this.prefix)) {
            return;
        }
        try {
            const msg = message;
            if (msg._responseMsgId) {
                return this._processResponseMessage(msg);
            }
            if (msg._msgId) {
                return this._processReceiveMessage(msg);
            }
        }
        catch (err) {
            console.error(err);
        }
    }
    /**
     * 消息的最后一环节，处理消息的响应
     * @param msg
     * @returns
     */
    _processResponseMessage(msg) {
        const msgId = msg._responseMsgId;
        const msgPromise = this._getMsgPromiseById(msgId);
        if (!msgPromise) {
            return;
        }
        clearTimeout(msgPromise.timeoutId);
        if (msg._error) {
            this._rejectMsg(msgId, msg);
        }
        else {
            this._resolveMsg(msgId, msg);
        }
        this._removeMsgPromiseById(msgId);
    }
    /**
     * 处理接收到自另一window的消息，可以是一个消息，也可以是一个消息的响应
     * @param msg
     * @returns
     */
    _processReceiveMessage(message) {
        const { _msgId } = message, restMsg = __rest(message, ["_msgId"]);
        if (!this._event.has(restMsg.name)) {
            this._responseMsgResult(_msgId, Object.assign({ _error: 'Unregistered event' }, message));
            return;
        }
        const responseEventResult = (response) => this._responseMsgResult(_msgId, Object.assign(Object.assign({}, restMsg), { payload: response }));
        const responseEventError = (err) => this._responseMsgResult(_msgId, Object.assign({ _error: err }, restMsg));
        try {
            // 监听器必须为函数类型并且返回promise对象
            this._event
                .emit(restMsg.name, restMsg.payload)
                .then(responseEventResult, responseEventError);
        }
        catch (e) {
            responseEventError(e);
        }
    }
    _resolveMsg(msgId, _a) {
        var data = __rest(_a, []);
        const msgPromise = this._getMsgPromiseById(msgId);
        if (!msgPromise) {
            console.warn(`Resolve msgPromise(id: ${msgId}) is not found`);
            return;
        }
        msgPromise.resolve(data.payload);
    }
    _rejectMsg(msgId, reason) {
        const msgPromise = this._getMsgPromiseById(msgId);
        if (!msgPromise) {
            console.warn(`Reject msgPromise(id: ${msgId}) is not found`);
            return;
        }
        msgPromise.reject(reason);
    }
    _getMsgPromiseById(msgId) {
        return this.promiseMapping.get(msgId);
    }
    _removeMsgPromiseById(msgId) {
        this.promiseMapping.delete(msgId);
    }
    _sendMessage(msg) {
        const { targetOrigin, transfer } = this._options;
        this.targetWindow.postMessage(msg, targetOrigin, transfer);
    }
    _responseMsgResult(msgId, message) {
        this._sendMessage(Object.assign(Object.assign({}, message), { _msgId: msgId, _responseMsgId: msgId }));
    }
}
