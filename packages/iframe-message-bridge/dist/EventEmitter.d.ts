import type { EventNames } from 'eventemitter3';
import EventEmitter3 from 'eventemitter3';
export declare class EventEmitter extends EventEmitter3 {
    has(name: EventNames<string>): boolean;
    emit(event: EventNames<string>, ...args: any[]): Promise<any>;
}
