"""Independent outbox consumers; neither channel initializes or waits for the other."""
import threading
from .worker import Worker


class DeliveryChannels:
    def __init__(self, store, crm_factory, webhook_factory, max_factory_attempts=4,
                 idle_delay=0.5, retry_delay=2):
        self.store = store
        self.factories = {"crm": crm_factory, "webhook": webhook_factory}
        self.max_factory_attempts = max_factory_attempts
        self.idle_delay, self.retry_delay = idle_delay, retry_delay
        self.stop = threading.Event()
        self.lock = threading.Lock()
        self.states = {channel: "starting" for channel in self.factories}
        self.threads = []

    def set_state(self, channel, state):
        with self.lock:
            self.states[channel] = state

    def snapshot(self):
        with self.lock:
            return dict(self.states)

    def start(self):
        if self.threads:
            raise RuntimeError("Channel consumers already started")
        for channel in self.factories:
            thread = threading.Thread(target=self.run, args=(channel,), daemon=True)
            self.threads.append(thread)
            thread.start()

    def close(self):
        self.stop.set()
        for thread in self.threads:
            thread.join(timeout=60)

    def run(self, channel):
        self.set_state(channel, "initializing")
        client = None
        for attempt in range(self.max_factory_attempts):
            if self.stop.is_set():
                return
            try:
                client = self.factories[channel]()
                break
            except Exception:
                # Includes missing credentials/contract and network errors. No raw logging.
                if attempt + 1 == self.max_factory_attempts:
                    self.set_state(channel, "blocked")
                    return
                if self.stop.wait(self.retry_delay * 2**attempt):
                    return
        worker = Worker(self.store, client if channel == "crm" else None,
                        client if channel == "webhook" else None)
        self.set_state(channel, "running")
        while not self.stop.is_set():
            try:
                worker.tick(channel)
                self.set_state(channel, "running")
            except Exception:
                # Durable row/lease remains recoverable; never stop the other consumer.
                self.set_state(channel, "storage_error")
            self.stop.wait(self.idle_delay)
        self.set_state(channel, "stopped")
