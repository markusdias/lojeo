export { sendEmail, type SendEmailInput, type SendResult } from './client';

// Templates jewelry-v1 (espelham docs/design-system-jewelry-v1/.../Emails.jsx)
export { Welcome, type WelcomeProps } from './templates/welcome';
export {
  OrderConfirmation,
  type OrderConfirmationProps,
  type OrderItem,
} from './templates/order-confirmation';
export { PixGenerated, type PixGeneratedProps } from './templates/pix';
export {
  ShippingNotification,
  type ShippingNotificationProps,
  type ShippedStop,
  type ShippedStatus,
} from './templates/shipped';
export { TradeApproved, type TradeApprovedProps } from './templates/trade-approved';
