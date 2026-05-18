const reissueNotificationService = require("../services/reissueNotification.service");

function initReissueEventSubscribers() {
  reissueNotificationService.registerSubscribers();
}

module.exports = { initReissueEventSubscribers };
