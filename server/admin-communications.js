export const ADMIN_COMMUNICATION_COPY = Object.freeze({
  emailWorkflows: {
    configured: "邮件服务已连接。发送前请确认主题和正文。",
    unconfigured: "邮件服务尚未配置完成，当前不能发送。请检查 EMAIL_PROVIDER、RESEND_API_KEY 和 EMAIL_FROM。",
    loadingDraft: "正在读取邮件模板。",
    updatingTemplate: "正在更新邮件模板。",
    sent: "邮件已发送，并已记录到操作日志。",
    shipmentSaved: "运输信息已更新。",
    shipmentSavedEmailFailed: "运输信息已更新，但邮件未发送：",
  },
  auditLabels: {
    order_email_sent: "发送订单邮件",
  },
});

export function getAdminCommunicationCopy() {
  return ADMIN_COMMUNICATION_COPY;
}
