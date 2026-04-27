export { sendEmail, type SendEmailInput, type SendResult } from './client';
export {
  getStoreEmailConfig,
  emailSubjects,
  type StoreEmailConfig,
  type EmailLocale,
} from './store-config';
export { render } from '@react-email/components';

// Templates jewelry-v1 (espelham docs/design-system-jewelry-v1/.../Emails.jsx)
export { Welcome, type WelcomeProps } from './templates/welcome';
export {
  OrderConfirmation,
  type OrderConfirmationProps,
  type OrderItem,
} from './templates/order-confirmation';
export { PixGenerated, type PixGeneratedProps } from './templates/pix';
export { BoletoGenerated, type BoletoGeneratedProps } from './templates/boleto';
export {
  ShippingNotification,
  type ShippingNotificationProps,
  type ShippedStop,
  type ShippedStatus,
} from './templates/shipped';
export { TradeApproved, type TradeApprovedProps } from './templates/trade-approved';
export {
  RecoverCart,
  type RecoverCartProps,
  type RecoverCartItem,
} from './templates/recover-cart';
export { DailyDigest, type DailyDigestProps } from './templates/daily-digest';
