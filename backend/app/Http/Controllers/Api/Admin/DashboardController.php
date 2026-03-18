<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\News;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * GET /api/admin/dashboard/stats
     * Get summary statistics
     */
    public function stats()
    {
        $stats = [
            'total_revenue'     => (float) Order::where('payment_status', 'paid')->sum('total_amount'),
            'total_orders'      => Order::count(),
            'pending_orders'    => Order::where('status', 'pending')->count(),
            'completed_orders'  => Order::whereIn('status', ['delivered', 'completed'])->count(),
            'incomplete_orders' => Order::whereNotIn('status', ['delivered', 'completed', 'cancelled'])->count(),
            'total_products'    => Product::count(),
            'total_customers'   => User::where('role_id', '!=', 1)->count(),
            'pending_contacts'  => Contact::where('status', 'pending')->count(),
        ];

        // 8 đơn hàng gần nhất kèm thông tin user
        $recentOrders = Order::with('user')
            ->latest()
            ->take(8)
            ->get()
            ->map(function ($order) {
                return [
                    'id'             => $order->id,
                    'code'           => $order->order_code ?? ('#' . str_pad($order->id, 5, '0', STR_PAD_LEFT)),
                    'customer_name'  => $order->user?->fullname ?? $order->shipping_name ?? 'Khách',
                    'customer_email' => $order->user?->email ?? $order->shipping_email ?? '',
                    'total_amount'   => (float) $order->total_amount,
                    'status'         => $order->status,
                    'payment_status' => $order->payment_status,
                    'created_at'     => $order->created_at,
                ];
            });

        $stats['recent_orders'] = $recentOrders;

        return response()->json([
            'status' => 'success',
            'data'   => $stats
        ]);
    }

    /**
     * GET /api/admin/dashboard/revenue
     * Get monthly revenue for the current year
     */
    public function revenue(Request $request)
    {
        $year = $request->get('year', date('Y'));

        $revenue = Order::select(
                DB::raw('MONTH(created_at) as month'),
                DB::raw('SUM(total_amount) as total')
            )
            ->whereYear('created_at', $year)
            ->where('payment_status', 'paid')
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // Fill missing months with 0
        $data = [];
        for ($i = 1; $i <= 12; $i++) {
            $monthData = $revenue->firstWhere('month', $i);
            $data[] = [
                'month' => $i,
                'label' => 'T' . $i,
                'total' => $monthData ? (float) $monthData->total : 0,
            ];
        }

        return response()->json([
            'status' => 'success',
            'data'   => $data
        ]);
    }
}
