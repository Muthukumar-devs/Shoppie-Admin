'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Package, ShoppingCart, Ticket, TrendingUp, Clock } from 'lucide-react';
import { StatCard, PageLoader, Badge } from '@/components/ui';
import { getUsers, getProducts, getOrders, getOffers } from '@/lib/api';
import type { Order } from '@/lib/types';

const orderStatusVariant: Record<string, string> = {
  pending: 'warning',
  confirmed: 'info',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger',
};

export default function DashboardPage() {
  const [stats, setStats] = useState({ users: 0, products: 0, orders: 0, offers: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [usersRes, productsRes, ordersRes, offersRes] = await Promise.all([
          getUsers(1, 1),
          getProducts(1),
          getOrders(1),
          getOffers(),
        ]);
        setStats({
          users: usersRes.data.total,
          products: productsRes.data.total,
          orders: ordersRes.data.total,
          offers: offersRes.data.results,
        });
        setRecentOrders((ordersRes.data.data.orders ?? []).slice(0, 5));
      } catch (err) {
        const e = err as { config?: { url?: string }; response?: { data?: unknown } };
        console.error('[Dashboard] 500 url:', e?.config?.url, e?.response?.data);
        setError('Failed to load dashboard data. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Users" value={stats.users} icon={<Users className="h-6 w-6" />} color="bg-indigo-50 text-indigo-600" />
        <StatCard title="Total Products" value={stats.products} icon={<Package className="h-6 w-6" />} color="bg-emerald-50 text-emerald-600" />
        <StatCard title="Total Orders" value={stats.orders} icon={<ShoppingCart className="h-6 w-6" />} color="bg-amber-50 text-amber-600" />
        <StatCard title="Total Offers" value={stats.offers} icon={<Ticket className="h-6 w-6" />} color="bg-rose-50 text-rose-600" />
      </div>

      {/* Recent Orders */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">Recent Orders</h2>
          </div>
          <Link href="/orders" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
            View all →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No orders yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">#{order._id.slice(-8).toUpperCase()}</td>
                    <td className="px-6 py-3 text-slate-700">
                      {typeof order.user === 'object' ? order.user.fullName : '—'}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-800">₹{order.totalAmount.toLocaleString()}</td>
                    <td className="px-6 py-3">
                      <Badge label={order.paymentMethod.toUpperCase()} variant={order.paymentStatus === 'paid' ? 'success' : 'warning'} />
                    </td>
                    <td className="px-6 py-3">
                      <Badge label={order.status} variant={orderStatusVariant[order.status] ?? 'default'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { href: '/products', label: 'Manage Products', icon: <Package className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50' },
          { href: '/orders', label: 'Manage Orders', icon: <ShoppingCart className="h-5 w-5" />, color: 'text-amber-600 bg-amber-50' },
          { href: '/offers', label: 'Manage Offers', icon: <TrendingUp className="h-5 w-5" />, color: 'text-rose-600 bg-rose-50' },
        ].map(({ href, label, icon, color }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>{icon}</div>
            <span className="text-sm font-medium text-slate-700">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
