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
    // ─── Helper: tính khoảng thời gian từ period param ───────────────────────
    private function getPeriodRange(string $period): array
    {
        $now = Carbon::now();
        switch ($period) {
            case 'today':
                return [Carbon::today(), Carbon::today()->endOfDay()];
            case 'week':
                return [$now->copy()->startOfWeek(Carbon::MONDAY), $now->copy()->endOfWeek(Carbon::SUNDAY)];
            case 'year':
                return [$now->copy()->startOfYear(), $now->copy()->endOfYear()];
            case 'month':
            default:
                return [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()];
        }
    }

    // Kỳ trước của period (để so sánh %)
    private function getPreviousPeriodRange(string $period): array
    {
        $now = Carbon::now();
        switch ($period) {
            case 'today':
                $prev = $now->copy()->subDay();
                return [$prev->copy()->startOfDay(), $prev->copy()->endOfDay()];
            case 'week':
                $prev = $now->copy()->subWeek();
                return [$prev->copy()->startOfWeek(Carbon::MONDAY), $prev->copy()->endOfWeek(Carbon::SUNDAY)];
            case 'year':
                $prev = $now->copy()->subYear();
                return [$prev->copy()->startOfYear(), $prev->copy()->endOfYear()];
            case 'month':
            default:
                $prev = $now->copy()->subMonth();
                return [$prev->copy()->startOfMonth(), $prev->copy()->endOfMonth()];
        }
    }

    private function calcChange(float $current, float $previous): float|null
    {
        if ($previous == 0) return $current > 0 ? 100.0 : null;
        return round((($current - $previous) / $previous) * 100, 1);
    }

    /**
     * GET /api/admin/dashboard/stats?period=today|week|month|year
     */
    public function stats(Request $request)
    {
        $period = $request->get('period', 'month');
        [$from, $to] = $this->getPeriodRange($period);
        [$prevFrom, $prevTo] = $this->getPreviousPeriodRange($period);

        $today = Carbon::today();

        // ── Kỳ hiện tại ──
        $revenue     = (float) Order::where('payment_status', 'paid')->whereBetween('created_at', [$from, $to])->sum('total_amount');
        $orders      = Order::whereBetween('created_at', [$from, $to])->count();
        $newCustomers = User::where('role_id', '!=', 1)->whereBetween('created_at', [$from, $to])->count();
        $completedOrders = Order::whereIn('status', ['delivered', 'completed'])->whereBetween('created_at', [$from, $to])->count();

        // ── Kỳ trước ──
        $prevRevenue   = (float) Order::where('payment_status', 'paid')->whereBetween('created_at', [$prevFrom, $prevTo])->sum('total_amount');
        $prevOrders    = Order::whereBetween('created_at', [$prevFrom, $prevTo])->count();
        $prevCustomers = User::where('role_id', '!=', 1)->whereBetween('created_at', [$prevFrom, $prevTo])->count();

        $stats = [
            // ── All-time totals ──
            'total_revenue'     => (float) Order::where('payment_status', 'paid')->sum('total_amount'),
            'total_orders'      => Order::count(),
            'total_products'    => Product::count(),
            'total_customers'   => User::where('role_id', '!=', 1)->count(),
            'pending_orders'    => Order::where('status', 'pending')->count(),
            'completed_orders'  => Order::whereIn('status', ['delivered', 'completed'])->count(),
            'incomplete_orders' => Order::whereNotIn('status', ['delivered', 'completed', 'cancelled', 'returned'])->count(),
            'pending_contacts'  => Contact::where('status', 'pending')->count(),
            'pending_complaints'=> \App\Models\OrderComplaint::where('status', 'pending')->count(),
            'pending_returns'   => \App\Models\ProductReturn::where('status', 'pending')->count(),
            'total_discount'    => (float) Order::where('payment_status', 'paid')->sum('voucher_discount'),

            // ── Today ──
            'today_revenue' => (float) Order::where('payment_status', 'paid')->whereDate('created_at', $today)->sum('total_amount'),
            'today_orders'  => Order::whereDate('created_at', $today)->count(),

            // ── Period KPIs ──
            'period'         => $period,
            'period_from'    => $from->toDateString(),
            'period_to'      => $to->toDateString(),
            'period_revenue' => $revenue,
            'period_orders'  => $orders,
            'period_new_customers' => $newCustomers,
            'period_completed_orders' => $completedOrders,

            // ── % thay đổi so kỳ trước ──
            'revenue_change'   => $this->calcChange($revenue, $prevRevenue),
            'orders_change'    => $this->calcChange($orders, $prevOrders),
            'customers_change' => $this->calcChange($newCustomers, $prevCustomers),

            // ── Payment sync ──
            'payment_sync' => [
                'delivered_unpaid'   => Order::whereIn('status', ['delivered', 'completed'])->where('payment_status', '!=', 'paid')->count(),
                'cod_delivered_paid' => Order::where('payment_method', 'cod')->whereIn('status', ['delivered', 'completed'])->where('payment_status', 'paid')->count(),
                'vnpay_paid'         => Order::where('payment_method', 'vnpay')->where('payment_status', 'paid')->count(),
            ],
        ];

        // ── 8 đơn hàng gần nhất ──
        $recentOrders = Order::with('user')
            ->latest()
            ->take(8)
            ->get()
            ->map(fn($order) => [
                'id'             => $order->id,
                'code'           => $order->order_code ?? ('#' . str_pad($order->id, 5, '0', STR_PAD_LEFT)),
                'customer_name'  => $order->user?->fullname ?? $order->shipping_name ?? 'Khách',
                'customer_email' => $order->user?->email ?? $order->shipping_email ?? '',
                'total_amount'   => (float) $order->total_amount,
                'status'         => $order->status,
                'payment_status' => $order->payment_status,
                'payment_method' => $order->payment_method,
                'created_at'     => $order->created_at,
            ]);

        $stats['recent_orders'] = $recentOrders;

        // ── Top 5 Vouchers ──
        $stats['top_vouchers'] = \App\Models\Voucher::where('used_count', '>', 0)
            ->orderByDesc('used_count')
            ->take(5)
            ->get(['id', 'code', 'name', 'discount_type', 'discount_value', 'used_count']);

        return response()->json(['status' => 'success', 'data' => $stats]);
    }

    /**
     * GET /api/admin/dashboard/revenue?mode=monthly|daily&year=2026&period=week|month|year
     */
    public function revenue(Request $request)
    {
        $mode   = $request->get('mode', 'monthly');
        $year   = (int) $request->get('year', date('Y'));
        $period = $request->get('period', 'month'); // dùng khi mode=daily

        if ($mode === 'daily') {
            // Xác định khoảng ngày theo period
            switch ($period) {
                case 'week':
                    $from = Carbon::now()->startOfWeek(Carbon::MONDAY);
                    $days = 7;
                    break;
                case 'year':
                    $from = Carbon::createFromDate($year, 1, 1)->startOfDay();
                    $days = Carbon::createFromDate($year, 1, 1)->isLeapYear() ? 366 : 365;
                    break;
                case 'month':
                default:
                    $from = Carbon::today()->subDays(29);
                    $days = 30;
            }

            $revenue = Order::select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw('SUM(CASE WHEN payment_status = \'paid\' THEN total_amount ELSE 0 END) as total'),
                    DB::raw('COUNT(*) as orders_count')
                )
                ->where('created_at', '>=', $from)
                ->groupBy('date')
                ->orderBy('date')
                ->get();

            $data = [];
            for ($i = 0; $i < $days; $i++) {
                $d       = $from->copy()->addDays($i);
                $dateStr = $d->format('Y-m-d');
                $row     = $revenue->firstWhere('date', $dateStr);
                $data[]  = [
                    'date'         => $dateStr,
                    'label'        => $d->format('d/m'),
                    'total'        => $row ? (float) $row->total : 0,
                    'orders_count' => $row ? (int) $row->orders_count : 0,
                ];
            }
        } else {
            // Theo tháng của năm
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
                $row    = $revenue->firstWhere('month', $i);
                $data[] = [
                    'month'        => $i,
                    'label'        => 'T' . $i,
                    'total'        => $row ? (float) $row->total : 0,
                    'orders_count' => $row ? (int) $row->orders_count : 0,
                ];
            }
        }

        return response()->json(['status' => 'success', 'data' => $data, 'mode' => $mode, 'year' => $year]);
    }

    /**
     * GET /api/admin/dashboard/sales-by-category?period=month|year|all
     */
    public function salesByCategory(Request $request)
    {
        $period = $request->get('period', 'all');

        $query = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->where('orders.payment_status', 'paid')
            ->whereNotIn('orders.status', ['cancelled', 'returned']);

        if ($period !== 'all') {
            [$from, $to] = $this->getPeriodRange($period);
            $query->whereBetween('orders.created_at', [$from, $to]);
        }

        $rows = $query->select(
                'categories.id as category_id',
                'categories.name as category_name',
                DB::raw('SUM(order_items.total) as total_revenue'),
                DB::raw('SUM(order_items.quantity) as total_quantity'),
                DB::raw('COUNT(DISTINCT orders.id) as order_count')
            )
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('total_revenue')
            ->get()
            ->map(fn($row) => [
                'category_id'    => $row->category_id,
                'category_name'  => $row->category_name,
                'total_revenue'  => (float) $row->total_revenue,
                'total_quantity' => (int) $row->total_quantity,
                'order_count'    => (int) $row->order_count,
            ]);

        return response()->json(['status' => 'success', 'data' => $rows]);
    }

    /**
     * GET /api/admin/dashboard/top-products?period=week|month|year|all&sort=quantity|revenue&limit=10
     */
    public function topProducts(Request $request)
    {
        $period = $request->get('period', 'week');
        $sort   = $request->get('sort', 'quantity');   // quantity | revenue
        $limit  = min((int) $request->get('limit', 10), 20);

        $query = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('orders.payment_status', 'paid')
            ->whereNotIn('orders.status', ['cancelled', 'returned']);

        $weekLabel = ['from' => '', 'to' => ''];

        if ($period === 'week') {
            $weekStart = Carbon::now()->startOfWeek(Carbon::MONDAY);
            $weekEnd   = Carbon::now()->endOfWeek(Carbon::SUNDAY);
            $query->whereBetween('orders.created_at', [$weekStart, $weekEnd]);
            $weekLabel = ['from' => $weekStart->format('d/m/Y'), 'to' => $weekEnd->format('d/m/Y')];
        } elseif ($period !== 'all') {
            [$from, $to] = $this->getPeriodRange($period);
            $query->whereBetween('orders.created_at', [$from, $to]);
        }

        $orderByCol = $sort === 'revenue' ? 'total_revenue' : 'total_quantity_sold';

        $rows = $query->select(
                'products.id as product_id',
                'products.name as product_name',
                'products.slug as product_slug',
                DB::raw("(SELECT pi2.image_path FROM product_images pi2 WHERE pi2.product_id = products.id ORDER BY pi2.is_primary DESC, pi2.id ASC LIMIT 1) as product_image"),
                'categories.name as category_name',
                DB::raw('SUM(order_items.quantity) as total_quantity_sold'),
                DB::raw('SUM(order_items.total) as total_revenue')
            )
            ->groupBy('products.id', 'products.name', 'products.slug', 'categories.name')
            ->orderByDesc($orderByCol)
            ->limit($limit)
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
                    'total_quantity_sold' => (int) $row->total_quantity_sold,
                    'total_revenue'       => (float) $row->total_revenue,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data'   => $rows,
            'period' => $period,
            'sort'   => $sort,
            'week'   => $weekLabel,
        ]);
    }

    /**
     * GET /api/admin/dashboard/orders-stats?period=today|week|month|year
     */
    public function ordersStats(Request $request)
    {
        $period = $request->get('period', 'month');
        [$from, $to] = $this->getPeriodRange($period);

        // ── Breakdown theo trạng thái ──
        $statusRows = Order::select('status', DB::raw('COUNT(*) as cnt'))
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $statuses   = ['pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled', 'returned'];
        $breakdown  = [];
        $totalInPeriod = 0;
        foreach ($statuses as $s) {
            $cnt = isset($statusRows[$s]) ? (int) $statusRows[$s]->cnt : 0;
            $breakdown[$s] = $cnt;
            $totalInPeriod += $cnt;
        }

        // ── Trend đơn theo ngày/tháng ──
        if (in_array($period, ['today', 'week'])) {
            // theo giờ hoặc ngày
            $trend = Order::select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw('COUNT(*) as count')
                )
                ->whereBetween('created_at', [$from, $to])
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->map(fn($r) => [
                    'label' => Carbon::parse($r->date)->format('d/m'),
                    'count' => (int) $r->count,
                ]);
        } else {
            // theo ngày trong tháng / theo tháng trong năm
            $isYear = $period === 'year';
            if ($isYear) {
                $trend = Order::select(
                        DB::raw('MONTH(created_at) as month'),
                        DB::raw('COUNT(*) as count')
                    )
                    ->whereBetween('created_at', [$from, $to])
                    ->groupBy('month')
                    ->orderBy('month')
                    ->get()
                    ->map(fn($r) => ['label' => 'T' . $r->month, 'count' => (int) $r->count]);
            } else {
                $dayRows = Order::select(
                        DB::raw('DATE(created_at) as date'),
                        DB::raw('COUNT(*) as count')
                    )
                    ->whereBetween('created_at', [$from, $to])
                    ->groupBy('date')
                    ->orderBy('date')
                    ->get()
                    ->keyBy('date');

                $trend = [];
                $cur = $from->copy();
                while ($cur <= $to) {
                    $d = $cur->format('Y-m-d');
                    $trend[] = [
                        'label' => $cur->format('d/m'),
                        'count' => isset($dayRows[$d]) ? (int) $dayRows[$d]->count : 0,
                    ];
                    $cur->addDay();
                }
            }
        }

        $completedCnt  = ($breakdown['delivered'] ?? 0) + ($breakdown['completed'] ?? 0);
        $cancelledCnt  = $breakdown['cancelled'] ?? 0;

        return response()->json([
            'status' => 'success',
            'data'   => [
                'period'           => $period,
                'total'            => $totalInPeriod,
                'breakdown'        => $breakdown,
                'trend'            => $trend,
                'completion_rate'  => $totalInPeriod > 0 ? round(($completedCnt / $totalInPeriod) * 100, 1) : 0,
                'cancellation_rate'=> $totalInPeriod > 0 ? round(($cancelledCnt / $totalInPeriod) * 100, 1) : 0,
            ],
        ]);
    }

    /**
     * GET /api/admin/dashboard/customers-stats?period=today|week|month|year
     */
    public function customersStats(Request $request)
    {
        $period = $request->get('period', 'month');
        [$from, $to] = $this->getPeriodRange($period);

        // Khách mới trong kỳ
        $newCustomers = User::where('role_id', '!=', 1)
            ->whereBetween('created_at', [$from, $to])
            ->count();

        // Khách active (có đơn trong kỳ)
        $activeCustomers = Order::whereBetween('created_at', [$from, $to])
            ->whereNotNull('user_id')
            ->distinct('user_id')
            ->count('user_id');

        // Trend khách mới
        $isYear = $period === 'year';
        if ($isYear) {
            $trendRows = User::where('role_id', '!=', 1)
                ->whereBetween('created_at', [$from, $to])
                ->select(DB::raw('MONTH(created_at) as month'), DB::raw('COUNT(*) as cnt'))
                ->groupBy('month')
                ->orderBy('month')
                ->get()
                ->keyBy('month');

            $trend = [];
            for ($m = 1; $m <= 12; $m++) {
                $trend[] = [
                    'label' => 'T' . $m,
                    'new'   => isset($trendRows[$m]) ? (int) $trendRows[$m]->cnt : 0,
                ];
            }
        } else {
            $trendRows = User::where('role_id', '!=', 1)
                ->whereBetween('created_at', [$from, $to])
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as cnt'))
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->keyBy('date');

            $trend = [];
            $cur = $from->copy();
            while ($cur <= $to) {
                $d = $cur->format('Y-m-d');
                $trend[] = [
                    'label' => $cur->format('d/m'),
                    'new'   => isset($trendRows[$d]) ? (int) $trendRows[$d]->cnt : 0,
                ];
                $cur->addDay();
            }

            // Không muốn quá nhiều điểm — nếu hơn 60 ngày thì group by tuần
            if (count($trend) > 60) {
                $grouped = [];
                foreach (array_chunk($trend, 7) as $chunk) {
                    $grouped[] = [
                        'label' => $chunk[0]['label'],
                        'new'   => array_sum(array_column($chunk, 'new')),
                    ];
                }
                $trend = $grouped;
            }
        }

        // Top 10 khách hàng chi tiêu nhiều nhất (all-time)
        $topCustomers = DB::table('orders')
            ->join('users', 'orders.user_id', '=', 'users.id')
            ->where('orders.payment_status', 'paid')
            ->whereNotIn('orders.status', ['cancelled', 'returned'])
            ->whereNotNull('orders.user_id')
            ->select(
                'users.id',
                'users.fullname as name',
                'users.email',
                'users.avatar',
                DB::raw('COUNT(orders.id) as order_count'),
                DB::raw('SUM(orders.total_amount) as total_spent')
            )
            ->groupBy('users.id', 'users.fullname', 'users.email', 'users.avatar')
            ->orderByDesc('total_spent')
            ->limit(10)
            ->get()
            ->map(function ($r) {
                $avatar = $r->avatar;
                if ($avatar && !str_starts_with($avatar, 'http')) {
                    $avatar = request()->getSchemeAndHttpHost() . $avatar;
                }
                return [
                    'id'          => $r->id,
                    'name'        => $r->name ?? 'Khách',
                    'email'       => $r->email,
                    'avatar'      => $avatar,
                    'order_count' => (int) $r->order_count,
                    'total_spent' => (float) $r->total_spent,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data'   => [
                'period'           => $period,
                'new_customers'    => $newCustomers,
                'active_customers' => $activeCustomers,
                'trend'            => $trend,
                'top_customers'    => $topCustomers,
            ],
        ]);
    }

    /**
     * GET /api/admin/dashboard/low-stock
     */
    public function lowStock(Request $request)
    {
        $limit = min((int) $request->get('limit', 10), 50);

        $products = Product::where('quantity', '<', 10)
            ->where('is_active', true)
            ->orderBy('quantity', 'asc')
            ->limit($limit)
            ->get()
            ->map(function ($p) {
                $image = DB::table('product_images')
                    ->where('product_id', $p->id)
                    ->orderByDesc('is_primary')
                    ->orderBy('id')
                    ->value('image_path');

                if ($image && !str_starts_with($image, 'http')) {
                    $image = asset('storage/' . $image);
                }

                return [
                    'id'       => $p->id,
                    'name'     => $p->name,
                    'slug'     => $p->slug,
                    'quantity' => $p->quantity,
                    'image'    => $image,
                ];
            });

        return response()->json(['status' => 'success', 'data' => $products]);
    }
}
