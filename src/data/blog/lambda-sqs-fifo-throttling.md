---
title: "SQS and Lambda settings that looked right but weren't"
description: "We used reservedConcurrentExecutions: 1 to force serial processing on SQS-triggered Lambdas. Two failures we hit, and how switching to FIFO queues with message group ids fixed it."
pubDate: 2026-09-09
tags: ["aws", "lambda", "sqs", "serverless"]
---

Recently we ran into a series of unfortunate events with some of our SQS + Lambda configurations. They looked innocent and correct but turned out to be wrong. The mistake wasn't obvious and the inner workings are interesting enough that I wanted to share it.

Some context first. Several of our lambdas must process messages one at a time. Either they call a rate-limited API, or they must not run concurrently for correctness. Our way of enforcing this was a standard SQS queue and a Lambda with `reservedConcurrentExecutions: 1`.

> `reservedConcurrentExecutions: 1` means that **only one** instance of your function can run at a time. On top of this it also "reserves" a slot out of your account-wide pool of concurrent executions, meaning when your account is fully saturated it guarantees that this function has a slot and gets to run. So it acts both as a ceiling and a floor. The floor part wasn't obvious to me and we mostly used this setting as a ceiling.

However relying on `reservedConcurrentExecutions: 1` for serial execution has an unwanted side effect: unnecessary throttling. The poller does not know about your function's concurrency limit so when there is a burst of messages the pollers can grab more than the one available slot, and the lambda service rejects the extras with a throttle. This means the message becomes invisible until its visibility timeout expires, which should be at least as long as the lambda's timeout. You can see how this adds up quickly.

> When you attach an SQS queue to a lambda, AWS handles the polling for you. AWS calls this poller the "event source mapping", I'll just call it the poller. It receives messages from the queue, invokes the function with them and deletes them on success (a received message is hidden until it's successfully deleted or its visibility timeout expires).

## Failure 1

This was exactly our first failure: several messages arrive in the queue at the same time, the pollers pick them all and try to invoke the lambda, the first invocation is accepted and the rest are rejected. Here is what's happening step by step:

1. Let's say 3 messages appear (A, B, C). [AWS starts 5 pollers](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html#events-sqs-eventsource) (that's the default, it scales with more messages), 3 of them grab messages and all 3 messages are now hidden.
2. Poller 1 invokes the lambda with message A. It accepts it and runs.
3. Pollers 2 and 3 invoke the lambda with B and C. The lambda service rejects them because of the limit and B and C throttled.
4. The throttled messages stay hidden until the visibility timeout expires.
5. After the timeout message B reappears, a poller picks it, invokes the lambda, lambda accepts it and it runs.
6. C is throttled again, and only runs when the visibility timeout expires (again).

This is a standard behaviour when you have `reservedConcurrentExecutions: 1` and the throttling is expected. [AWS even documents](https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html#events-sqs-eventsource) that reserved concurrency below 5 will throttle SQS messages. However this outcome wasn't ideal and not what we wanted, and there is a much cleaner solution to enforce serial execution.

The fix was to switch these queues to FIFO and control the parallelism with the message group id. The FIFO queue hands out at most one message per group id and releases the next ones only when the current one is deleted. We had two use cases:

1. One queue with a static group id. This gives strict serial execution: the queue will have a single lane with one message in flight. SQS now hands the poller only one message at a time so it doesn't over poll and nothing gets throttled.
2. One queue with a "dynamic" group id. This splits the queue into lanes that run in parallel while each lane stays serial. For example, with a country as a group id, each country's messages are processed one at a time, but the countries run in parallel.

## Failure 2

Even after switching to FIFO, some queues kept `reservedConcurrentExecutions: 1` on top. The team believed it was harmless and would offer extra protection against the third-party rate limits.

This one is more subtle. With a static message group the poller never over polls but throttles still can happen, and they are worse. Turns out there is a small window after an invocation finishes when the lambda service hasn't released the slot yet (still counts as occupied) and if the poller invokes the lambda during this window the message gets throttled the same way. But this time it blocks all the other messages behind it.

Here is how it goes:

1. The poller receives message A, invokes the lambda with A, the lambda finishes and A is deleted.
2. The poller receives message B, invokes the lambda with B (milliseconds later).
3. The lambda slot from A can still appear as occupied (there can be a short delay between lambda finishing and the slot being freed) so the lambda service rejects message B.
4. B stays hidden for its whole visibility timeout.
5. Because it's a single group FIFO queue, SQS will not release the other messages (C, D, E) until B is processed, so one throttle can block the whole queue.

This can get ugly pretty fast. One of our lambdas had 430 throttles in four weeks, with queue age hitting 11.5 hours.

The fix was straightforward, remove the `reservedConcurrentExecutions: 1` from these lambdas. However this left the lambdas with no upper bound at all. Serial execution only depends on the group id. Let's say if someone would later change that group id the lambda could scale aggressively, eating up account quota or hitting third-party limits.

To mitigate this we:

1. Pinned the static group id in unit tests.
2. Set `maxConcurrency: 2` on the poller which caps how many messages the poller can pull (the minimum AWS allows is 2 so it cannot enforce serial execution by itself, but it acts as a safety net on the CDK level as well).
3. Added CloudWatch alarms, one to check the account-wide concurrency saturation and on any queue holding a message for more than 8 hours, so it gives visibility on a blocked queue.

## Takeaways

- Reserved concurrency is checked when the function is invoked (after the message is pulled / hidden).
- The poller doesn't know about the function's available concurrency.
- Below 5 reserved concurrency likely throttles.
- Reserved concurrency on a FIFO consumer doesn't mesh well: one throttle blocks the whole group.
- Tune the FIFO concurrency by picking an appropriate group id.
