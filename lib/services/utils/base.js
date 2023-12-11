"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackEvent = void 0;
const analytics_node_1 = require("@amplitude/analytics-node");
function trackEvent(label = "", payload, userID) {
    (0, analytics_node_1.track)(label, payload, {
        user_id: userID,
    });
}
exports.trackEvent = trackEvent;
//# sourceMappingURL=base.js.map