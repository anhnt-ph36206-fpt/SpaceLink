<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\VoucherResource;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VoucherController extends Controller
{
    /**
     * GET /api/client/vouchers/available?order_value={subtotal}
     *
     * Danh sách voucher khả dụng cho khách hàng.
     * Trả thêm is_applicable, estimated_discount, reason.
     */
    public function available(Request $request): JsonResponse
    {
        $user = auth('sanctum')->user();
        $orderValue = (float) $request->input('order_value', 0);

        // Query voucher đang hoạt động và trong thời hạn
        $vouchers = Voucher::where('is_active', true)
            ->where('start_date', '<=', now())
            ->where('end_date', '>=', now())
            ->orderBy('discount_value', 'desc')
            ->get();

        $result = $vouchers->map(function ($voucher) use ($user, $orderValue) {
            $isApplicable = true;
            $reason = null;

            // Check tổng lượt sử dụng
            if ($voucher->quantity !== null && $voucher->used_count >= $voucher->quantity) {
                $isApplicable = false;
                $reason = 'Voucher đã hết lượt sử dụng.';
            }

            // Check lượt dùng của user
            if ($isApplicable && $user && $voucher->usage_limit_per_user !== null) {
                $userUsedCount = VoucherUsage::where('voucher_id', $voucher->id)
                    ->where('user_id', $user->id)->count();
                if ($userUsedCount >= $voucher->usage_limit_per_user) {
                    $isApplicable = false;
                    $reason = 'Bạn đã hết lượt sử dụng voucher này.';
                }
            }

            // Check đơn tối thiểu
            if ($isApplicable && $orderValue > 0 && $orderValue < $voucher->min_order_amount) {
                $isApplicable = false;
                $formatted = number_format($voucher->min_order_amount, 0, ',', '.');
                $reason = "Đơn hàng tối thiểu {$formatted}₫.";
            }

            // Tính estimated discount
            $estimatedDiscount = 0;
            if ($orderValue > 0 && $isApplicable) {
                if ($voucher->discount_type === 'percent') {
                    $estimatedDiscount = $orderValue * $voucher->discount_value / 100;
                    if ($voucher->max_discount && $estimatedDiscount > $voucher->max_discount) {
                        $estimatedDiscount = $voucher->max_discount;
                    }
                } else {
                    $estimatedDiscount = $voucher->discount_value;
                }
            }

            return [
                'id'                   => $voucher->id,
                'code'                 => $voucher->code,
                'name'                 => $voucher->name,
                'description'          => $voucher->description,
                'discount_type'        => $voucher->discount_type,
                'discount_value'       => (float) $voucher->discount_value,
                'max_discount'         => $voucher->max_discount !== null ? (float) $voucher->max_discount : null,
                'min_order_amount'     => (float) $voucher->min_order_amount,
                'quantity'             => $voucher->quantity,
                'used_count'           => $voucher->used_count,
                'remaining_uses'       => $voucher->quantity !== null
                    ? max(0, $voucher->quantity - $voucher->used_count)
                    : null,
                'start_date'           => $voucher->start_date?->format('Y-m-d H:i:s'),
                'end_date'             => $voucher->end_date?->format('Y-m-d H:i:s'),
                'is_applicable'        => $isApplicable,
                'estimated_discount'   => $estimatedDiscount,
                'reason'               => $reason,
            ];
        });

        // Sort: applicable first, then by estimated_discount desc
        $sorted = $result->sortBy([
            ['is_applicable', 'desc'],
            ['estimated_discount', 'desc'],
        ])->values();

        return response()->json([
            'status' => 'success',
            'data'   => $sorted,
        ]);
    }
}
