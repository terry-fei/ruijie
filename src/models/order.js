import mongoose from 'mongoose';

const { Schema } = mongoose;

const OrderSchema = new Schema({
  orderID: {
    type: String,
    unique: true,
  },
  weixinID: String,
  openID: String,
  value: Number,
  count: Number,
  createAt: Date,
  isNotified: {
    type: Boolean,
    default: false,
  },
  chargeFor: String,
});

OrderSchema.path('orderID').index({ unique: true });

export default mongoose.model('Order', OrderSchema);
