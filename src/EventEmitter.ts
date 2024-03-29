import type { EventNames } from 'eventemitter3';
import EventEmitter3 from 'eventemitter3';

export class EventEmitter extends EventEmitter3 {
  public has(name: EventNames<string>): boolean {
    return this.eventNames().includes(name);
  }

  // @ts-ignore
  public emit(event: EventNames<string>, ...args: any[]): Promise<any> {
    const prefix = EventEmitter3.prefixed as string;
    const evt = prefix ? prefix + event : event;
    // @ts-ignore
    const events = this._events;

    if (!events[evt]) {
      return Promise.reject();
    }

    const listeners = events[evt];

    if (listeners.fn) {
      if (listeners.once) {
        this.removeListener(event, listeners.fn, undefined, true);
      }

      return Promise.resolve(listeners.fn.apply(listeners.context, args));
    } else {
      const results = [];
      for (let i = 0; i < listeners.length; i++) {
        if (listeners[i].once) {
          this.removeListener(event, listeners[i].fn, undefined, true);
        }

        results[i] = Promise.resolve(listeners[i].fn.apply(listeners[i].context, args));
      }

      return Promise.all(results);
    }
  }
}
