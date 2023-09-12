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
export class Bridge {
    constructor(targetWindow) {
        this.event = new EventEmitter();
        this.timeout = 20000;
        this.promiseMapping = new Map();
        this.targetWindow = targetWindow;
        window.addEventListener('message', ({ data: msg }) => {
            this._processMessage(msg);
        });
    }
    post(msg) {
        if (!msg) {
            throw new Error('Message is required');
        }
        const name = typeof msg === 'string' ? msg : msg.name;
        if (!name) {
            throw new Error('Message name is required');
        }
        return new Promise((resolve, reject) => {
            const id = createId();
            this._sendMessage({
                name,
                _msgId: id,
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
    on(name, handler) {
        let _name = name;
        let _handler = handler;
        if (typeof _name === 'function') {
            _handler = name;
            _name = '*';
        }
        this.event.on(_name, _handler);
    }
    off(name, handler) {
        this.event.off(name, handler);
    }
    _processMessage(message) {
        try {
            const msg = JSON.parse(message);
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
        const msgId = msg.responseMsgId;
        const msgPromise = this._getMsgPromiseById(msgId);
        if (!msgPromise) {
            return;
        }
        clearTimeout(msgPromise.timeoutId);
        if (msg.err) {
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
        const event = this.event;
        if (!event.has(restMsg.name)) {
            this._responseMsgResult(_msgId, Object.assign({ _error: 'Unregistered event' }, message));
            return;
        }
        const responseEventResult = (response) => this._responseMsgResult(_msgId, Object.assign({ payload: response }, restMsg));
        const responseEventError = (err) => this._responseMsgResult(_msgId, Object.assign({ _error: err }, restMsg));
        try {
            // 监听器必须为函数类型并且返回promise对象
            event
                .emit(restMsg.name, restMsg)
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
        msgPromise.resolve(data);
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
        this.targetWindow.postMessage(JSON.stringify(msg), '*');
    }
    _responseMsgResult(msgId, message) {
        // @ts-ignore
        this._sendMessage(Object.assign(Object.assign({}, message), { _responseMsgId: msgId }));
    }
}
