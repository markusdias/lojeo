export { sendSlackWebhook, type SlackMessageInput, type SlackSendResult } from './slack';
export { sendDiscordWebhook, type DiscordMessageInput, type DiscordSendResult } from './discord';
export {
  emitMultichannelNotification,
  type EmitMultichannelInput,
  type MultichannelChannelsTried,
  type NotificationConfig,
} from './multichannel';
