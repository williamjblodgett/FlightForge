# Hole highlight videos

FlightForge can attach short community videos to a course, event, and hole. The active scorecard shows a video badge on holes with viewable moments.

## Publication workflow

1. A signed-in player records or chooses an MP4, MOV, or WebM clip.
2. The client reads duration and the server enforces a 60-second, 25 MB limit.
3. The server validates the declared MIME type and file signature, records consent, applies rate limiting and idempotency, and stores the object in the private `MEDIA` bucket.
4. The database record starts in `PENDING` moderation status. Only the uploader and platform administrators can retrieve it.
5. An administrator watches the complete clip and records an approval or rejection reason.
6. Only `APPROVED` clips are available to anonymous scorecard viewers.

Uploaders can permanently delete their own video. Each submission, moderation decision, and deletion creates an audit event.

## Security boundary

This implementation provides private object storage, server-side access checks, origin checks, rate limits, extension/MIME/signature validation, file-size and duration limits, consent gates, moderation, and non-sniffing media responses. It does not claim third-party malware scanning or isolated transcoding; those remain required before accepting arbitrary high-volume public uploads.

The moderation label does not independently verify an ace, score, or tournament result shown in a video.
