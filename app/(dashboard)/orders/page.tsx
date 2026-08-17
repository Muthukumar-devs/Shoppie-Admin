'use client';

import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { getOrders, updateOrderStatus, confirmCODPayment } from '@/lib/api';
import type { Order } from '@/lib/types';
import { PageLoader, Badge, Modal, Pagination, EmptyState, Select } from '@/components/ui';

const statusVariant: Record<string, string> = {
  pending: 'warning', confirmed: 'info', shipped: 'info', delivered: 'success', cancelled: 'danger',
};
const paymentVariant: Record<string, string> = { paid: 'success', pending: 'warning', failed: 'danger' };

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [codConfirming, setCodConfirming] = useState<string | null>(null);
  const [statusError, setStatusError] = useState('');

  const fetchOrders = async (p = 1) => {
    setLoading(true);
    try {
      const res = await getOrders(p);
      setOrders(res.data.data.orders);
      setPages(res.data.pages);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getOrders(page);
        if (!cancelled) {
          setOrders(res.data.data.orders);
          setPages(res.data.pages);
          setTotal(res.data.total);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [page]);

  const handleStatusChange = async (orderId: string, status: string) => {
    setStatusUpdating(orderId);
    setStatusError('');
    try {
      await updateOrderStatus(orderId, status);
      fetchOrders(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setStatusError(msg ?? 'Failed to update status');
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleCODConfirm = async (orderId: string) => {
    setCodConfirming(orderId);
    setStatusError('');
    try {
      await confirmCODPayment(orderId);
      fetchOrders(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setStatusError(msg ?? 'Failed to confirm payment');
    } finally {
      setCodConfirming(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{total} total orders</p>
      </div>

      {statusError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{statusError}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <PageLoader />
        ) : orders.length === 0 ? (
          <EmptyState message="No orders found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Update Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-mono text-xs text-slate-500">#{o._id.slice(-8).toUpperCase()}</p>
                        <p className="text-xs text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-3 text-slate-700">
                        {typeof o.user === 'object' ? (
                          <div>
                            <p className="font-medium">{o.user.fullName}</p>
                            <p className="text-xs text-slate-400">{o.user.email}</p>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-800">₹{o.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge label={o.paymentMethod.toUpperCase()} variant="default" />
                          <Badge label={o.paymentStatus} variant={paymentVariant[o.paymentStatus] ?? 'default'} />
                          {o.paymentMethod === 'cod' && o.paymentStatus === 'pending' && (
                            <button
                              onClick={() => handleCODConfirm(o._id)}
                              disabled={codConfirming === o._id}
                              className="mt-1 text-xs text-indigo-600 hover:underline disabled:opacity-50"
                            >
                              {codConfirming === o._id ? 'Confirming...' : 'Confirm Payment'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge label={o.status} variant={statusVariant[o.status] ?? 'default'} />
                      </td>
                      <td className="px-6 py-3">
                        <div className="relative">
                          <Select
                            value={o.status}
                            onChange={(e) => handleStatusChange(o._id, e.target.value)}
                            disabled={statusUpdating === o._id || o.status === 'cancelled' || o.status === 'delivered'}
                            className="text-xs py-1.5 pr-7"
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </Select>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end">
                          <button
                            onClick={() => setViewOrder(o)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Order Detail Modal */}
      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title="Order Details" size="lg">
        {viewOrder && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs text-slate-500">Order ID</p>
                <p className="font-mono text-sm font-medium text-slate-800">#{viewOrder._id.slice(-8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Date</p>
                <p className="text-sm text-slate-700">{new Date(viewOrder.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Customer */}
            {typeof viewOrder.user === 'object' && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Customer</p>
                <p className="text-sm font-medium text-slate-800">{viewOrder.user.fullName}</p>
                <p className="text-xs text-slate-500">{viewOrder.user.email}</p>
              </div>
            )}

            {/* Shipping */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Shipping Address</p>
              <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700 space-y-0.5">
                <p className="font-medium">{viewOrder.shippingAddress.fullName}</p>
                <p>{viewOrder.shippingAddress.phone}</p>
                <p>{viewOrder.shippingAddress.addressLine}</p>
                <p>{viewOrder.shippingAddress.city}, {viewOrder.shippingAddress.state} - {viewOrder.shippingAddress.pincode}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Order Items</p>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {viewOrder.orderItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {typeof item.product === 'object' ? item.product.name : 'Product'}
                      </p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity} × ₹{item.price.toLocaleString()}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">₹{(item.quantity * item.price).toLocaleString()}</p>
                  </div>
                ))}
                <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-700">Total</p>
                  <p className="text-base font-bold text-slate-900">₹{viewOrder.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-slate-500">Payment</p>
                <Badge label={`${viewOrder.paymentMethod.toUpperCase()} · ${viewOrder.paymentStatus}`} variant={paymentVariant[viewOrder.paymentStatus] ?? 'default'} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Order Status</p>
                <Badge label={viewOrder.status} variant={statusVariant[viewOrder.status] ?? 'default'} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
