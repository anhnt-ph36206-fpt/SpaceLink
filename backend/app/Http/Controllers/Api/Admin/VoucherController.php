<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\VoucherResource;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Validator;

class VoucherController extends Controller
{
    // =========================================================================
    // GET /api/admin/vouchers — Danh sách voucher (filter + paginate)
    // =========================================================================
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Voucher::withCount('usages')->latest();

        if ($request->filled('search')) {
            $kw = $request->search;
            $query->where(function ($q) use ($kw) {
                $q->where('code', 'like', "%{$kw}%")
                  ->orWhere('name', 'like', "%{$kw}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $perPage  = min((int) $request->get('per_page', 15), 100);

        return VoucherResource::collection($query->paginate($perPage));
    }

    // =========================================================================
    // GET /api/admin/vouchers/{id} — Chi tiết voucher
    // =========================================================================
    public function show(string $id): JsonResponse
    {
        $voucher = Voucher::withCount('usages')->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => new VoucherResource($voucher),
        ]);
    }

    // =========================================================================
    // POST /api/admin/vouchers — Tạo voucher mới
    // =========================================================================
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'code'                 => 'required|string|max:50|unique:vouchers,code',
            'name'                 => 'required|string|max:255',
            'description'          => 'nullable|string',
            'discount_type'        => 'required|in:percent,fixed',
            'discount_value'       => 'required|numeric|min:0',
            'max_discount'         => 'nullable|numeric|min:0',
            'min_order_amount'     => 'nullable|numeric|min:0',
            'quantity'             => 'nullable|integer|min:1',
            'usage_limit_per_user' => 'nullable|integer|min:0',
            'start_date'           => 'required|date',
            'end_date'             => 'required|date|after_or_equal:start_date',
            'is_active'            => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $data['code']       = strtoupper(trim($data['code']));
        $data['is_active']  = $data['is_active'] ?? true;
        $data['used_count'] = 0;
        $data['min_order_amount'] = $data['min_order_amount'] ?? 0;

        $voucher = Voucher::create($data);

        return response()->json([
            'status'  => 'success',
            'message' => 'Tạo voucher thành công.',
            'data'    => new VoucherResource($voucher),
        ], 201);
    }

    // =========================================================================
    // PUT /api/admin/vouchers/{id} — Cập nhật voucher
    // =========================================================================
    public function update(Request $request, string $id): JsonResponse
    {
        $voucher = Voucher::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name'                 => 'sometimes|string|max:255',
            'description'          => 'nullable|string',
            'discount_type'        => 'sometimes|in:percent,fixed',
            'discount_value'       => 'sometimes|numeric|min:0',
            'max_discount'         => 'nullable|numeric|min:0',
            'min_order_amount'     => 'sometimes|numeric|min:0',
            'quantity'             => 'nullable|integer|min:1',
            'usage_limit_per_user' => 'sometimes|integer|min:0',
            'start_date'           => 'sometimes|date',
            'end_date'             => 'sometimes|date|after_or_equal:start_date',
            'is_active'            => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $voucher->update($validator->validated());

        return response()->json([
            'status'  => 'success',
            'message' => 'Cập nhật voucher thành công.',
            'data'    => new VoucherResource($voucher),
        ]);
    }

    // =========================================================================
    // DELETE /api/admin/vouchers/{id} — Xóa voucher
    // =========================================================================
    public function destroy(string $id): JsonResponse
    {
        $voucher = Voucher::withCount('usages')->findOrFail($id);

        if ($voucher->usages_count > 0) {
            return response()->json([
                'status'  => 'error',
                'message' => "Voucher \"{$voucher->code}\" đã được sử dụng {$voucher->usages_count} lần, không thể xóa. Hãy vô hiệu hóa thay vì xóa.",
            ], 400);
        }

        $voucher->delete();

        return response()->json([
            'status'  => 'success',
            'message' => "Đã xóa voucher \"{$voucher->code}\" thành công.",
        ]);
    }
}
