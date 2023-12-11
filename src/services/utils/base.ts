import {track} from "@amplitude/analytics-node";

export function trackEvent(label = "", payload: any, userID: string): void {
  track(label, payload, {
    user_id: userID,
  });
}
