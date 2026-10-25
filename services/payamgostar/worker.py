from .soap import DeliveryError


class Worker:
    def __init__(self, store, crm, webhook, max_attempts=4, max_reconciliations=4):
        self.store, self.crm, self.webhook = store, crm, webhook
        self.max_attempts, self.max_reconciliations = max_attempts, max_reconciliations

    def tick(self, channel):
        item = self.store.claim(channel)
        if not item:
            return False
        try:
            if item["reconcile"]:
                if channel == "webhook":
                    self.store.finish(item, "needs_review", "webhook_result_unknown")
                else:
                    crm_id = self.crm.reconcile(item)
                    if crm_id:
                        self.store.finish(item, "submitted", crm_id=crm_id)
                    elif item["reconciliations"] >= self.max_reconciliations:
                        self.store.finish(item, "needs_review", "crm_result_unknown")
                    else:
                        self.store.finish(
                            item,
                            "uncertain",
                            "not_found_yet",
                            delay=30 * item["reconciliations"],
                        )
                # No match does NOT prove that a timed-out SaveForm failed to commit.
                # Never issue another SaveForm on this path.
            elif channel == "crm":
                self.store.finish(item, "submitted", crm_id=self.crm.save(item))
            else:
                self.webhook(item["payload"])
                self.store.finish(item, "submitted")
        except DeliveryError as error:
            if item["reconcile"]:
                state = (
                    "needs_review"
                    if error.kind == "permanent"
                    or item["reconciliations"] >= self.max_reconciliations
                    else "uncertain"
                )
            elif error.kind == "retry":
                state = (
                    "retry" if item["attempts"] < self.max_attempts else "needs_review"
                )
            elif error.kind == "permanent":
                state = "failed"
            else:
                state = "uncertain"
            self.store.finish(
                item, state, error.code, delay=min(300, 2 ** item["attempts"])
            )
        except Exception:
            # Unknown exceptions, process death and SQL failures must never become a blind retry.
            self.store.finish(item, "uncertain", "unexpected_delivery_error", delay=30)
        return True
