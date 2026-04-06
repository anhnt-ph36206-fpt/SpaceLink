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
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * GET /api/admin/dashboard/stats
     * Get summary statistics — mở rộng thêm today + payment sync
     */
    public function stats()
    {
        $today = Carbon::today();

        $stats = [
            'total_revenue'     => (float) Order::where('payment_status', 'paid')->sum('total_amount'),
            'total_orders'      => Order::count(),
            'pending_orders'    => Order::where('status', 'pending')->count(),
            'completed_orders'  => Order::whereIn('status', ['delivered', 'completed'])->count(),
            'incomplete_orders' => Order::whereNotIn('status', ['delivered', 'completed', 'cancelled'])->count(),
            'total_products'    => Product::count(),
            'total_customers'   => User::where('role_id', '!=', 1)->count(),
            'pending_contacts'  => Contact::where('status', 'pending')->count(),

            // ── Thống kê hôm nay ──
            'today_revenue'     => (float) Order::where('payment_status', 'paid')
                                        ->whereDate('created_at', $today)
                                        ->sum('total_amount'),
            'today_orders'      => Order::whereDate('created_at', $today)->count(),

            // ── Đồng bộ thanh toán: cảnh báo bất thường ──
            'payment_sync' => [
                // Đơn đã giao/hoàn thành nhưng chưa thanh toán → bất thường
                'delivered_unpaid' => Order::whereIn('status', ['delivered', 'completed'])
                    ->where('payment_status', '!=', 'paid')
                    ->count(),
                // COD đã giao & đã paid
                'cod_delivered_paid' => Order::where('payment_method', 'cod')
                    ->whereIn('status', ['delivered', 'completed'])
                    ->where('payment_status', 'paid')
                    ->count(),
                // VNPAY đã paid
                'vnpay_paid' => Order::where('payment_method', 'vnpay')
                    ->where('payment_status', 'paid')
                    ->count(),
            ],
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
                    'payment_method' => $order->payment_method,
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
     * GET /api/admin/dashboard/revenue?mode=monthly|daily
     * Doanh thu & số đơn theo tháng hoặc theo ngày (30 ngày gần nhất)
     */
    public function revenue(Request $request)
    {
        $mode = $request->get('mode', 'monthly'); // daily | monthly
        $year = date('Y');

        if ($mode === 'daily') {
            // 30 ngày gần nhất
            $from = Carbon::today()->subDays(29);

            $revenue = Order::select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw('SUM(CASE WHEN payment_status = \'paid\' THEN total_amount ELSE 0 END) as total'),
                    DB::raw('COUNT(*) as orders_count')
                )
                ->where('created_at', '>=', $from)
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            // Fill missing days
            $data = [];
            for ($i = 0; $i < 30; $i++) {
                $d = $from->copy()->addDays($i);
                $dateStr = $d->format('Y-m-d');
                $dayData = $revenue->firstWhere('date', $dateStr);
                $data[] = [
                    'date'         => $dateStr,
                    'label'        => $d->format('d/m'),
                    'total'        => $dayData ? (float) $dayData->total : 0,
                    'orders_count' => $dayData ? (int) $dayData->orders_count : 0,
                ];
            }
        } else {
            // Theo tháng (năm hiện tại)
            $revenue = Order::select(
                    DB::raw('MONTH(created_at) as month'),
                    DB::raw('SUM(CASE WHEN payment_status = \'paid\' THEN total_amount ELSE 0 END) as total'),
                    DB::raw('COUNT(*) as orders_count')
                )
                ->whereYear('created_at', $year)
                ->groupBy('month')
                ->orderBy('month')
                ->get();

            $data = [];
            for ($i = 1; $i <= 12; $i++) {
                $monthData = $revenue->firstWhere('month', $i);
                $data[] = [
                    'month'        => $i,
                    'label'        => 'T' . $i,
                    'total'        => $monthData ? (float) $monthData->total : 0,
                    'orders_count' => $monthData ? (int) $monthData->orders_count : 0,
                ];
            }
        }

        return response()->json([
            'status' => 'success',
            'data'   => $data,
            'mode'   => $mode,
        ]);
    }

    /**
     * GET /api/admin/dashboard/sales-by-category
     * Phân tích doanh thu theo danh mục sản phẩm
     */
    public function salesByCategory()
    {
        $rows = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->where('orders.payment_status', 'paid')
            ->whereNotIn('orders.status', ['cancelled', 'returned'])
            ->select(
                'categories.id as category_id',
                'categories.name as category_name',
                DB::raw('SUM(order_items.total) as total_revenue'),
                DB::raw('SUM(order_items.quantity) as total_quantity'),
                DB::raw('COUNT(DISTINCT orders.id) as order_count')
            )
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('total_revenue')
            ->get()
            ->map(function ($row) {
                return [
                    'category_id'    => $row->category_id,
                    'category_name'  => $row->category_name,
                    'total_revenue'  => (float) $row->total_revenue,
                    'total_quantity' => (int) $row->total_quantity,
                    'order_count'    => (int) $row->order_count,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data'   => $rows,
        ]);
    }

    /**
     * GET /api/admin/dashboard/top-products
     * Top 5 sản phẩm bán chạy nhất trong tuần
     */
    public function topProducts()
    {
        $weekStart = Carbon::now()->startOfWeek(Carbon::MONDAY);
        $weekEnd   = Carbon::now()->endOfWeek(Carbon::SUNDAY);

        $rows = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('orders.payment_status', 'paid')
            ->whereNotIn('orders.status', ['cancelled', 'returned'])
            ->whereBetween('orders.created_at', [$weekStart, $weekEnd])
            ->select(
                'products.id as product_id',
                'products.name as product_name',
                'products.slug as product_slug',
                DB::raw("(SELECT pi2.image_path FROM product_images pi2 WHERE pi2.product_id = products.id ORDER BY pi2.is_primary DESC, pi2.id ASC LIMIT 1) as product_image"),
                'categories.name as category_name',
                DB::raw('SUM(order_items.quantity) as total_quantity_sold'),
                DB::raw('SUM(order_items.total) as total_revenue')
            )
            ->groupBy('products.id', 'products.name', 'products.slug', 'categories.name')
            ->orderByDesc('total_quantity_sold')
            ->limit(5)
            ->get()
            ->map(function ($row) {
                $image = $row->product_image;
                if ($image && !str_starts_with($image, 'http')) {
                    $image = asset('storage/' . $image);
                }
                return [
                    'product_id'          => $row->product_id,
                    'product_name'        => $row->product_name,
                    'product_slug'        => $row->product_slug,
                    'product_image'       => $image,
                    'category_name'       => $row->category_name ?? '—',
                    'total_quantity_sold'  => (int) $row->total_quantity_sold,
                    'total_revenue'       => (float) $row->total_revenue,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data'   => $rows,
            'week'   => [
                'from' => $weekStart->format('d/m/Y'),
                'to'   => $weekEnd->format('d/m/Y'),
            ],
        ]);
    }
}
